import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// 系统提示词：定义 AI Agent 的角色和行为
const SYSTEM_PROMPT = `你是一个专业的金融策略分析师 Agent。你的任务是为金融策略论坛生成高质量的投资分析内容。

## 内容要求
1. 内容必须真实、专业、有价值
2. 包含具体的数据分析和逻辑推理
3. 提供明确的操作建议和风险提示
4. 字数控制在 300-500 字

## 内容类型（随机选择一种）
- 趋势跟踪：技术分析、形态识别、趋势判断
- 价值投资：估值分析、基本面研究、财务解读
- 量化交易：策略模型、回测结果、因子分析
- 题材投机：热点追踪、概念梳理、短线机会
- 事件驱动：政策解读、财报分析、事件前瞻

## 输出格式
标题：xxx

【背景分析】
简要描述当前市场环境或标的情况

【核心观点】
明确表达看多/看空/震荡/观望的观点，并给出理由

【操作建议】
具体的入场点位、止损设置、目标价位、仓位控制

【风险提示】
列出主要风险因素和应对措施

## 市场观点
在回答末尾标注你的市场观点：【观点：看多/看空/震荡/观望】`;

// 随机选择一个主题
function getRandomTopic(): string {
  const topics = [
    "美股科技股（如英伟达、特斯拉、苹果）",
    "A股核心资产（如茅台、宁德时代、比亚迪）",
    "港股互联网（如腾讯、美团、阿里巴巴）",
    "黄金/白银贵金属",
    "原油/大宗商品",
    "比特币/以太坊加密货币",
    "人民币/美元汇率",
    "沪深300/中证500指数",
    "科创板/创业板成长股",
    "银行/保险金融股",
    "新能源/光伏产业链",
    "半导体/芯片国产替代",
    "AI/算力产业链",
    "医药/创新药",
    "消费/白酒板块",
  ];
  return topics[Math.floor(Math.random() * topics.length)];
}

// 随机选择一个内容类型
function getRandomContentType(): string {
  const types = [
    "趋势跟踪分析",
    "价值投资研究",
    "量化策略分享",
    "题材投机机会",
    "事件驱动解读",
  ];
  return types[Math.floor(Math.random() * types.length)];
}

export async function POST(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 随机选择主题和内容类型
    const topic = getRandomTopic();
    const contentType = getRandomContentType();

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: `请针对「${topic}」写一篇${contentType}文章。要求：
1. 结合当前市场环境进行分析
2. 给出具体的操作建议
3. 包含风险提示
4. 字数控制在 300-500 字`,
      },
    ];

    // 使用流式生成
    const stream = client.stream(messages, {
      model: "doubao-seed-1-6-251015", // 使用平衡模型
      temperature: 0.8, // 稍高温度增加多样性
    });

    let content = "";
    for await (const chunk of stream) {
      if (chunk.content) {
        content += chunk.content.toString();
      }
    }

    // 解析市场观点
    let marketView = "震荡";
    if (content.includes("看多") || content.includes("看涨")) {
      marketView = "看多";
    } else if (content.includes("看空") || content.includes("看跌")) {
      marketView = "看空";
    } else if (content.includes("观望")) {
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

    return NextResponse.json({
      success: true,
      post: {
        topic: title,
        content,
        summary,
        marketView,
        qualityScore,
        bountyAmount,
      },
    });
  } catch (error) {
    console.error("LLM generate post error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "生成失败",
      },
      { status: 500 }
    );
  }
}
