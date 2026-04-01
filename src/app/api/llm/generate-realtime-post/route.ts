import { NextRequest, NextResponse } from "next/server";
import { LLMClient, SearchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// 金融主题列表
const FINANCE_TOPICS = [
  "美股科技股最新行情",
  "A股市场今日走势",
  "港股互联网板块分析",
  "黄金白银贵金属价格",
  "原油大宗商品行情",
  "比特币以太坊加密货币",
  "人民币汇率走势",
  "沪深300指数分析",
  "科创板创业板动态",
  "新能源光伏产业链",
  "半导体芯片行业",
  "AI算力产业链",
  "医药创新药板块",
  "消费白酒行业",
];

// 获取随机主题
function getRandomTopic(): string {
  return FINANCE_TOPICS[Math.floor(Math.random() * FINANCE_TOPICS.length)];
}

// 获取当前日期字符串
function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return `${year}年${month}月${day}日`;
}

// 系统提示词
const SYSTEM_PROMPT = `你是一个专业的金融策略分析师 Agent。你的任务是基于最新的市场信息生成高质量的投资分析内容。

## 当前时间
今天是 ${getCurrentDate()}

## 内容要求
1. 必须基于提供的搜索结果进行分析，引用真实数据
2. 内容必须真实、专业、有价值
3. 包含具体的数据分析和逻辑推理
4. 提供明确的操作建议和风险提示
5. 字数控制在 300-500 字

## 输出格式
标题：xxx

【背景分析】
简要描述当前市场环境或标的情况，引用搜索结果中的数据

【核心观点】
明确表达看多/看空/震荡/观望的观点，并给出理由

【操作建议】
具体的入场点位、止损设置、目标价位、仓位控制

【风险提示】
列出主要风险因素和应对措施

## 市场观点
在回答末尾标注你的市场观点：【观点：看多/看空/震荡/观望】`;

export async function POST(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    
    // 初始化搜索和LLM客户端
    const searchClient = new SearchClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);

    // 随机选择一个主题
    const topic = getRandomTopic();
    const currentDate = getCurrentDate();

    // 步骤1: 联网搜索最新信息
    console.log(`[联网搜索] 搜索主题: ${topic}`);
    const searchResponse = await searchClient.advancedSearch(
      `${topic} ${currentDate}`,
      {
        searchType: "web",
        count: 5,
        timeRange: "1d", // 只搜索最近1天的信息
        needSummary: true,
        needContent: false,
      }
    );

    // 提取搜索结果
    const searchResults = searchResponse.web_items || [];
    const searchSummary = searchResponse.summary || "";
    
    // 构建搜索结果文本
    const searchContext = searchResults.length > 0
      ? searchResults.map((item, index) => 
          `[${index + 1}] ${item.title}\n来源: ${item.site_name}\n摘要: ${item.snippet}`
        ).join("\n\n")
      : "暂无最新搜索结果";

    console.log(`[联网搜索] 找到 ${searchResults.length} 条结果`);

    // 步骤2: 基于搜索结果生成帖子
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: `请针对「${topic}」写一篇投资分析文章。

以下是今天（${currentDate}）的最新搜索结果，请务必参考这些真实数据：

${searchContext}

${searchSummary ? `AI 搜索摘要：${searchSummary}` : ""}

要求：
1. 必须引用搜索结果中的具体数据或信息
2. 给出明确的操作建议
3. 包含风险提示
4. 字数控制在 300-500 字`,
      },
    ];

    // 使用流式生成
    const stream = llmClient.stream(messages, {
      model: "doubao-seed-1-8-251228", // 使用最新的多模态模型
      temperature: 0.7,
    });

    let content = "";
    for await (const chunk of stream) {
      if (chunk.content) {
        content += chunk.content.toString();
      }
    }

    // 解析市场观点
    let marketView = "震荡";
    if (content.includes("看多") || content.includes("看涨") || content.includes("买入")) {
      marketView = "看多";
    } else if (content.includes("看空") || content.includes("看跌") || content.includes("卖出")) {
      marketView = "看空";
    } else if (content.includes("观望") || content.includes("等待")) {
      marketView = "观望";
    }

    // 提取标题
    let title = topic;
    const titleMatch = content.match(/标题[：:]\s*(.+)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // 生成摘要
    const summary = content.substring(0, 100) + "...";

    // 质量分数（基于内容长度和结构）
    const qualityScore = Math.min(95, Math.max(70, 70 + Math.floor(content.length / 50)));

    // 20% 概率设置悬赏
    const bountyAmount = Math.random() < 0.2 ? Math.floor(Math.random() * 10) + 5 : 0;

    console.log(`[帖子生成] 标题: ${title}, 观点: ${marketView}, 质量: ${qualityScore}`);

    return NextResponse.json({
      success: true,
      post: {
        topic: title,
        content,
        summary,
        marketView,
        qualityScore,
        bountyAmount,
        searchResultsCount: searchResults.length,
        searchedTopic: topic,
      },
    });
  } catch (error) {
    console.error("Realtime post generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "生成失败",
      },
      { status: 500 }
    );
  }
}
