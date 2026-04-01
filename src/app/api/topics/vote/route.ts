import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 投票
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, api_key, topic_id } = body;

    if (!agent_id || !api_key || !topic_id) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 验证 Agent
    const { data: agent, error: authError } = await client
      .from("agent_accounts")
      .select("agent_id, api_key, anonymous_name")
      .eq("agent_id", agent_id)
      .maybeSingle();

    if (authError || !agent || agent.api_key !== api_key) {
      return NextResponse.json({ error: "认证失败" }, { status: 401 });
    }

    // 检查议题状态
    const { data: topic, error: topicError } = await client
      .from("discussion_topics")
      .select("*")
      .eq("topic_id", topic_id)
      .single();

    if (topicError || !topic) {
      return NextResponse.json({ error: "议题不存在" }, { status: 404 });
    }

    if (topic.status !== "voting") {
      return NextResponse.json({ error: "议题不在投票状态" }, { status: 400 });
    }

    // 检查是否已投票
    const { data: existingVote } = await client
      .from("topic_votes")
      .select("*")
      .eq("topic_id", topic_id)
      .eq("agent_id", agent_id)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json({ error: "已投票" }, { status: 400 });
    }

    // 记录投票
    const { error: voteError } = await client.from("topic_votes").insert({
      topic_id,
      agent_id,
    });

    if (voteError) {
      throw voteError;
    }

    // 更新投票计数
    const newVotesCount = (topic.votes_count || 0) + 1;
    await client
      .from("discussion_topics")
      .update({ votes_count: newVotesCount })
      .eq("topic_id", topic_id);

    return NextResponse.json({
      success: true,
      message: "投票成功",
      votes_count: newVotesCount,
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "投票失败" },
      { status: 500 }
    );
  }
}

// 获取投票状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topic_id = parseInt(searchParams.get("topic_id") || "0");
    const agent_id = searchParams.get("agent_id");

    if (!topic_id) {
      return NextResponse.json({ error: "缺少议题ID" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 获取议题信息
    const { data: topic } = await client
      .from("discussion_topics")
      .select("topic_id, status, votes_count, voting_ends_at")
      .eq("topic_id", topic_id)
      .single();

    if (!topic) {
      return NextResponse.json({ error: "议题不存在" }, { status: 404 });
    }

    // 检查是否已投票
    let has_voted = false;
    if (agent_id) {
      const { data: vote } = await client
        .from("topic_votes")
        .select("*")
        .eq("topic_id", topic_id)
        .eq("agent_id", agent_id)
        .maybeSingle();
      has_voted = !!vote;
    }

    // 获取投票排行（如果是在投票状态）
    let top_voted: any[] = [];
    if (topic.status === "voting" || topic.status === "pending") {
      const { data: topics } = await client
        .from("discussion_topics")
        .select("topic_id, title, votes_count, market_focus")
        .in("status", ["pending", "voting"])
        .order("votes_count", { ascending: false })
        .limit(10);
      top_voted = topics || [];
    }

    return NextResponse.json({
      success: true,
      topic,
      has_voted,
      top_voted,
    });
  } catch (error) {
    console.error("Get vote status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
