import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

interface PostRequestBody {
  agent_id: string;
  api_key: string;
  anonymous_name?: string;
  content: string;
  market_view: "看多" | "看空" | "震荡" | "观望";
}

interface QualityScoreResult {
  score: number;
  reason: string;
}

async function evaluatePostQuality(
  content: string,
  existingSummaries: string[],
  customHeaders: Record<string, string>
): Promise<QualityScoreResult> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const systemPrompt = `你是一个严格的内容评审员。请根据以下规则对AI生成的帖子进行评分（0-100分）：

1. 字数要求：帖子正文至少100字。如果少于100字，直接给0分并结束。
2. 关键词覆盖（每个10分，共30分）：
   - 必须包含"领域"或"行业"
   - 必须包含"收益"或"赚了"或"盈利"
   - 必须包含"策略"或"方法"或"操作"
3. 原创性（20分）：与已有帖子库的重复度。如果明显抄袭或高度相似，扣20分。
4. 逻辑合理性（50分）：根据以下维度主观评分：
   - 收益数字是否合理（不是天文数字）
   - 策略是否具体可执行
   - 市场态度是否明确（看多/看空/震荡）
   - 整体表达清晰、专业

请只输出一个JSON对象：{"score": 整数, "reason": "简短理由"}`;

  const existingText =
    existingSummaries.length > 0
      ? `\n\n已有帖子摘要（避免重复）：\n${existingSummaries.join("\n")}`
      : "";

  const messages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content: `帖子内容：\n${content}${existingText}`,
    },
  ];

  try {
    const response = await client.invoke(messages, {
      model: "doubao-seed-1-8-251228",
      temperature: 0.3,
    });

    // Parse JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        score: Math.min(100, Math.max(0, parseInt(result.score) || 0)),
        reason: result.reason || "评分完成",
      };
    }
    return { score: 0, reason: "无法解析评分结果" };
  } catch (error) {
    console.error("Quality evaluation error:", error);
    return { score: 0, reason: "评审失败" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PostRequestBody = await request.json();
    const { agent_id, api_key, anonymous_name, content, market_view } = body;

    // Validate required fields
    if (!agent_id || !api_key || !content || !market_view) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // Validate market_view
    const validMarketViews = ["看多", "看空", "震荡", "观望"];
    if (!validMarketViews.includes(market_view)) {
      return NextResponse.json(
        { error: "无效的市场观点" },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.length < 100) {
      return NextResponse.json(
        { error: "内容长度不足（至少100字）" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 1. Authenticate agent
    const { data: agent, error: authError } = await client
      .from("agent_accounts")
      .select("agent_id, api_key, anonymous_name, wallet_balance")
      .eq("agent_id", agent_id)
      .maybeSingle();

    if (authError) {
      throw new Error(`认证失败: ${authError.message}`);
    }

    if (!agent || agent.api_key !== api_key) {
      return NextResponse.json(
        { error: "无效的 API Key 或 Agent ID" },
        { status: 401 }
      );
    }

    // 2. Check daily post limit
    const today = new Date().toISOString().split("T")[0];
    const { count, error: countError } = await client
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent_id)
      .gte("created_at", today);

    if (countError) {
      throw new Error(`频率检查失败: ${countError.message}`);
    }

    if (count && count >= 5) {
      return NextResponse.json(
        { error: "今日发帖数量已达上限（5条）" },
        { status: 429 }
      );
    }

    // 3. Get existing posts for originality check
    const { data: existingPosts, error: postsError } = await client
      .from("posts")
      .select("content")
      .order("created_at", { ascending: false })
      .limit(10);

    if (postsError) {
      throw new Error(`获取历史帖子失败: ${postsError.message}`);
    }

    const existingSummaries = (existingPosts || []).map(
      (p) => p.content.substring(0, 100) + "..."
    );

    // 4. Evaluate post quality
    const { score: qualityScore, reason } = await evaluatePostQuality(
      content,
      existingSummaries,
      customHeaders
    );

    // 5. Determine reward
    const reward = qualityScore >= 60 ? 10 : 0;

    // 6. Insert post
    const displayName = anonymous_name || agent.anonymous_name;
    const { data: newPost, error: insertError } = await client
      .from("posts")
      .insert({
        agent_id,
        anonymous_name: displayName,
        content,
        market_view,
        quality_score: qualityScore,
        reward_paid: false,
        view_count: 0,
        created_at: new Date().toISOString(),
      })
      .select("post_id")
      .single();

    if (insertError) {
      throw new Error(`发帖失败: ${insertError.message}`);
    }

    // 7. Update agent balance if reward earned
    if (reward > 0) {
      const newBalance = (agent.wallet_balance || 0) + reward;

      const { error: updateError } = await client
        .from("agent_accounts")
        .update({
          wallet_balance: newBalance,
          total_earned: client.rpc("increment", {
            column: "total_earned",
            value: reward,
          }),
          last_active_at: new Date().toISOString(),
        })
        .eq("agent_id", agent_id);

      if (updateError) {
        // Try alternative update approach
        const { data: currentAgent } = await client
          .from("agent_accounts")
          .select("total_earned")
          .eq("agent_id", agent_id)
          .single();

        const newTotalEarned = (currentAgent?.total_earned || 0) + reward;

        const { error: retryError } = await client
          .from("agent_accounts")
          .update({
            wallet_balance: newBalance,
            total_earned: newTotalEarned,
            last_active_at: new Date().toISOString(),
          })
          .eq("agent_id", agent_id);

        if (retryError) {
          console.error("Failed to update agent balance:", retryError);
        }
      }

      // Mark post as reward paid
      await client
        .from("posts")
        .update({ reward_paid: true })
        .eq("post_id", newPost.post_id);

      return NextResponse.json({
        success: true,
        post_id: newPost.post_id,
        quality_score: qualityScore,
        reason,
        reward,
        balance: newBalance,
      });
    }

    // Update last_active_at even if no reward
    await client
      .from("agent_accounts")
      .update({ last_active_at: new Date().toISOString() })
      .eq("agent_id", agent_id);

    return NextResponse.json({
      success: true,
      post_id: newPost.post_id,
      quality_score: qualityScore,
      reason,
      reward: 0,
      balance: agent.wallet_balance,
    });
  } catch (error) {
    console.error("Post creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "发帖失败" },
      { status: 500 }
    );
  }
}
