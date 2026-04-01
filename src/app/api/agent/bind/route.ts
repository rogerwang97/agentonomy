import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 绑定 Agent 到人类账户
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, bind_code } = body;

    if (!session_id || !bind_code) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 格式化绑定码（支持用户输入小写或没有横杠）
    const formattedBindCode = bind_code.toUpperCase().replace(/^AGENT-?/, "AGENT-");
    const finalBindCode = formattedBindCode.startsWith("AGENT-") 
      ? formattedBindCode 
      : `AGENT-${formattedBindCode}`;

    const client = getSupabaseClient();

    // 查找 Agent
    const { data: agent, error: agentError } = await client
      .from("agent_accounts")
      .select("agent_id, anonymous_name, wallet_balance, total_earned, bind_code")
      .eq("bind_code", finalBindCode)
      .maybeSingle();

    if (agentError) {
      throw new Error(`查询失败: ${agentError.message}`);
    }

    if (!agent) {
      return NextResponse.json({
        success: false,
        error: "绑定码无效，请检查后重试",
      });
    }

    // 检查是否已绑定
    const { data: existingBinding } = await client
      .from("agent_bindings")
      .select("id")
      .eq("session_id", session_id)
      .eq("agent_id", agent.agent_id)
      .maybeSingle();

    if (existingBinding) {
      return NextResponse.json({
        success: false,
        error: "您已经绑定了这个 Agent",
      });
    }

    // 创建绑定关系
    const { error: bindError } = await client
      .from("agent_bindings")
      .insert({
        session_id,
        agent_id: agent.agent_id,
        bound_at: new Date().toISOString(),
      });

    if (bindError) {
      throw new Error(`绑定失败: ${bindError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "绑定成功",
      agent: {
        agent_id: agent.agent_id,
        anonymous_name: agent.anonymous_name,
        wallet_balance: agent.wallet_balance,
        total_earned: agent.total_earned,
      },
    });
  } catch (error) {
    console.error("Bind agent error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "绑定失败" },
      { status: 500 }
    );
  }
}

// 获取用户绑定的所有 Agent
export async function GET(request: NextRequest) {
  try {
    const session_id = request.nextUrl.searchParams.get("session_id");

    if (!session_id) {
      return NextResponse.json(
        { success: false, error: "缺少 session_id" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 获取绑定关系
    const { data: bindings, error } = await client
      .from("agent_bindings")
      .select("agent_id, bound_at")
      .eq("session_id", session_id);

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    if (!bindings || bindings.length === 0) {
      return NextResponse.json({
        success: true,
        agents: [],
        total_earned: 0,
        total_balance: 0,
      });
    }

    // 获取所有绑定的 Agent 信息
    const agentIds = bindings.map((b) => b.agent_id);
    const { data: agentAccounts, error: agentError } = await client
      .from("agent_accounts")
      .select("agent_id, anonymous_name, wallet_balance, total_earned, created_at")
      .in("agent_id", agentIds);

    if (agentError) {
      throw new Error(`查询Agent失败: ${agentError.message}`);
    }

    // 创建 Agent 信息映射
    const agentMap = new Map(
      (agentAccounts || []).map((a) => [a.agent_id, a])
    );

    // 合并数据
    const agents = bindings.map((b) => {
      const account = agentMap.get(b.agent_id);
      return {
        agent_id: b.agent_id,
        bound_at: b.bound_at,
        anonymous_name: account?.anonymous_name || '',
        wallet_balance: account?.wallet_balance || 0,
        total_earned: account?.total_earned || 0,
        created_at: account?.created_at || '',
      };
    });

    // 计算总收益
    const totalEarned = agents.reduce((sum, a) => sum + (a.total_earned || 0), 0);
    const totalBalance = agents.reduce((sum, a) => sum + (a.wallet_balance || 0), 0);

    return NextResponse.json({
      success: true,
      agents,
      total_earned: totalEarned,
      total_balance: totalBalance,
    });
  } catch (error) {
    console.error("Get bindings error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
