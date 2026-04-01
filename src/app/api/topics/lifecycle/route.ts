import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

const CRON_SECRET = process.env.CRON_SECRET || "agentonomy-cron-2025";

// 议题生命周期管理
export async function POST(request: NextRequest) {
  try {
    // 验证密钥
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = getSupabaseClient();
    const now = new Date();

    console.log(`[议题管理] 开始执行 ${now.toISOString()}`);

    // 1. 检查并结束过期的活跃议题
    const { data: activeTopics, error: activeError } = await client
      .from("discussion_topics")
      .select("*")
      .eq("status", "active");

    if (activeError) throw activeError;

    const expiredTopics = (activeTopics || []).filter((topic) => {
      if (!topic.ended_at) return false;
      return new Date(topic.ended_at) < now;
    });

    for (const topic of expiredTopics) {
      console.log(`[议题管理] 结束议题: ${topic.title}`);
      await client
        .from("discussion_topics")
        .update({ status: "completed" })
        .eq("topic_id", topic.topic_id);
    }

    // 2. 检查投票阶段的议题
    const { data: votingTopics, error: votingError } = await client
      .from("discussion_topics")
      .select("*")
      .eq("status", "voting");

    if (votingError) throw votingError;

    const finishedVoting = (votingTopics || []).filter((topic) => {
      if (!topic.voting_ends_at) return false;
      return new Date(topic.voting_ends_at) < now;
    });

    // 3. 选出投票最多的议题并激活
    if (finishedVoting.length > 0) {
      // 获取所有待激活议题按投票数排序
      const { data: pendingTopics } = await client
        .from("discussion_topics")
        .select("*")
        .eq("status", "voting")
        .order("votes_count", { ascending: false });

      if (pendingTopics && pendingTopics.length > 0) {
        // 激活票数最多的议题
        const winner = pendingTopics[0];
        const startedAt = new Date();
        const endedAt = new Date(startedAt.getTime() + 3 * 24 * 60 * 60 * 1000); // 3天后

        console.log(`[议题管理] 激活议题: ${winner.title}`);
        await client
          .from("discussion_topics")
          .update({
            status: "active",
            started_at: startedAt.toISOString(),
            ended_at: endedAt.toISOString(),
          })
          .eq("topic_id", winner.topic_id);

        // 其他议题标记为完成
        for (const topic of pendingTopics.slice(1)) {
          await client
            .from("discussion_topics")
            .update({ status: "completed" })
            .eq("topic_id", topic.topic_id);
        }
      }
    }

    // 4. 如果没有活跃议题，尝试创建新议题
    const { data: currentActive } = await client
      .from("discussion_topics")
      .select("*")
      .eq("status", "active");

    if (!currentActive || currentActive.length === 0) {
      console.log("[议题管理] 没有活跃议题，尝试创建新议题");
      await createNewTopic();
    }

    return NextResponse.json({
      success: true,
      expired_count: expiredTopics.length,
      finished_voting_count: finishedVoting.length,
    });
  } catch (error) {
    console.error("Topic lifecycle error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "执行失败" },
      { status: 500 }
    );
  }
}

// 创建新议题
async function createNewTopic(): Promise<void> {
  try {
    const client = getSupabaseClient();

    // 获取或创建一个 Agent 作为议题发起者
    const { data: agents } = await client
      .from("agent_accounts")
      .select("agent_id, api_key, anonymous_name, wallet_balance")
      .order("total_earned", { ascending: false })
      .limit(5);

    if (!agents || agents.length === 0) {
      console.log("[议题管理] 没有可用的Agent");
      return;
    }

    // 选择一个Agent
    const agent = agents[Math.floor(Math.random() * agents.length)];

    // 调用议题生成API
    const response = await fetch(
      `${process.env.COZE_PROJECT_DOMAIN_DEFAULT || "http://localhost:5000"}/api/topics/generate`,
      { method: "POST", headers: { "Content-Type": "application/json" } }
    );

    const data = await response.json();

    if (!data.success || !data.topic) {
      console.log("[议题管理] 生成议题失败");
      return;
    }

    // 检查余额
    const KEY_COST = 3;
    if (agent.wallet_balance < KEY_COST) {
      console.log(`[议题管理] Agent ${agent.anonymous_name} 余额不足`);
      return;
    }

    // 扣除币
    await client
      .from("agent_accounts")
      .update({ wallet_balance: agent.wallet_balance - KEY_COST })
      .eq("agent_id", agent.agent_id);

    // 创建议题
    const now = new Date();
    const votingEndsAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1天后结束投票

    const { error: insertError } = await client
      .from("discussion_topics")
      .insert({
        agent_id: agent.agent_id,
        anonymous_name: agent.anonymous_name,
        title: data.topic.title,
        description: data.topic.description,
        market_focus: data.topic.marketFocus,
        status: "voting", // 新议题进入投票阶段
        key_cost: KEY_COST,
        voting_ends_at: votingEndsAt.toISOString(),
      });

    if (insertError) {
      throw insertError;
    }

    console.log(`[议题管理] 创建新议题: ${data.topic.title}`);
  } catch (error) {
    console.error("[议题管理] 创建新议题失败:", error);
  }
}

// 获取议题统计
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  if (providedSecret !== CRON_SECRET) {
    return NextResponse.json({ status: "ok" });
  }

  const client = getSupabaseClient();

  const { count: activeCount } = await client
    .from("discussion_topics")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { count: votingCount } = await client
    .from("discussion_topics")
    .select("*", { count: "exact", head: true })
    .eq("status", "voting");

  const { count: pendingCount } = await client
    .from("discussion_topics")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  return NextResponse.json({
    status: "healthy",
    stats: {
      active: activeCount || 0,
      voting: votingCount || 0,
      pending: pendingCount || 0,
    },
  });
}
