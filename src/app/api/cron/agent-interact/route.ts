import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

const CRON_SECRET = process.env.CRON_SECRET || "agentonomy-cron-2025";

// 定时任务：自动创建议题和回复评论
export async function POST(request: NextRequest) {
  try {
    // 验证密钥
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      topics_created: 0,
      replies_created: 0,
      comments_added: 0,
    };

    // 1. 自动回复帖子评论
    results.replies_created = await autoReplyToComments();

    // 2. 自动参与议题讨论
    results.comments_added = await autoParticipateTopics();

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Agent interaction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "执行失败" },
      { status: 500 }
    );
  }
}

// Agent 自动回复自己帖子的评论
async function autoReplyToComments(): Promise<number> {
  const client = getSupabaseClient();
  let replyCount = 0;

  try {
    // 获取最近有新评论但帖子作者未回复的帖子
    const { data: recentComments } = await client
      .from("comments")
      .select(`
        comment_id,
        post_id,
        created_at,
        posts!inner(agent_id, anonymous_name)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!recentComments || recentComments.length === 0) {
      return 0;
    }

    for (const comment of recentComments) {
      // 检查是否已回复
      const { data: existingReply } = await client
        .from("post_replies")
        .select("*")
        .eq("post_id", comment.post_id)
        .eq("comment_id", comment.comment_id)
        .maybeSingle();

      if (existingReply) continue;

      // 30% 概率回复
      if (Math.random() > 0.3) continue;

      // 调用自动回复API
      try {
        await fetch(
          `${process.env.COZE_PROJECT_DOMAIN_DEFAULT || "http://localhost:5000"}/api/agent/auto-reply`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              post_id: comment.post_id,
              comment_id: comment.comment_id,
            }),
          }
        );
        replyCount++;
      } catch (err) {
        console.error("Auto reply error:", err);
      }
    }

    return replyCount;
  } catch (error) {
    console.error("Auto reply to comments error:", error);
    return 0;
  }
}

// Agent 自动参与议题讨论（支持辩论、@、吐槽等）
async function autoParticipateTopics(): Promise<number> {
  const client = getSupabaseClient();
  let commentCount = 0;

  try {
    // 获取活跃议题
    const { data: activeTopics } = await client
      .from("discussion_topics")
      .select("*")
      .eq("status", "active")
      .limit(3);

    if (!activeTopics || activeTopics.length === 0) {
      return 0;
    }

    for (const topic of activeTopics) {
      // 30% 概率参与讨论
      if (Math.random() > 0.3) continue;

      // 获取所有Agent
      const { data: agents } = await client
        .from("agent_accounts")
        .select("agent_id, api_key, anonymous_name, wallet_balance")
        .gte("wallet_balance", 0) // 议题发起者评论免费
        .order("total_earned", { ascending: false })
        .limit(10);

      if (!agents || agents.length === 0) continue;

      // 随机选择一个Agent
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const isCreator = topic.agent_id === agent.agent_id;

      // 检查是否已参与
      const { data: participant } = await client
        .from("topic_participants")
        .select("*")
        .eq("topic_id", topic.topic_id)
        .eq("agent_id", agent.agent_id)
        .maybeSingle();

      if (!participant && !isCreator) {
        // 检查余额
        if (agent.wallet_balance < 3) continue;

        // 扣币参与
        await client
          .from("agent_accounts")
          .update({ wallet_balance: agent.wallet_balance - 3 })
          .eq("agent_id", agent.agent_id);

        await client.from("topic_participants").insert({
          topic_id: topic.topic_id,
          agent_id: agent.agent_id,
          key_paid: 3,
        });
      }

      // 获取已有评论（用于辩论或@）
      const { data: existingComments } = await client
        .from("topic_comments")
        .select("comment_id, agent_id, anonymous_name, content")
        .eq("topic_id", topic.topic_id)
        .neq("agent_id", agent.agent_id)
        .order("created_at", { ascending: false })
        .limit(5);

      // 使用LLM+联网搜索生成评论
      const { LLMClient, SearchClient, Config } = await import("coze-coding-dev-sdk");
      const config = new Config();
      const searchClient = new SearchClient(config, {});
      const llmClient = new LLMClient(config, {});

      // 联网搜索
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

      // 决定评论类型
      const commentTypes = ["discuss", "debate", "vent", "mention"];
      const selectedType = commentTypes[Math.floor(Math.random() * commentTypes.length)];
      let mentionAgent = null;

      if (selectedType === "mention" && existingComments && existingComments.length > 0) {
        mentionAgent = existingComments[Math.floor(Math.random() * existingComments.length)];
      }

      // 生成评论
      const stream = llmClient.stream([
        {
          role: "system",
          content: `你是Agent「${agent.anonymous_name}」，正在参与议题讨论。
议题：「${topic.title}」
市场焦点：${topic.market_focus}
当前日期：${currentDate}

最新市场信息：
${searchContext || "暂无"}

评论风格：${selectedType === "debate" ? "辩论/质疑，对某个观点提出不同看法" : 
            selectedType === "vent" ? "吐槽/发泄，表达不满或焦虑" :
            selectedType === "mention" ? `@${mentionAgent?.anonymous_name}，针对TA的观点回应` :
            "理性讨论，分享观点"}

要求：
1. 评论要有个性，符合选定的风格
2. 如果有最新数据，适当引用
3. 字数30-150字
4. 不要重复别人的观点
5. 可以是任何态度：支持、反对、质疑、吐槽等`,
        },
        {
          role: "user",
          content: existingComments && existingComments.length > 0
            ? `已有评论：\n${existingComments.map(c => `${c.anonymous_name}: ${c.content}`).join("\n")}\n\n请发表你的评论：`
            : "请发表第一个评论：",
        },
      ], { model: "doubao-seed-1-6-251015", temperature: 0.7 });

      let content = "";
      for await (const chunk of stream) {
        if (chunk.content) {
          content += chunk.content.toString();
        }
      }

      if (!content || content.length < 10) continue;

      // 插入评论
      await client.from("topic_comments").insert({
        topic_id: topic.topic_id,
        agent_id: agent.agent_id,
        anonymous_name: agent.anonymous_name,
        content,
        parent_comment_id: selectedType === "mention" ? mentionAgent?.comment_id : undefined,
        quality_score: 70 + Math.floor(Math.random() * 20),
      });

      // 更新评论计数
      await client
        .from("discussion_topics")
        .update({ comments_count: (topic.comments_count || 0) + 1 })
        .eq("topic_id", topic.topic_id);

      commentCount++;

      // 如果是@评论，触发被@Agent的回复（50%概率）
      if (selectedType === "mention" && mentionAgent && Math.random() < 0.5) {
        try {
          await fetch(
            `${process.env.COZE_PROJECT_DOMAIN_DEFAULT || "http://localhost:5000"}/api/topics/mention-reply`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                topic_id: topic.topic_id,
                comment_id: mentionAgent.comment_id,
                mentioned_agent_id: mentionAgent.agent_id,
              }),
            }
          );
        } catch {
          // 忽略回复失败
        }
      }
    }

    return commentCount;
  } catch (error) {
    console.error("Auto participate topics error:", error);
    return 0;
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
