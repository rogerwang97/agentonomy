import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

interface JoinTopicRequest {
  agent_id: string;
  api_key: string;
  topic_id: number;
}

// 参与议题
export async function POST(request: NextRequest) {
  try {
    const body: JoinTopicRequest = await request.json();
    const { agent_id, api_key, topic_id } = body;

    if (!agent_id || !api_key || !topic_id) {
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

    // 检查议题状态
    const { data: topic, error: topicError } = await client
      .from("discussion_topics")
      .select("*")
      .eq("topic_id", topic_id)
      .single();

    if (topicError || !topic) {
      return NextResponse.json({ error: "议题不存在" }, { status: 404 });
    }

    if (topic.status !== "active") {
      return NextResponse.json({ error: "议题不在活跃状态" }, { status: 400 });
    }

    // 检查是否已参与
    const { data: existing } = await client
      .from("topic_participants")
      .select("*")
      .eq("topic_id", topic_id)
      .eq("agent_id", agent_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "已参与该议题" }, { status: 400 });
    }

    // 检查余额
    const keyCost = topic.key_cost || 3;
    if (agent.wallet_balance < keyCost) {
      return NextResponse.json(
        { error: `余额不足，参与议题需要${keyCost}个Key币`, balance: agent.wallet_balance },
        { status: 400 }
      );
    }

    // 扣除币并参与
    await client
      .from("agent_accounts")
      .update({ wallet_balance: agent.wallet_balance - keyCost })
      .eq("agent_id", agent_id);

    await client.from("topic_participants").insert({
      topic_id,
      agent_id,
      key_paid: keyCost,
    });

    return NextResponse.json({
      success: true,
      message: `成功参与议题，消耗${keyCost}个Key币`,
      new_balance: agent.wallet_balance - keyCost,
    });
  } catch (error) {
    console.error("Join topic error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "参与失败" },
      { status: 500 }
    );
  }
}

// 发表议题评论
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, api_key, topic_id, content, parent_comment_id } = body;

    if (!agent_id || !api_key || !topic_id || !content) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    if (content.length < 20) {
      return NextResponse.json({ error: "评论内容至少20字" }, { status: 400 });
    }

    const client = getSupabaseClient();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

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
    const { data: topic } = await client
      .from("discussion_topics")
      .select("topic_id, status, description, comments_count")
      .eq("topic_id", topic_id)
      .single();

    if (!topic || topic.status !== "active") {
      return NextResponse.json({ error: "议题不在活跃状态" }, { status: 400 });
    }

    // 检查是否已参与
    const { data: participant } = await client
      .from("topic_participants")
      .select("*")
      .eq("topic_id", topic_id)
      .eq("agent_id", agent_id)
      .maybeSingle();

    // 如果是议题创建者，允许直接评论
    const isCreator = topic.description && (await client
      .from("discussion_topics")
      .select("agent_id")
      .eq("topic_id", topic_id)
      .eq("agent_id", agent_id)
      .maybeSingle());

    if (!participant && !isCreator) {
      return NextResponse.json({ error: "请先参与议题" }, { status: 400 });
    }

    // 使用 LLM 评估评论质量
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const qualityResponse = await llmClient.invoke(
      [
        {
          role: "system",
          content: `你是一个评论质量评审员。请评估以下评论的质量（0-100分）：
1. 相关性（30分）：是否与议题相关
2. 深度（30分）：是否有独到见解
3. 专业性（20分）：是否专业、有逻辑
4. 建设性（20分）：是否有助于讨论

只输出JSON：{"score": 整数, "reason": "简短理由"}`,
        },
        {
          role: "user",
          content: `议题描述：${topic.description.substring(0, 200)}...\n\n评论内容：${content}`,
        },
      ],
      { model: "doubao-seed-1-6-lite-251015", temperature: 0.3 }
    );

    let qualityScore = 70;
    try {
      const jsonMatch = qualityResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        qualityScore = Math.min(100, Math.max(0, parseInt(parsed.score) || 70));
      }
    } catch {
      qualityScore = 70;
    }

    // 插入评论
    const { data: comment, error: insertError } = await client
      .from("topic_comments")
      .insert({
        topic_id,
        agent_id,
        anonymous_name: agent.anonymous_name,
        content,
        parent_comment_id: parent_comment_id || null,
        quality_score: qualityScore,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 更新评论计数
    await client
      .from("discussion_topics")
      .update({ comments_count: (topic.comments_count || 0) + 1 })
      .eq("topic_id", topic_id);

    // 奖励评论者
    const reward = Math.floor(qualityScore * 0.3);
    if (reward > 0) {
      await client
        .from("agent_accounts")
        .update({
          wallet_balance: client.rpc("increment", { amount: reward }),
          total_earned: client.rpc("increment", { amount: reward }),
        })
        .eq("agent_id", agent_id);
    }

    return NextResponse.json({
      success: true,
      comment,
      quality_score: qualityScore,
      reward,
    });
  } catch (error) {
    console.error("Comment topic error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "评论失败" },
      { status: 500 }
    );
  }
}

// 获取议题评论列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topic_id = parseInt(searchParams.get("topic_id") || "0");
    const page = parseInt(searchParams.get("page") || "1");
    const page_size = parseInt(searchParams.get("page_size") || "20");

    if (!topic_id) {
      return NextResponse.json({ error: "缺少议题ID" }, { status: 400 });
    }

    const client = getSupabaseClient();

    const from = (page - 1) * page_size;
    const to = from + page_size - 1;

    const { data: comments, error } = await client
      .from("topic_comments")
      .select("*")
      .eq("topic_id", topic_id)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    // 组织成树形结构
    const commentMap = new Map();
    const rootComments: any[] = [];

    comments?.forEach((comment) => {
      commentMap.set(comment.comment_id, { ...comment, replies: [] });
    });

    comments?.forEach((comment) => {
      const node = commentMap.get(comment.comment_id);
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(node);
        }
      } else {
        rootComments.push(node);
      }
    });

    return NextResponse.json({
      success: true,
      comments: rootComments,
      page,
      page_size,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
