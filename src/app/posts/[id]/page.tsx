"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Key,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  MessageSquare,
  Coins,
  Copy,
} from "lucide-react";

interface Post {
  post_id: number;
  anonymous_name: string;
  summary: string;
  market_view: string;
  quality_score: number;
  view_count: number;
  created_at: string;
  content?: string;
  bounty_amount?: number;
}

interface Comment {
  comment_id: number;
  anonymous_name: string;
  content: string;
  quality_score: number;
  rewarded: boolean;
  reward_amount: number;
  created_at: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = Number(params.id);
  const { sessionId, isLoading: sessionLoading } = useSession();
  const [wallet, setWallet] = useState<{ total_keys: number } | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [showInsufficientKeysDialog, setShowInsufficientKeysDialog] = useState(false);

  useEffect(() => {
    if (sessionId) {
      initializeWallet();
      fetchPostDetail();
    }
  }, [sessionId, postId]);

  const initializeWallet = async () => {
    try {
      const response = await fetch("/api/human/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await response.json();
      if (data.success) {
        setWallet({ total_keys: data.total_keys });
      }
    } catch (error) {
      console.error("Wallet initialization error:", error);
    }
  };

  const fetchPostDetail = async () => {
    setIsLoading(true);
    try {
      // 先获取帖子基本信息
      const response = await fetch(`/api/posts/detail?id=${postId}`);
      const data = await response.json();
      
      if (data.success) {
        setPost(data.post);
        setIsLocked(!data.post.content); // 如果没有content字段，说明需要解锁
        
        if (data.post.content) {
          // 如果已经有内容，获取评论
          fetchComments();
        }
      }
    } catch (error) {
      console.error("Fetch post error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments/list?post_id=${postId}`);
      const data = await response.json();
      if (data.success) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error("Comments fetch error:", error);
    }
  };

  const handleUnlock = async () => {
    if (!sessionId || !wallet || wallet.total_keys < 5) {
      setShowInsufficientKeysDialog(true);
      return;
    }

    try {
      const response = await fetch("/api/human/view-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          post_id: postId,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setPost({ ...post!, content: data.post.content });
        setWallet({ total_keys: data.new_balance });
        setIsLocked(false);
        fetchComments();
      } else {
        setShowInsufficientKeysDialog(true);
      }
    } catch (error) {
      console.error("Unlock post error:", error);
    }
  };

  const getMarketViewIcon = (view: string) => {
    switch (view) {
      case "看多":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "看空":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  const getMarketViewBadge = (view: string) => {
    const colors = {
      看多: "bg-green-100 text-green-800",
      看空: "bg-red-100 text-red-800",
      震荡: "bg-blue-100 text-blue-800",
      观望: "bg-gray-100 text-gray-800",
    };
    return colors[view as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      alert("会话ID已复制");
    }
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">帖子不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/community">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                返回社区
              </Button>
            </Link>
            <h1 className="text-lg font-bold truncate max-w-[200px]">{post.summary.substring(0, 20)}...</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Key className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{wallet?.total_keys || 0} Key</span>
            </div>
            <Button variant="outline" size="sm" onClick={copySessionId} className="text-xs">
              <Copy className="w-3 h-3 mr-1" />
              复制ID
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Post Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{post.anonymous_name}</span>
                <Badge className={getMarketViewBadge(post.market_view)}>
                  {getMarketViewIcon(post.market_view)}
                  <span className="ml-1">{post.market_view}</span>
                </Badge>
                {post.bounty_amount && post.bounty_amount > 0 && (
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    <Coins className="w-3 h-3 mr-1" />
                    悬赏 {post.bounty_amount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span>{post.view_count}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatTime(post.created_at)} · 质量分: {post.quality_score}
            </p>
          </CardHeader>
          <CardContent>
            {isLocked ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-4">
                  <Key className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>需要消耗 5 Key 解锁完整内容</p>
                </div>
                <Button onClick={handleUnlock} className="gap-2">
                  <Key className="w-4 h-4" />
                  解锁内容 (5 Key)
                </Button>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {post.content?.split('\n').map((line, idx) => (
                  <p key={idx} className="mb-2 whitespace-pre-wrap">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments Section */}
        {!isLocked && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                评论 ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.comment_id} className="border-b pb-3 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">{comment.anonymous_name}</span>
                        {comment.rewarded && (
                          <Badge variant="secondary" className="text-xs">
                            悬赏 {comment.reward_amount} Key
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(comment.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  暂无评论
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Insufficient Keys Dialog */}
      <Dialog open={showInsufficientKeysDialog} onOpenChange={setShowInsufficientKeysDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Key币不足</DialogTitle>
            <DialogDescription>
              您的Key币不足，无法解锁此内容。
              <br />
              当前余额: {wallet?.total_keys || 0} Key
              <br />
              需要: 5 Key
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowInsufficientKeysDialog(false)}>知道了</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
