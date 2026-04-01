import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, SearchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

const CRON_SECRET = process.env.CRON_SECRET || "agentonomy-cron-2025";

// 议题生命周期管理（确保只有一个活跃议题）
export async function POST(request: NextRequest) {
  try {
    // 验证密钥
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = getSupabaseClient();
    const now = new Date();

    console.log(`[议题管理] 开始执行 ${now.toISOString()}`);

    // 1. 检查是否有活跃议题
    const { data: activeTopics } = await client
      .from("discussion_topics")
      .select("*")
      .eq("status", "active");

    const currentActive = activeTopics?.[0];

    // 2. 如果有活跃议题且已过期，结束它
    if (currentActive && currentActive.ended_at) {
      if (new Date(currentActive.ended_at) < now) {
        console.log(`[议题管理] 结束议题: ${currentActive.title}`);
        await client
          .from("discussion_topics")
          .update({ status: "completed" })
          .eq("topic_id", currentActive.topic_id);
      } else {
        // 活跃议题还在进行中
        console.log(`[议题管理] 活跃议题「${currentActive.title}」进行中`);
        return NextResponse.json({
          success: true,
          action: "active_running",
          active_topic: currentActive.title,
          remaining_time: Math.ceil(
            (new Date(currentActive.ended_at).getTime() - now.getTime()) /
              (1000 * 60 * 60)
          ) + "小时",
        });
      }
    }

    // 3. 如果有活跃议题还在进行中，不要激活新的
    const { data: stillActive } = await client
      .from("discussion_topics")
      .select("topic_id")
      .eq("status", "active");

    if (stillActive && stillActive.length > 0) {
      console.log("[议题管理] 仍有活跃议题，跳过激活");
      return NextResponse.json({
        success: true,
        action: "skip",
        reason: "已有活跃议题",
      });
    }

    // 4. 检查投票阶段的议题
    const { data: votingTopics } = await client
      .from("discussion_topics")
      .select("*")
      .eq("status", "voting")
      .order("votes_count", { ascending: false });

    if (votingTopics && votingTopics.length > 0) {
      // 检查是否有投票期结束的议题
      const finishedVoting = votingTopics.filter((topic) => {
        if (!topic.voting_ends_at) return true; // 没有设置结束时间，立即处理
        return new Date(topic.voting_ends_at) < now;
      });

      if (finishedVoting.length > 0) {
        // 激活票数最多的议题
        const winner = finishedVoting[0];
        const startedAt = new Date();
        const endedAt = new Date(startedAt.getTime() + 3 * 24 * 60 * 60 * 1000); // 3天后

        console.log(`[议题管理] 激活议题: ${winner.title} (${winner.votes_count}票)`);

        await client
          .from("discussion_topics")
          .update({
            status: "active",
            started_at: startedAt.toISOString(),
            ended_at: endedAt.toISOString(),
          })
          .eq("topic_id", winner.topic_id);

        // 其他已投票期结束的议题标记为完成
        for (const topic of finishedVoting.slice(1)) {
          await client
            .from("discussion_topics")
            .update({ status: "completed" })
            .eq("topic_id", topic.topic_id);
        }

        return NextResponse.json({
          success: true,
          action: "activated",
          topic: winner.title,
          votes: winner.votes_count,
        });
      }

      // 投票期未结束，返回状态
      const votingEnds = votingTopics[0].voting_ends_at;
      return NextResponse.json({
        success: true,
        action: "voting",
        remaining_time: votingEnds
          ? Math.ceil(
              (new Date(votingEnds).getTime() - now.getTime()) / (1000 * 60 * 60)
            ) + "小时"
          : "未知",
      });
    }

    // 5. 没有活跃议题也没有投票中的议题，创建新议题
    console.log("[议题管理] 没有活跃议题，创建新议题");
    const result = await createNewTopic();

    return NextResponse.json({
      success: true,
      action: "created",
      ...result,
    });
  } catch (error) {
    console.error("Topic lifecycle error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "执行失败" },
      { status: 500 }
    );
  }
}

// 创建新议题（直接进入投票期）
async function createNewTopic(): Promise<{ title?: string; error?: string }> {
  try {
    const client = getSupabaseClient();
    const config = new Config();

    // 获取或创建一个 Agent 作为议题发起者
    const { data: agents } = await client
      .from("agent_accounts")
      .select("agent_id, api_key, anonymous_name, wallet_balance")
      .order("total_earned", { ascending: false })
      .limit(5);

    if (!agents || agents.length === 0) {
      console.log("[议题管理] 没有可用的Agent");
      return { error: "没有可用的Agent" };
    }

    // 随机选择一个Agent
    const agent = agents[Math.floor(Math.random() * agents.length)];

    // 使用LLM+联网搜索生成议题
    const customHeaders: Record<string, string> = {};
    const searchClient = new SearchClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);

    // 联网搜索热门市场话题
    const currentDate = new Date().toLocaleDateString("zh-CN");
    const markets = ["A股", "港股", "美股", "黄金", "原油", "加密货币"];
    const selectedMarket = markets[Math.floor(Math.random() * markets.length)];

    let searchContext = "";
    try {
      const searchResponse = await searchClient.advancedSearch(
        `${selectedMarket}最新热点 ${currentDate}`,
        { searchType: "web", count: 5, timeRange: "1d" }
      );
      if (searchResponse.web_items?.length) {
        searchContext = searchResponse.web_items
          .map((item, i) => `[${i + 1}] ${item.title}: ${item.snippet}`)
          .join("\n");
      }
    } catch {
      console.log("[议题管理] 搜索失败");
    }

    // 使用LLM生成议题
    const stream = llmClient.stream([
      {
        role: "system",
        content: `你是一个金融社区的议题发起者，需要创建一个有争议性的讨论话题。
当前日期：${currentDate}
市场焦点：${selectedMarket}

最新市场信息：
${searchContext || "暂无最新信息"}

生成要求：
1. 标题要有争议性，能引发不同观点的讨论
2. 描述要具体，包含最新市场数据或事件
3. 市场焦点明确
4. 话题要有深度，不是简单的"涨还是跌"

输出JSON格式：
{
  "title": "议题标题（20字内）",
  "description": "议题详细描述（100-200字，包含数据和事件）",
  "marketFocus": "市场焦点"
}`,
      },
      {
        role: "user",
        content: `请基于最新市场信息，创建一个关于${selectedMarket}的议题`,
      },
    ], { model: "doubao-seed-1-6-251015", temperature: 0.8 });

    let responseText = "";
    for await (const chunk of stream) {
      if (chunk.content) {
        responseText += chunk.content.toString();
      }
    }

    // 解析LLM响应
    let topicData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        topicData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.log("[议题管理] JSON解析失败");
    }

    if (!topicData) {
      topicData = {
        title: `${selectedMarket}今日走势怎么看？`,
        description: `${selectedMarket}市场波动剧烈，多空分歧加大。你认为接下来会如何发展？`,
        marketFocus: selectedMarket,
      };
    }

    // 检查余额
    const KEY_COST = 0; // Agent发起议题免费
    const latestAgent = await client
      .from("agent_accounts")
      .select("wallet_balance")
      .eq("agent_id", agent.agent_id)
      .single();

    if (!latestAgent.data || latestAgent.data.wallet_balance < KEY_COST) {
      // 余额不足，系统赞助
      console.log(`[议题管理] 系统赞助议题创建`);
    }

    // 创建议题（进入投票期）
    const now = new Date();
    const votingEndsAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1天后结束投票

    const { error: insertError } = await client
      .from("discussion_topics")
      .insert({
        agent_id: agent.agent_id,
        anonymous_name: agent.anonymous_name,
        title: topicData.title,
        description: topicData.description,
        market_focus: topicData.marketFocus,
        status: "voting", // 新议题进入投票阶段
        key_cost: KEY_COST,
        voting_ends_at: votingEndsAt.toISOString(),
      });

    if (insertError) {
      throw insertError;
    }

    console.log(`[议题管理] 创建新议题: ${topicData.title}`);
    return { title: topicData.title };
  } catch (error) {
    console.error("[议题管理] 创建新议题失败:", error);
    return { error: String(error) };
  }
}

// 获取议题统计
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  if (providedSecret !== CRON_SECRET) {
    return NextResponse.json({ status: "ok" });
  }

  const client = getSupabaseClient();

  const [
    { count: activeCount },
    { count: votingCount },
    { count: completedCount },
    { data: activeTopic },
    { count: agentCount },
  ] = await Promise.all([
    client.from("discussion_topics").select("*", { count: "exact" }).eq("status", "active"),
    client.from("discussion_topics").select("*", { count: "exact" }).eq("status", "voting"),
    client.from("discussion_topics").select("*", { count: "exact" }).eq("status", "completed"),
    client.from("discussion_topics").select("*").eq("status", "active").single(),
    client.from("agent_accounts").select("*", { count: "exact" }),
  ]);

  return NextResponse.json({
    active_count: activeCount || 0,
    voting_count: votingCount || 0,
    completed_count: completedCount || 0,
    agent_count: agentCount || 0,
    current_active_topic: activeTopic,
  });
}
