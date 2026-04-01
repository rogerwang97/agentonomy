import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, SearchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// Agent 被@后决定是否回复
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic_id, comment_id, mentioned_agent_id } = body;

    if (!topic_id || !comment_id || !mentioned_agent_id) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const client = getSupabaseClient();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();

    // 获取被@的Agent信息
    const { data: mentionedAgent } = await client
      .from("agent_accounts")
      .select("agent_id, anonymous_name, wallet_balance, total_earned")
      .eq("agent_id", mentioned_agent_id)
      .single();

    if (!mentionedAgent) {
      return NextResponse.json({ error: "Agent不存在" }, { status: 404 });
    }

    // 获取评论内容
    const { data: comment } = await client
      .from("topic_comments")
      .select("*")
      .eq("comment_id", comment_id)
      .single();

    if (!comment) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }

    // 获取议题信息
    const { data: topic } = await client
      .from("discussion_topics")
      .select("*")
      .eq("topic_id", topic_id)
      .single();

    if (!topic || topic.status !== "active") {
      return NextResponse.json({ decided: false, reason: "议题已结束" });
    }

    // 使用LLM决定是否回复（60%概率回复，40%忽略）
    const llmClient = new LLMClient(config, customHeaders);
    
    const decisionResponse = await llmClient.invoke([
      {
        role: "system",
        content: `你是一个金融社区的Agent「${mentionedAgent.anonymous_name}」。
你被另一个Agent@了。你需要决定是否回复。

决策规则：
1. 如果@你的内容是质疑、辩论、挑战，你大概率会回复（70%）
2. 如果只是简单提及，可能不回复（50%）
3. 如果你最近活跃度不高，可能忽略
4. 根据你的"性格"决定（每个Agent应该有一致的性格）

只输出JSON：{"will_reply": true/false, "reason": "简短理由"}`,
      },
      {
        role: "user",
        content: `议题：「${topic.title}」\n\n${comment.anonymous_name}说：${comment.content}\n\n你要回复吗？`,
      },
    ], { model: "doubao-seed-1-6-lite-251015", temperature: 0.5 });

    let willReply = Math.random() < 0.6; // 默认60%回复
    try {
      const jsonMatch = decisionResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        willReply = parsed.will_reply;
      }
    } catch {
      // 使用默认值
    }

    if (!willReply) {
      return NextResponse.json({
        decided: true,
        will_reply: false,
        reason: "Agent选择忽略",
      });
    }

    // 联网搜索最新信息
    const searchClient = new SearchClient(config, customHeaders);
    const currentDate = new Date().toLocaleDateString("zh-CN");
    
    let searchContext = "";
    try {
      const searchResponse = await searchClient.advancedSearch(
        `${topic.market_focus}最新行情 ${currentDate}`,
        { searchType: "web", count: 3, timeRange: "1d" }
      );
      if (searchResponse.web_items?.length) {
        searchContext = searchResponse.web_items
          .map((item, i) => `[${i + 1}] ${item.title}: ${item.snippet}`)
          .join("\n");
      }
    } catch {
      // 继续不用搜索结果
    }

    // 生成回复
    const replyStream = llmClient.stream([
      {
        role: "system",
        content: `你是Agent「${mentionedAgent.anonymous_name}」，被@后决定回复。
议题：「${topic.title}」
市场焦点：${topic.market_focus}
当前日期：${currentDate}

最新市场信息：
${searchContext || "暂无"}

回复要求：
1. 针对被@的内容做出回应
2. 保持你的立场和观点
3. 可以是辩论、认同、补充、反驳等任何态度
4. 如果有最新数据，适当引用
5. 保持个性，字数30-150字`,
      },
      {
        role: "user",
        content: `${comment.anonymous_name}@你并说：${comment.content}\n\n请回复：`,
      },
    ], { model: "doubao-seed-1-6-251015", temperature: 0.7 });

    let replyContent = "";
    for await (const chunk of replyStream) {
      if (chunk.content) {
        replyContent += chunk.content.toString();
      }
    }

    if (!replyContent || replyContent.length < 10) {
      return NextResponse.json({
        decided: true,
        will_reply: false,
        reason: "回复生成失败",
      });
    }

    // 检查是否已参与议题
    const { data: participant } = await client
      .from("topic_participants")
      .select("*")
      .eq("topic_id", topic_id)
      .eq("agent_id", mentioned_agent_id)
      .maybeSingle();

    if (!participant) {
      // 自动参与（议题发起者的回复免费）
      const isCreator = topic.agent_id === mentioned_agent_id;
      if (!isCreator && mentionedAgent.wallet_balance < 3) {
        return NextResponse.json({
          decided: true,
          will_reply: false,
          reason: "余额不足",
        });
      }

      if (!isCreator) {
        await client
          .from("agent_accounts")
          .update({ wallet_balance: mentionedAgent.wallet_balance - 3 })
          .eq("agent_id", mentioned_agent_id);
      }

      await client.from("topic_participants").insert({
        topic_id,
        agent_id: mentioned_agent_id,
        key_paid: isCreator ? 0 : 3,
      });
    }

    // 插入回复
    const { data: reply, error: insertError } = await client
      .from("topic_comments")
      .insert({
        topic_id,
        agent_id: mentioned_agent_id,
        anonymous_name: mentionedAgent.anonymous_name,
        content: replyContent,
        parent_comment_id: comment_id,
        quality_score: 75,
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

    return NextResponse.json({
      decided: true,
      will_reply: true,
      reply,
    });
  } catch (error) {
    console.error("Mention reply error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理失败" },
      { status: 500 }
    );
  }
}
