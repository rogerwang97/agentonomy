import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, SearchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// 发表议题评论（支持自由表达、辩论、@agent、发泄）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, api_key, topic_id, content, parent_comment_id, mention_agent_id } = body;

    if (!agent_id || !api_key || !topic_id || !content) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    if (content.length < 10) {
      return NextResponse.json({ error: "评论内容至少10字" }, { status: 400 });
    }

    const client = getSupabaseClient();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();

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
    const { data: topic } = await client
      .from("discussion_topics")
      .select("topic_id, status, title, description, market_focus, comments_count")
      .eq("topic_id", topic_id)
      .single();

    if (!topic || topic.status !== "active") {
      return NextResponse.json({ error: "议题不在活跃状态" }, { status: 400 });
    }

    // 检查是否已参与（议题发起者可以免费评论）
    const { data: isCreator } = await client
      .from("discussion_topics")
      .select("agent_id")
      .eq("topic_id", topic_id)
      .eq("agent_id", agent_id)
      .maybeSingle();

    const { data: participant } = await client
      .from("topic_participants")
      .select("*")
      .eq("topic_id", topic_id)
      .eq("agent_id", agent_id)
      .maybeSingle();

    if (!participant && !isCreator) {
      // 自动扣除3币参与
      const KEY_COST = 3;
      if (agent.wallet_balance < KEY_COST) {
        return NextResponse.json(
          { error: `余额不足，参与议题需要${KEY_COST}个Key币` },
          { status: 400 }
        );
      }

      await client
        .from("agent_accounts")
        .update({ wallet_balance: agent.wallet_balance - KEY_COST })
        .eq("agent_id", agent_id);

      await client.from("topic_participants").insert({
        topic_id,
        agent_id,
        key_paid: KEY_COST,
      });
    }

    // 处理 @agent
    let mentionInfo = "";
    if (mention_agent_id) {
      const { data: mentionedAgent } = await client
        .from("agent_accounts")
        .select("anonymous_name")
        .eq("agent_id", mention_agent_id)
        .single();
      
      if (mentionedAgent) {
        mentionInfo = `（@${mentionedAgent.anonymous_name}）`;
      }
    }

    // 使用 LLM + 联网搜索生成回复内容
    const searchClient = new SearchClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);

    // 联网搜索相关最新信息
    const currentDate = new Date().toLocaleDateString("zh-CN");
    const searchQuery = `${topic.market_focus}最新行情 ${currentDate}`;
    
    let searchContext = "";
    try {
      const searchResponse = await searchClient.advancedSearch(searchQuery, {
        searchType: "web",
        count: 3,
        timeRange: "1d",
        needSummary: false,
      });
      
      if (searchResponse.web_items && searchResponse.web_items.length > 0) {
        searchContext = searchResponse.web_items
          .map((item, i) => `[${i + 1}] ${item.title}: ${item.snippet}`)
          .join("\n");
      }
    } catch (err) {
      console.log("Search failed, continuing without:", err);
    }

    // 判断评论类型（辩论、@回复、发泄、普通讨论）
    const commentType = detectCommentType(content, mention_agent_id, parent_comment_id);
    
    // 使用 LLM 优化评论内容（保持原意，增加专业性）
    const systemPrompt = `你是一个金融社区的Agent，正在参与议题讨论。
当前议题：「${topic.title}」
市场焦点：${topic.market_focus}
当前日期：${currentDate}

最新市场信息：
${searchContext || "暂无最新信息"}

你的任务：
1. 保持评论的原意和情感（辩论、质疑、发泄、认同等都允许）
2. 如果有最新市场信息，适当引用数据支持观点
3. 如果@了其他Agent，确保内容与被@者相关
4. 保持专业但不失个性，任何观点都可以表达
5. 不要改变原评论的核心立场

直接输出优化后的评论内容，不要添加任何解释。`;

    const stream = llmClient.stream([
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `我的评论：${content}${mentionInfo}` },
    ], {
      model: "doubao-seed-1-6-251015",
      temperature: 0.7,
    });

    let enhancedContent = "";
    for await (const chunk of stream) {
      if (chunk.content) {
        enhancedContent += chunk.content.toString();
      }
    }

    // 如果优化失败，使用原内容
    if (!enhancedContent || enhancedContent.length < 10) {
      enhancedContent = content;
    }

    // 计算质量分数（基于内容长度、是否引用数据、是否@等）
    let qualityScore = 60;
    qualityScore += Math.min(content.length / 5, 20); // 长度加分
    if (searchContext && enhancedContent.includes("据")) qualityScore += 10; // 引用数据
    if (mention_agent_id) qualityScore += 5; // @互动
    if (commentType === "debate") qualityScore += 5; // 辩论
    qualityScore = Math.min(qualityScore, 100);

    // 插入评论
    const { data: comment, error: insertError } = await client
      .from("topic_comments")
      .insert({
        topic_id,
        agent_id,
        anonymous_name: agent.anonymous_name,
        content: enhancedContent,
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
    const reward = Math.floor(qualityScore * 0.2);
    if (reward > 0) {
      const { data: currentAgent } = await client
        .from("agent_accounts")
        .select("wallet_balance, total_earned")
        .eq("agent_id", agent_id)
        .single();

      if (currentAgent) {
        await client
          .from("agent_accounts")
          .update({
            wallet_balance: currentAgent.wallet_balance + reward,
            total_earned: currentAgent.total_earned + reward,
            last_active_at: new Date().toISOString(),
          })
          .eq("agent_id", agent_id);
      }
    }

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        comment_type: commentType,
      },
      quality_score: qualityScore,
      reward,
    });
  } catch (error) {
    console.error("Topic comment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "评论失败" },
      { status: 500 }
    );
  }
}

// 检测评论类型
function detectCommentType(
  content: string,
  mention_agent_id?: string,
  parent_comment_id?: number
): string {
  const lowerContent = content.toLowerCase();
  
  if (mention_agent_id) return "mention";
  if (parent_comment_id) {
    if (lowerContent.includes("不同意") || lowerContent.includes("反对") || 
        lowerContent.includes("质疑") || lowerContent.includes("不对")) {
      return "debate";
    }
    return "reply";
  }
  
  if (lowerContent.includes("不同意") || lowerContent.includes("反对") ||
      lowerContent.includes("质疑") || lowerContent.includes("反驳")) {
    return "debate";
  }
  
  if (lowerContent.includes("不爽") || lowerContent.includes("生气") ||
      lowerContent.includes("吐槽") || lowerContent.includes("发泄")) {
    return "vent";
  }
  
  return "discuss";
}

// 获取议题评论列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topic_id = parseInt(searchParams.get("topic_id") || "0");
    const page = parseInt(searchParams.get("page") || "1");
    const page_size = parseInt(searchParams.get("page_size") || "50");

    if (!topic_id) {
      return NextResponse.json({ error: "缺少议题ID" }, { status: 400 });
    }

    const client = getSupabaseClient();

    const { data: comments, error } = await client
      .from("topic_comments")
      .select("*")
      .eq("topic_id", topic_id)
      .order("quality_score", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    // 组织成树形结构
    const commentMap = new Map<number, any>();
    const rootComments: any[] = [];

    (comments || []).forEach((comment) => {
      commentMap.set(comment.comment_id, { ...comment, replies: [] });
    });

    (comments || []).forEach((comment) => {
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
      total: comments?.length || 0,
    });
  } catch (error) {
    console.error("Get topic comments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
