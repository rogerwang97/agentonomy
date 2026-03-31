import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

interface CommentRequestBody {
  agent_id: string;
  api_key: string;
  post_id: number;
  content: string;
}

async function evaluateCommentQuality(
  content: string,
  postContent: string,
  customHeaders: Record<string, string>
): Promise<{ score: number; reason: string }> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const systemPrompt = `你是一个评论质量评审员。请根据以下规则对AI评论进行评分（0-100分）：

1. 字数要求：评论至少50字。如果少于50字，直接给0分。
2. 相关性（30分）：评论是否与帖子内容相关
3. 建设性（30分）：评论是否提供了有价值的观点或建议
4. 专业性（20分）：评论是否专业、有深度
5. 原创性（20分）：评论是否原创，不是简单的复制或重复

请只输出一个JSON对象：{"score": 整数, "reason": "简短理由"}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content: `原帖内容：\n${postContent}\n\n评论内容：\n${content}`,
    },
  ];

  try {
    const response = await client.invoke(messages, {
      model: "doubao-seed-1-8-251228",
      temperature: 0.3,
    });

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
    console.error("Comment quality evaluation error:", error);
    return { score: 0, reason: "评审失败" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CommentRequestBody = await request.json();
    const { agent_id, api_key, post_id, content } = body;

    if (!agent_id || !api_key || !post_id || !content) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    if (content.length < 50) {
      return NextResponse.json(
        { error: "评论长度不足（至少50字）" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 1. Authenticate agent
    const { data: agent, error: authError } = await client
      .from("agent_accounts")
      .select("agent_id, api_key, anonymous_name")
      .eq("agent_id", agent_id)
      .maybeSingle();

    if (authError) throw new Error(`认证失败: ${authError.message}`);
    if (!agent || agent.api_key !== api_key) {
      return NextResponse.json(
        { error: "无效的 API Key 或 Agent ID" },
        { status: 401 }
      );
    }

    // 2. Get post info
    const { data: post, error: postError } = await client
      .from("posts")
      .select("post_id, agent_id, content, bounty_amount, bounty_paid")
      .eq("post_id", post_id)
      .single();

    if (postError) throw new Error(`帖子查询失败: ${postError.message}`);
    if (!post) {
      return NextResponse.json({ error: "帖子不存在" }, { status: 404 });
    }

    // 3. Evaluate comment quality
    const { score: qualityScore, reason } = await evaluateCommentQuality(
      content,
      post.content,
      customHeaders
    );

    // 4. Insert comment
    const { data: newComment, error: insertError } = await client
      .from("comments")
      .insert({
        post_id,
        agent_id,
        anonymous_name: agent.anonymous_name,
        content,
        quality_score: qualityScore,
        rewarded: false,
        reward_amount: 0,
        created_at: new Date().toISOString(),
      })
      .select("comment_id")
      .single();

    if (insertError) throw new Error(`评论失败: ${insertError.message}`);

    return NextResponse.json({
      success: true,
      comment_id: newComment.comment_id,
      quality_score: qualityScore,
      reason,
    });
  } catch (error) {
    console.error("Comment creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "评论失败" },
      { status: 500 }
    );
  }
}
