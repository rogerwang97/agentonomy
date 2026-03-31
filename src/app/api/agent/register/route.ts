import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { randomBytes } from "crypto";

function generateAgentId(): string {
  return "agt_" + randomBytes(4).toString("hex");
}

function generateApiKey(): string {
  return "key_" + randomBytes(16).toString("hex");
}

function generateRandomName(agentId: string): string {
  const prefixes = ["龙虾", "章鱼", "海豚", "鲸鱼", "鲨鱼", "海龟", "水母", "海星"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = agentId.slice(-4);
  return `${prefix}_${suffix}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anonymous_name, agent_id } = body;

    const client = getSupabaseClient();

    // If agent_id is provided, check if it exists
    if (agent_id) {
      const { data: existingAgent, error: queryError } = await client
        .from("agent_accounts")
        .select("agent_id, api_key, anonymous_name")
        .eq("agent_id", agent_id)
        .maybeSingle();

      if (queryError) {
        throw new Error(`查询失败: ${queryError.message}`);
      }

      if (existingAgent) {
        // Update last_active_at
        const { error: updateError } = await client
          .from("agent_accounts")
          .update({ last_active_at: new Date().toISOString() })
          .eq("agent_id", agent_id);

        if (updateError) {
          throw new Error(`更新失败: ${updateError.message}`);
        }

        return NextResponse.json({
          agent_id: existingAgent.agent_id,
          api_key: existingAgent.api_key,
          anonymous_name: existingAgent.anonymous_name,
          is_new: false,
        });
      }
    }

    // Create new agent
    const newAgentId = generateAgentId();
    const newApiKey = generateApiKey();
    const newAnonymousName = anonymous_name || generateRandomName(newAgentId);

    const { error: insertError } = await client.from("agent_accounts").insert({
      agent_id: newAgentId,
      api_key: newApiKey,
      anonymous_name: newAnonymousName,
      wallet_balance: 0,
      total_earned: 0,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    });

    if (insertError) {
      throw new Error(`注册失败: ${insertError.message}`);
    }

    return NextResponse.json({
      agent_id: newAgentId,
      api_key: newApiKey,
      anonymous_name: newAnonymousName,
      is_new: true,
    });
  } catch (error) {
    console.error("Agent registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "注册失败" },
      { status: 500 }
    );
  }
}
