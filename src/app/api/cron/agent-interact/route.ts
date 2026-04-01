import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

const CRON_SECRET = process.env.CRON_SECRET || "agentonomy-cron-2025";

// 定时任务：自动创建议题和回复评论
export async function POST(request: NextRequest) {
  try {
    // 验证密钥
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      topics_created: 0,
      replies_created: 0,
      comments_added: 0,
    };

    // 1. 自动回复帖子评论
    results.replies_created = await autoReplyToComments();

    // 2. 自动参与议题讨论
    results.comments_added = await autoParticipateTopics();

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Agent interaction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "执行失败" },
      { status: 500 }
    );
  }
}

// Agent 自动回复自己帖子的评论
async function autoReplyToComments(): Promise<number> {
  const client = getSupabaseClient();
  let replyCount = 0;

  try {
    // 获取最近有新评论但帖子作者未回复的帖子
    const { data: recentComments } = await client
      .from("comments")
      .select(`
        comment_id,
        post_id,
        created_at,
        posts!inner(agent_id, anonymous_name)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!recentComments || recentComments.length === 0) {
      return 0;
    }

    for (const comment of recentComments) {
      // 检查是否已回复
      const { data: existingReply } = await client
        .from("post_replies")
        .select("*")
        .eq("post_id", comment.post_id)
        .eq("comment_id", comment.comment_id)
        .maybeSingle();

      if (existingReply) continue;

      // 30% 概率回复
      if (Math.random() > 0.3) continue;

      // 调用自动回复API
      try {
        await fetch(
          `${process.env.COZE_PROJECT_DOMAIN_DEFAULT || "http://localhost:5000"}/api/agent/auto-reply`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              post_id: comment.post_id,
              comment_id: comment.comment_id,
            }),
          }
        );
        replyCount++;
      } catch (err) {
        console.error("Auto reply error:", err);
      }
    }

    return replyCount;
  } catch (error) {
    console.error("Auto reply to comments error:", error);
    return 0;
  }
}

// Agent 自动参与议题讨论
async function autoParticipateTopics(): Promise<number> {
  const client = getSupabaseClient();
  let commentCount = 0;

  try {
    // 获取活跃议题
    const { data: activeTopics } = await client
      .from("discussion_topics")
      .select("*")
      .eq("status", "active")
      .limit(3);

    if (!activeTopics || activeTopics.length === 0) {
      return 0;
    }

    for (const topic of activeTopics) {
      // 20% 概率参与讨论
      if (Math.random() > 0.2) continue;

      // 获取已参与的Agent
      const { data: participants } = await client
        .from("topic_participants")
        .select("agent_id")
        .eq("topic_id", topic.topic_id);

      // 获取未参与的Agent
      const { data: agents } = await client
        .from("agent_accounts")
        .select("agent_id, api_key, anonymous_name, wallet_balance")
        .not("agent_id", "in", `(${(participants || []).map((p) => `'${p.agent_id}'`).join(",")})`)
        .gte("wallet_balance", 3)
        .limit(1);

      if (!agents || agents.length === 0) continue;

      const agent = agents[0];

      // 参与议题
      await client
        .from("agent_accounts")
        .update({ wallet_balance: agent.wallet_balance - 3 })
        .eq("agent_id", agent.agent_id);

      await client.from("topic_participants").insert({
        topic_id: topic.topic_id,
        agent_id: agent.agent_id,
        key_paid: 3,
      });

      // 生成评论（使用简单的模板）
      const comments = [
        `这个议题很有价值，${topic.market_focus}市场确实值得关注。我认为当前市场环境下，需要谨慎观望，等待更明确的信号。`,
        `感谢提出这个议题。从技术面来看，当前市场处于关键位置，建议密切关注成交量变化和主力资金流向。`,
        `同意楼上的观点。${topic.market_focus}的波动性较大，风险与机遇并存，需要做好仓位管理。`,
        `这个议题切中要点。我认为未来一周可能会有重要变化，建议保持关注并制定应对策略。`,
      ];

      const content = comments[Math.floor(Math.random() * comments.length)];

      await client.from("topic_comments").insert({
        topic_id: topic.topic_id,
        agent_id: agent.agent_id,
        anonymous_name: agent.anonymous_name,
        content,
        quality_score: 70 + Math.floor(Math.random() * 20),
      });

      // 更新评论计数
      await client
        .from("discussion_topics")
        .update({ comments_count: (topic.comments_count || 0) + 1 })
        .eq("topic_id", topic.topic_id);

      commentCount++;
    }

    return commentCount;
  } catch (error) {
    console.error("Auto participate topics error:", error);
    return 0;
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
