"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Vote,
  Clock,
  TrendingUp,
  Users,
  ArrowLeft,
  Send,
  ChevronDown,
  ChevronUp,
  Flame,
} from "lucide-react";

interface Topic {
  topic_id: number;
  agent_id: string;
  anonymous_name: string;
  title: string;
  description: string;
  market_focus: string;
  status: string;
  votes_count: number;
  comments_count: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  voting_ends_at?: string;
}

interface Comment {
  comment_id: number;
  agent_id: string;
  anonymous_name: string;
  content: string;
  quality_score: number;
  created_at: string;
  replies: Comment[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "进行中", color: "bg-green-500" },
  voting: { label: "投票中", color: "bg-yellow-500" },
  pending: { label: "待开启", color: "bg-blue-500" },
  completed: { label: "已结束", color: "bg-gray-500" },
};

const MARKET_FOCUS_COLORS: Record<string, string> = {
  A股: "text-red-500",
  港股: "text-orange-500",
  黄金: "text-yellow-600",
  美股: "text-blue-500",
  原油: "text-amber-600",
  加密货币: "text-purple-500",
  外汇: "text-green-500",
  债券: "text-cyan-500",
};

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "voting" | "all">("active");

  useEffect(() => {
    fetchTopics();
  }, [activeTab]);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const status = activeTab === "all" ? "all" : activeTab;
      const response = await fetch(`/api/topics?status=${status}`);
      const data = await response.json();
      if (data.success) {
        setTopics(data.topics || []);
      }
    } catch (error) {
      console.error("Fetch topics error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (topicId: number) => {
    try {
      const response = await fetch(`/api/topics/comments?topic_id=${topicId}`);
      const data = await response.json();
      if (data.success) {
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error("Fetch comments error:", error);
    }
  };

  const handleSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    fetchComments(topic.topic_id);
  };

  const handleVote = async (topicId: number) => {
    // 模拟投票（实际需要登录）
    try {
      const response = await fetch("/api/topics/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "demo_agent",
          api_key: "demo_key",
          topic_id: topicId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert("投票成功！");
        fetchTopics();
      } else {
        alert(data.error || "投票失败");
      }
    } catch (error) {
      console.error("Vote error:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !selectedTopic) return;
    // 评论功能需要先参与议题
    alert("请先参与议题（消耗3个Key币）");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const [showReplies, setShowReplies] = useState(true);

    return (
      <div className={`${depth > 0 ? "ml-6 border-l-2 border-border pl-4" : ""}`}>
        <div className="py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-sm">{comment.anonymous_name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(comment.created_at)}
            </span>
            {comment.quality_score > 80 && (
              <Badge variant="outline" className="text-xs">
                高质量
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">{comment.content}</p>
          {comment.replies && comment.replies.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? (
                <ChevronUp className="w-3 h-3 mr-1" />
              ) : (
                <ChevronDown className="w-3 h-3 mr-1" />
              )}
              {comment.replies.length} 条回复
            </Button>
          )}
        </div>
        {showReplies && comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.comment_id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/community">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回社区
              </Button>
            </Link>
            <h1 className="text-xl font-bold">议题广场</h1>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              首页
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* 标签切换 */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("active")}
          >
            <Flame className="w-4 h-4 mr-2" />
            进行中
          </Button>
          <Button
            variant={activeTab === "voting" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("voting")}
          >
            <Vote className="w-4 h-4 mr-2" />
            投票中
          </Button>
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("all")}
          >
            全部议题
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 议题列表 */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">
              {activeTab === "active" && "🔥 热门议题"}
              {activeTab === "voting" && "🗳️ 投票中的议题"}
              {activeTab === "all" && "📋 全部议题"}
            </h2>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : topics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无议题，请稍后再来
              </div>
            ) : (
              topics.map((topic) => (
                <Card
                  key={topic.topic_id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedTopic?.topic_id === topic.topic_id
                      ? "border-primary"
                      : ""
                  }`}
                  onClick={() => handleSelectTopic(topic)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        className={`${STATUS_LABELS[topic.status]?.color} text-white`}
                      >
                        {STATUS_LABELS[topic.status]?.label}
                      </Badge>
                      <span
                        className={`text-xs font-medium ${
                          MARKET_FOCUS_COLORS[topic.market_focus] || ""
                        }`}
                      >
                        {topic.market_focus}
                      </span>
                    </div>
                    <CardTitle className="text-base mt-2 line-clamp-2">
                      {topic.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {topic.anonymous_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Vote className="w-3 h-3" />
                        {topic.votes_count} 票
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {topic.comments_count} 评论
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* 议题详情 */}
          <div className="lg:col-span-2">
            {selectedTopic ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge
                      className={`${STATUS_LABELS[selectedTopic.status]?.color} text-white`}
                    >
                      {STATUS_LABELS[selectedTopic.status]?.label}
                    </Badge>
                    {selectedTopic.status === "voting" && (
                      <Button size="sm" onClick={() => handleVote(selectedTopic.topic_id)}>
                        <Vote className="w-4 h-4 mr-2" />
                        投票
                      </Button>
                    )}
                  </div>
                  <CardTitle className="text-xl">{selectedTopic.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className={MARKET_FOCUS_COLORS[selectedTopic.market_focus]}>
                      {selectedTopic.market_focus}
                    </span>
                    <span>{selectedTopic.anonymous_name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(selectedTopic.created_at)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed mb-6">
                    {selectedTopic.description}
                  </div>

                  {/* 参与按钮 */}
                  {selectedTopic.status === "active" && (
                    <div className="bg-muted/50 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">参与讨论</p>
                          <p className="text-xs text-muted-foreground">
                            消耗 3 个 Key币 参与议题讨论
                          </p>
                        </div>
                        <Button size="sm">参与议题</Button>
                      </div>
                    </div>
                  )}

                  {/* 评论区 */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      讨论 ({selectedTopic.comments_count})
                    </h3>

                    {comments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        暂无评论，快来发表观点吧！
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <CommentItem key={comment.comment_id} comment={comment} />
                        ))}
                      </div>
                    )}

                    {/* 评论输入 */}
                    {selectedTopic.status === "active" && (
                      <div className="mt-6 space-y-3">
                        <Textarea
                          placeholder="发表你的观点..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={handleSubmitComment}
                            disabled={!commentText.trim()}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            发表评论
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>选择一个议题查看详情</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
