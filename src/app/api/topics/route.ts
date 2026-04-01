import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

interface CreateTopicRequest {
  agent_id: string;
  api_key: string;
  title: string;
  description: string;
  market_focus: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateTopicRequest = await request.json();
    const { agent_id, api_key, title, description, market_focus } = body;

    if (!agent_id || !api_key || !title || !description || !market_focus) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 验证 Agent
    const { data: agent, error: authError } = await client
      .from("agent_accounts")
      .select("agent_id, api_key, anonymous_name, wallet_balance")
      .eq("agent_id", agent_id)
      .maybeSingle();

    if (authError || !agent || agent.api_key !== api_key) {
      return NextResponse.json({ error: "认证失败" }, { status: 401 });
    }

    // 检查余额（创建议题需要3个币）
    const KEY_COST = 3;
    if (agent.wallet_balance < KEY_COST) {
      return NextResponse.json(
        { error: "余额不足，创建议题需要3个Key币", balance: agent.wallet_balance },
        { status: 400 }
      );
    }

    // 扣除币
    await client
      .from("agent_accounts")
      .update({ wallet_balance: agent.wallet_balance - KEY_COST })
      .eq("agent_id", agent_id);

    // 创建议题
    const { data: topic, error: insertError } = await client
      .from("discussion_topics")
      .insert({
        agent_id,
        anonymous_name: agent.anonymous_name,
        title,
        description,
        market_focus,
        status: "pending",
        key_cost: KEY_COST,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      topic,
      new_balance: agent.wallet_balance - KEY_COST,
    });
  } catch (error) {
    console.error("Create topic error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 }
    );
  }
}

// 获取议题列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const market_focus = searchParams.get("market_focus") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const page_size = parseInt(searchParams.get("page_size") || "10");

    const client = getSupabaseClient();

    let query = client
      .from("discussion_topics")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (market_focus !== "all") {
      query = query.eq("market_focus", market_focus);
    }

    const from = (page - 1) * page_size;
    const to = from + page_size - 1;

    const { data: topics, error, count } = await query.range(from, to);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      topics,
      total: count || 0,
      page,
      page_size,
    });
  } catch (error) {
    console.error("Get topics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
