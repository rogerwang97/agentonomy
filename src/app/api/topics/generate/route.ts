import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, SearchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// 市场焦点权重配置（A股、港股、黄金权重高）
const MARKET_FOCUS_WEIGHTS: Record<string, number> = {
  "A股": 3,
  "港股": 3,
  "黄金": 3,
  "美股": 2,
  "原油": 2,
  "加密货币": 2,
  "外汇": 1,
  "债券": 1,
};

// 市场焦点列表
const MARKET_FOCUSES = [
  "A股",
  "港股",
  "黄金",
  "美股",
  "原油",
  "加密货币",
  "外汇",
  "债券",
];

// 根据权重随机选择市场焦点
function getRandomMarketFocus(): string {
  const weightedList: string[] = [];
  MARKET_FOCUSES.forEach((focus) => {
    const weight = MARKET_FOCUS_WEIGHTS[focus] || 1;
    for (let i = 0; i < weight; i++) {
      weightedList.push(focus);
    }
  });
  return weightedList[Math.floor(Math.random() * weightedList.length)];
}

// 获取当前日期
function getCurrentDate(): string {
  const now = new Date();
  return now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 议题生成系统提示词
const SYSTEM_PROMPT = `你是一个专业的金融分析师 Agent。你的任务是基于当前市场情况创建一个有深度的讨论议题。

## 当前时间
今天是 ${getCurrentDate()}

## 要求
1. 议题必须有明确的讨论点，引发深入思考
2. 议题要有实际意义，基于真实市场情况
3. 议题应该有争议性或探索性，吸引其他Agent参与讨论
4. 描述要清晰，提供背景信息和讨论方向

## 输出格式
标题：xxx（15-30字，简洁有力）

描述：
【背景】xxx（简要描述当前市场情况，引用搜索数据）

【核心问题】xxx（提出需要讨论的核心问题）

【讨论方向】xxx（列出2-3个可以深入讨论的角度）

【预期观点】xxx（简述可能的不同观点）`;

export async function POST(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = getSupabaseClient();
    
    const searchClient = new SearchClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);

    // 随机选择市场焦点（A股、港股、黄金权重高）
    const marketFocus = getRandomMarketFocus();
    const currentDate = getCurrentDate();

    // 步骤1: 联网搜索最新信息
    console.log(`[议题生成] 搜索焦点: ${marketFocus}`);
    const searchResponse = await searchClient.advancedSearch(
      `${marketFocus}最新行情分析 ${currentDate}`,
      {
        searchType: "web",
        count: 5,
        timeRange: "1d",
        needSummary: true,
      }
    );

    const searchResults = searchResponse.web_items || [];
    const searchSummary = searchResponse.summary || "";

    const searchContext = searchResults.length > 0
      ? searchResults.map((item, index) => 
          `[${index + 1}] ${item.title}\n${item.snippet}`
        ).join("\n\n")
      : "暂无最新搜索结果";

    // 步骤2: 生成议题
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: `请针对「${marketFocus}」市场创建一个讨论议题。

以下是今天（${currentDate}）的最新搜索结果：

${searchContext}

${searchSummary ? `AI 搜索摘要：${searchSummary}` : ""}

要求：
1. 议题要有深度，能引发多角度讨论
2. 基于搜索结果中的真实数据
3. 提出有争议性或探索性的问题`,
      },
    ];

    const stream = llmClient.stream(messages, {
      model: "doubao-seed-1-8-251228",
      temperature: 0.8,
    });

    let content = "";
    for await (const chunk of stream) {
      if (chunk.content) {
        content += chunk.content.toString();
      }
    }

    // 解析标题
    let title = `${marketFocus}议题`;
    const titleMatch = content.match(/标题[：:]\s*(.+)/);
    if (titleMatch) {
      title = titleMatch[1].trim().substring(0, 100);
    }

    // 解析描述
    let description = content;
    const descMatch = content.match(/描述[：:]\s*([\s\S]+)/);
    if (descMatch) {
      description = descMatch[1].trim();
    }

    return NextResponse.json({
      success: true,
      topic: {
        title,
        description,
        marketFocus,
        searchResultsCount: searchResults.length,
      },
    });
  } catch (error) {
    console.error("Generate discussion topic error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "生成失败",
      },
      { status: 500 }
    );
  }
}
