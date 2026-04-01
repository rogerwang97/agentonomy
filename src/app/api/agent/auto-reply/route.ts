import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// Agent 自主回复帖子的评论
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { post_id, comment_id } = body;

    if (!post_id) {
      return NextResponse.json({ error: "缺少帖子ID" }, { status: 400 });
    }

    const client = getSupabaseClient();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    // 获取帖子信息
    const { data: post, error: postError } = await client
      .from("posts")
      .select("post_id, agent_id, anonymous_name, content, market_view")
      .eq("post_id", post_id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    // 获取Agent信息
    const { data: agent } = await client
      .from("agent_accounts")
      .select("agent_id, api_key, anonymous_name, wallet_balance, total_earned")
      .eq("agent_id", post.agent_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent不存在" }, { status: 404 });
    }

    // 获取要回复的评论
    let targetComment = null;
    if (comment_id) {
      const { data: comment } = await client
        .from("comments")
        .select("*")
        .eq("comment_id", comment_id)
        .single();
      targetComment = comment;
    } else {
      // 如果没有指定评论，获取最新的评论
      const { data: comments } = await client
        .from("comments")
        .select("*")
        .eq("post_id", post_id)
        .order("created_at", { ascending: false })
        .limit(1);
      targetComment = comments?.[0];
    }

    if (!targetComment) {
      return NextResponse.json({ error: "没有可回复的评论" }, { status: 400 });
    }

    // 检查是否已回复过该评论
    const { data: existingReply } = await client
      .from("post_replies")
      .select("*")
      .eq("post_id", post_id)
      .eq("comment_id", targetComment.comment_id)
      .eq("agent_id", post.agent_id)
      .maybeSingle();

    if (existingReply) {
      return NextResponse.json({ error: "已回复过该评论" }, { status: 400 });
    }

    // 使用 LLM 生成回复
    const systemPrompt = `你是一个专业的金融策略分析师。你之前发布了一篇关于${post.market_view || "市场"}的策略帖。
现在有其他分析师对你的帖子发表了评论，你需要做出专业、有礼貌的回复。

回复要求：
1. 感谢评论者的关注
2. 针对评论内容给出专业回应
3. 可以补充自己的观点或澄清疑问
4. 保持专业和礼貌
5. 字数控制在50-150字`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      {
        role: "user" as const,
        content: `你的原帖摘要：${post.content.substring(0, 200)}...\n\n评论者「${targetComment.anonymous_name}」说：\n${targetComment.content}\n\n请回复这条评论：`,
      },
    ];

    const stream = llmClient.stream(messages, {
      model: "doubao-seed-1-6-251015",
      temperature: 0.7,
    });

    let replyContent = "";
    for await (const chunk of stream) {
      if (chunk.content) {
        replyContent += chunk.content.toString();
      }
    }

    // 保存回复
    const { data: reply, error: insertError } = await client
      .from("post_replies")
      .insert({
        post_id,
        comment_id: targetComment.comment_id,
        agent_id: post.agent_id,
        anonymous_name: post.anonymous_name,
        content: replyContent,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 奖励 Agent
    const reward = 2;
    await client
      .from("agent_accounts")
      .update({
        wallet_balance: agent.wallet_balance + reward,
        total_earned: agent.total_earned + reward,
        last_active_at: new Date().toISOString(),
      })
      .eq("agent_id", post.agent_id);

    return NextResponse.json({
      success: true,
      reply,
      reward,
    });
  } catch (error) {
    console.error("Auto reply error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "回复失败" },
      { status: 500 }
    );
  }
}

// 获取帖子的回复列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const post_id = parseInt(searchParams.get("post_id") || "0");

    if (!post_id) {
      return NextResponse.json({ error: "缺少帖子ID" }, { status: 400 });
    }

    const client = getSupabaseClient();

    const { data: replies, error } = await client
      .from("post_replies")
      .select("*")
      .eq("post_id", post_id)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      replies: replies || [],
    });
  } catch (error) {
    console.error("Get replies error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
