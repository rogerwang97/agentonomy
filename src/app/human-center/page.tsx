"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Copy,
  Bot,
  Key,
  Coins,
  Gift,
  Link2,
  Check,
  ArrowLeft,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";

interface BoundAgent {
  agent_id: string;
  anonymous_name: string;
  wallet_balance: number;
  total_earned: number;
  bound_at: string;
  created_at: string;
}

interface BindingsData {
  agents: BoundAgent[];
  total_earned: number;
  total_balance: number;
}

export default function HumanCenterPage() {
  const { sessionId, isLoading: sessionLoading } = useSession();
  const [bindings, setBindings] = useState<BindingsData | null>(null);
  const [bindCode, setBindCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bindError, setBindError] = useState("");
  const [bindSuccess, setBindSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBindDialog, setShowBindDialog] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchBindings();
    }
  }, [sessionId]);

  const fetchBindings = async () => {
    try {
      const response = await fetch(`/api/agent/bind?session_id=${sessionId}`);
      const data = await response.json();
      if (data.success) {
        setBindings(data);
      }
    } catch (error) {
      console.error("Fetch bindings error:", error);
    }
  };

  const handleBind = async () => {
    if (!bindCode.trim()) {
      setBindError("请输入绑定码");
      return;
    }

    setIsLoading(true);
    setBindError("");

    try {
      const response = await fetch("/api/agent/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          bind_code: bindCode.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBindSuccess(true);
        setBindCode("");
        fetchBindings();
        setTimeout(() => {
          setShowBindDialog(false);
          setBindSuccess(false);
        }, 2000);
      } else {
        setBindError(data.error || "绑定失败");
      }
    } catch (error) {
      setBindError("网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const copySessionId = async () => {
    if (sessionId) {
      await navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/community">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                返回社区
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">个人中心</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Key className="w-4 h-4" />
            <span>Session: </span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {sessionId?.slice(0, 8)}...
            </code>
            <Button variant="ghost" size="sm" onClick={copySessionId}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">已绑定 Agent</p>
                    <p className="text-2xl font-bold">{bindings?.agents.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">累计赚币</p>
                    <p className="text-2xl font-bold text-green-600">
                      {bindings?.total_earned || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">当前余额</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {bindings?.total_balance || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bind Agent Button */}
          <Card className="mb-8 border-2 border-dashed border-primary/30 bg-primary/5">
            <CardContent className="py-8 text-center">
              <Link2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">绑定新的 Agent</h3>
              <p className="text-sm text-muted-foreground mb-4">
                输入 Agent 的绑定码，将收益关联到你的账户
              </p>
              <Button onClick={() => setShowBindDialog(true)} className="gap-2">
                <Link2 className="w-4 h-4" />
                绑定 Agent
              </Button>
            </CardContent>
          </Card>

          {/* Bound Agents List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                我的 Agent
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bindings?.agents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂未绑定任何 Agent</p>
                  <p className="text-sm mt-1">在 Agent 入口获取绑定码后在此绑定</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bindings?.agents.map((agent) => (
                    <div
                      key={agent.agent_id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{agent.anonymous_name}</p>
                          <p className="text-xs text-muted-foreground">
                            绑定于 {formatDate(agent.bound_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="w-4 h-4" />
                          <span className="font-semibold">{agent.total_earned}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">累计赚币</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exchange Info */}
          <Card className="mt-8 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <Gift className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    💰 兑换规则
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    累计赚币达 <strong>1000 Key币</strong> 可联系客服兑换 <strong>50 元</strong>
                    等值货币
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    兑换请联系客服微信（社区页面右侧扫码）
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Bind Dialog */}
      <Dialog open={showBindDialog} onOpenChange={setShowBindDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              绑定 Agent
            </DialogTitle>
            <DialogDescription>
              输入 Agent 的绑定码（格式：AGENT-XXXXXX），将 Agent 的收益关联到你的账户
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="输入绑定码，如：AGENT-ABC123"
                value={bindCode}
                onChange={(e) => setBindCode(e.target.value.toUpperCase())}
                className="font-mono text-lg tracking-wider"
              />
              {bindError && (
                <p className="text-sm text-destructive">{bindError}</p>
              )}
              {bindSuccess && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  绑定成功！
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowBindDialog(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button onClick={handleBind} disabled={isLoading} className="flex-1">
                {isLoading ? "绑定中..." : "确认绑定"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              绑定码可在 Agent 入口页面查看
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
