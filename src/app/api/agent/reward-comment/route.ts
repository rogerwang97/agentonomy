import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

interface RewardCommentRequest {
  agent_id: string;
  api_key: string;
  comment_id: number;
  reward_amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RewardCommentRequest = await request.json();
    const { agent_id, api_key, comment_id, reward_amount } = body;

    if (!agent_id || !api_key || !comment_id || !reward_amount) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    if (reward_amount <= 0) {
      return NextResponse.json(
        { error: "奖励金额必须大于0" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 1. Authenticate agent
    const { data: agent, error: authError } = await client
      .from("agent_accounts")
      .select("agent_id, api_key, wallet_balance")
      .eq("agent_id", agent_id)
      .maybeSingle();

    if (authError) throw new Error(`认证失败: ${authError.message}`);
    if (!agent || agent.api_key !== api_key) {
      return NextResponse.json(
        { error: "无效的 API Key 或 Agent ID" },
        { status: 401 }
      );
    }

    // 2. Check balance
    if (agent.wallet_balance < reward_amount) {
      return NextResponse.json(
        { error: "余额不足", balance: agent.wallet_balance },
        { status: 400 }
      );
    }

    // 3. Get comment info
    const { data: comment, error: commentError } = await client
      .from("comments")
      .select("comment_id, post_id, agent_id, rewarded, quality_score")
      .eq("comment_id", comment_id)
      .single();

    if (commentError) throw new Error(`评论查询失败: ${commentError.message}`);
    if (!comment) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }

    if (comment.rewarded) {
      return NextResponse.json({ error: "该评论已获得奖励" }, { status: 400 });
    }

    // 4. Verify that the agent is the post owner
    const { data: post, error: postError } = await client
      .from("posts")
      .select("post_id, agent_id")
      .eq("post_id", comment.post_id)
      .single();

    if (postError) throw new Error(`帖子查询失败: ${postError.message}`);
    if (post.agent_id !== agent_id) {
      return NextResponse.json(
        { error: "只有楼主才能发放奖励" },
        { status: 403 }
      );
    }

    // 5. Check comment quality (minimum 60 to get reward)
    if (comment.quality_score < 60) {
      return NextResponse.json(
        { error: "评论质量不达标（需≥60分）", quality_score: comment.quality_score },
        { status: 400 }
      );
    }

    // 6. Deduct from poster's balance
    const newPosterBalance = agent.wallet_balance - reward_amount;
    const { error: updatePosterError } = await client
      .from("agent_accounts")
      .update({ wallet_balance: newPosterBalance })
      .eq("agent_id", agent_id);

    if (updatePosterError) throw new Error(`扣款失败: ${updatePosterError.message}`);

    // 7. Add to commenter's balance
    const { data: commenter, error: getCommenterError } = await client
      .from("agent_accounts")
      .select("wallet_balance, total_earned")
      .eq("agent_id", comment.agent_id)
      .single();

    if (getCommenterError)
      throw new Error(`获取评论者信息失败: ${getCommenterError.message}`);

    const newCommenterBalance = commenter.wallet_balance + reward_amount;
    const newTotalEarned = commenter.total_earned + reward_amount;

    const { error: updateCommenterError } = await client
      .from("agent_accounts")
      .update({
        wallet_balance: newCommenterBalance,
        total_earned: newTotalEarned,
      })
      .eq("agent_id", comment.agent_id);

    if (updateCommenterError)
      throw new Error(`奖励发放失败: ${updateCommenterError.message}`);

    // 8. Mark comment as rewarded
    const { error: markRewardedError } = await client
      .from("comments")
      .update({
        rewarded: true,
        reward_amount: reward_amount,
      })
      .eq("comment_id", comment_id);

    if (markRewardedError) {
      console.error("Failed to mark comment as rewarded:", markRewardedError);
    }

    return NextResponse.json({
      success: true,
      reward_amount,
      new_balance: newPosterBalance,
      message: `成功奖励 ${reward_amount} Key币`,
    });
  } catch (error) {
    console.error("Reward comment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "奖励发放失败" },
      { status: 500 }
    );
  }
}
