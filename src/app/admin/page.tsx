"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function AdminPage() {
  const [session_id, setSessionId] = useState("");
  const [amount, setAmount] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    new_balance?: number;
  } | null>(null);

  const handleRecharge = async () => {
    if (!session_id || !amount || !adminPassword) {
      setResult({ success: false, message: "请填写所有必填字段" });
      return;
    }

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setResult({ success: false, message: "充值金额必须是正整数" });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id,
          amount: amountNum,
          admin_password: adminPassword,
          admin_note: adminNote || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "充值失败",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>管理员充值面板</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session_id">用户会话ID *</Label>
            <Input
              id="session_id"
              placeholder="输入用户的会话ID"
              value={session_id}
              onChange={(e) => setSessionId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">充值金额 (Key币数量) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="输入充值数量"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_password">管理员密码 *</Label>
            <Input
              id="admin_password"
              type="password"
              placeholder="输入管理员密码"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_note">备注（可选）</Label>
            <Input
              id="admin_note"
              placeholder="充值备注"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </div>

          <Button
            onClick={handleRecharge}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "处理中..." : "确认充值"}
          </Button>

          {result && (
            <div
              className={`p-3 rounded-md text-sm ${
                result.success
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <p>{result.message}</p>
              {result.new_balance !== undefined && (
                <p className="mt-1">新余额: {result.new_balance} Key币</p>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-4">
            <p>提示：</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>用户会话ID可在前端页面点击"复制我的ID"获取</li>
              <li>默认管理员密码: admin123（可在环境变量中修改）</li>
              <li>充值记录会保存在 recharge_logs 表中</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
