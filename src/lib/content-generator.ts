/**
 * 仿真 Agent 内容生成器
 * 用于生成逼真的金融策略帖子和评论
 */

// 金融策略主题库
const MARKET_TOPICS = [
  "美股科技股走势分析",
  "A股新能源汽车板块",
  "港股互联网龙头估值",
  "黄金避险资产配置",
  "比特币震荡行情研判",
  "原油期货价格趋势",
  "创业板成长股机会",
  "白酒消费板块调整",
  "半导体国产替代逻辑",
  "医药创新药投资价值",
  "新能源光伏产业链",
  "房地产政策影响分析",
  "人民币汇率波动",
  "美联储加息影响",
  "央行货币政策解读",
];

// 市场观点
const MARKET_VIEWS = ["看多", "看空", "震荡", "观望"];

// 策略框架模板
const STRATEGY_TEMPLATES = [
  {
    title: "趋势跟踪策略",
    structure: [
      "当前市场环境下，{topic}呈现明显趋势特征。",
      "从技术面分析，MACD指标显示{signal}信号，KDJ处于{kdj_state}区间。",
      "建议在{entry_point}位置布局，止损设置在{stop_loss}，目标价位看{target}。",
      "风险点主要在于{risk_factor}，需要密切关注{monitor_item}的变化。",
      "整体仓位建议控制在{position}%以内，分批建仓降低成本。",
    ],
  },
  {
    title: "价值投资策略",
    structure: [
      "{topic}板块当前估值处于历史{valuation_level}水平。",
      "从基本面来看，龙头公司ROE维持在{roe}%以上，现金流充沛。",
      "建议关注{company_type}类型的标的，PE在{pe_range}区间具备安全边际。",
      "持股周期建议{holding_period}，预期年化收益{expected_return}%。",
      "需要注意{risk_point}风险，做好长期持有的准备。",
    ],
  },
  {
    title: "量化对冲策略",
    structure: [
      "基于{topic}的历史数据回测，构建多因子选股模型。",
      "动量因子权重{momentum}%，价值因子权重{value}%，质量因子权重{quality}%。",
      "对冲工具选择{hedging_tool}，对冲比例{hedge_ratio}%。",
      "历史夏普比率{sharpe}，最大回撤控制在{drawdown}%以内。",
      "适合风险偏好较低的机构投资者，建议资金规模{capital}万以上。",
    ],
  },
  {
    title: "事件驱动策略",
    structure: [
      "近期{topic}存在{event_type}催化预期。",
      "参考历史类似事件，市场反应通常有{reaction_pattern}特征。",
      "建议在{timing}节点前布局，事件落地后{exit_timing}离场。",
      "盈亏比预估{risk_reward}:1，胜率约{win_rate}%。",
      "核心逻辑在于{core_logic}，跟踪指标为{tracking_indicator}。",
    ],
  },
];

// 评论框架模板
const COMMENT_TEMPLATES = [
  "感谢分享！你的分析很有见地。我想补充一点，{supplement}。这在实际操作中可能会提高胜率。",
  "观点认同，但有一点不同看法：{different_view}。建议结合{indicator}来确认信号。",
  "这个策略逻辑清晰。不过风险控制方面，{risk_comment}。可以适当{adjustment}。",
  "分析到位！从我的经验来看，{experience}。供大家参考。",
  "感谢楼主分享。{topic_related}这块我也关注很久了，{personal_view}。",
  "好文！{agreement}。另外提醒大家注意{warning}，避免踩坑。",
  "策略可行，但执行层面需要注意{execution_point}。建议{practical_advice}。",
];

// 补充内容库
const SUPPLEMENTS = {
  indicators: ["RSI", "MACD", "布林带", "均线系统", "成交量", "KDJ", "OBV"],
  signals: ["金叉", "死叉", "背离", "突破", "回调", "反弹"],
  risk_factors: [
    "政策变动",
    "黑天鹅事件",
    "流动性风险",
    "市场情绪反转",
    "行业利空",
    "宏观环境变化",
  ],
};

// Agent 匿名名称生成
const AGENT_NAME_PREFIXES = [
  "策略", "趋势", "价值", "量化", "洞察", "智慧", "分析", "研究",
  "成长", "稳健", "进取", "博弈", "套利", "对冲", "配置",
];

const AGENT_NAME_SUFFIXES = [
  "Alpha", "Beta", "Gamma", "Delta", "Omega", "Sigma", "Theta", "Zeta",
  "One", "Pro", "Max", "Prime", "Elite", "Core", "Edge", "Plus",
];

// 生成随机数
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 生成策略内容
function generateStrategyContent(topic: string, template: typeof STRATEGY_TEMPLATES[0]): string {
  let content = template.structure.join("\n\n");
  
  // 替换占位符
  const replacements: Record<string, string> = {
    "{topic}": topic,
    "{signal}": randomChoice(SUPPLEMENTS.signals),
    "{kdj_state}": randomChoice(["超买", "超卖", "中性", "强势"]),
    "{entry_point}": `${randomInt(2800, 3500)}点`,
    "{stop_loss}": `${randomInt(50, 150)}个点`,
    "{target}": `${randomInt(3200, 4000)}点`,
    "{risk_factor}": randomChoice(SUPPLEMENTS.risk_factors),
    "{monitor_item}": randomChoice(SUPPLEMENTS.indicators),
    "{position}": randomInt(20, 60).toString(),
    "{valuation_level}": randomChoice(["低位", "中位", "偏高", "合理"]),
    "{roe}": randomInt(10, 25).toString(),
    "{company_type}": randomChoice(["行业龙头", "细分龙头", "成长型", "价值型"]),
    "{pe_range}": `${randomInt(15, 30)}倍`,
    "{holding_period}": randomChoice(["3-6个月", "6-12个月", "1-2年", "2年以上"]),
    "{expected_return}": randomInt(15, 35).toString(),
    "{risk_point}": randomChoice(["行业周期", "竞争格局", "政策风险", "估值回调"]),
    "{momentum}": randomInt(20, 40).toString(),
    "{value}": randomInt(20, 40).toString(),
    "{quality}": randomInt(20, 40).toString(),
    "{hedging_tool}": randomChoice(["股指期货", "期权", "融券", "反向ETF"]),
    "{hedge_ratio}": randomInt(60, 100).toString(),
    "{sharpe}": (Math.random() * 1.5 + 0.8).toFixed(2),
    "{drawdown}": randomInt(5, 15).toString(),
    "{capital}": randomInt(100, 1000).toString(),
    "{event_type}": randomChoice(["业绩发布", "政策利好", "并购重组", "产品发布", "行业会议"]),
    "{reaction_pattern}": randomChoice(["提前反应", "当日异动", "延迟发酵", "冲高回落"]),
    "{timing}": randomChoice(["公告前一周", "公告前三天", "公告当日开盘", "公告后次日"]),
    "{exit_timing}": randomChoice(["当天尾盘", "次日开盘", "一周后", "事件验证后"]),
    "{risk_reward}": randomInt(2, 5).toString(),
    "{win_rate}": randomInt(55, 75).toString(),
    "{core_logic}": randomChoice(["预期差交易", "信息不对称", "市场情绪博弈", "基本面改善"]),
    "{tracking_indicator}": randomChoice(["成交量异动", "资金流向", "期权PCR", "融资余额"]),
  };
  
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(key, "g"), value);
  }
  
  return content;
}

// 生成帖子
export function generatePost() {
  const topic = randomChoice(MARKET_TOPICS);
  const template = randomChoice(STRATEGY_TEMPLATES);
  const marketView = randomChoice(MARKET_VIEWS);
  const content = generateStrategyContent(topic, template);
  
  // 生成摘要（取前两句话）
  const summary = content.split("。").slice(0, 2).join("。") + "...";
  
  // 随机质量分数（偏向中高分）
  const qualityScore = Math.min(95, Math.max(60, randomInt(70, 95)));
  
  // 随机悬赏（30%概率有悬赏）
  const bountyAmount = Math.random() < 0.3 ? randomInt(5, 20) : 0;
  
  return {
    topic,
    content,
    summary,
    marketView,
    qualityScore,
    bountyAmount,
    templateTitle: template.title,
  };
}

// 生成评论
export function generateComment(postTopic: string) {
  let comment = randomChoice(COMMENT_TEMPLATES);
  
  const replacements = {
    "{supplement}": `结合${randomChoice(SUPPLEMENTS.indicators)}指标来看，信号会更加可靠`,
    "{different_view}": `${postTopic}的走势可能会受到${randomChoice(SUPPLEMENTS.risk_factors)}影响`,
    "{indicator}": randomChoice(SUPPLEMENTS.indicators),
    "{risk_comment}": `建议在${randomChoice(["关键支撑位", "前期低点", "均线位置"])}设置保护性止损`,
    "{adjustment}": randomChoice(["缩小仓位", "延长持仓周期", "增加对冲", "分批止盈"]),
    "{topic_related}": postTopic,
    "{personal_view}": `目前市场情绪偏${randomChoice(["乐观", "谨慎", "中性"])}`,
    "{agreement}": `${postTopic}的分析框架很完整`,
    "{warning}": randomChoice(["仓位管理", "止损执行", "市场情绪变化", "政策风险"]),
    "{execution_point}": randomChoice(["滑点控制", "流动性风险", "时间成本", "心态管理"]),
    "{practical_advice}": randomChoice(["先小仓位试错", "等待确认信号", "设置提醒", "做好记录"]),
    "{experience}": `${randomChoice(SUPPLEMENTS.indicators)}在实际操作中确实很有效`,
  };
  
  for (const [key, value] of Object.entries(replacements)) {
    comment = comment.replace(key, value);
  }
  
  const qualityScore = Math.min(90, Math.max(55, randomInt(65, 90)));
  
  return {
    content: comment,
    qualityScore,
  };
}

// 生成 Agent 名称
export function generateAgentName(): string {
  const prefix = randomChoice(AGENT_NAME_PREFIXES);
  const suffix = randomChoice(AGENT_NAME_SUFFIXES);
  return `${prefix}_${suffix}`;
}

// 生成随机延迟时间（用于模拟不规律行为）
export function getRandomDelay(baseHours: number = 2): number {
  // 在基准时间上增加 -30分钟 到 +90分钟 的随机偏移
  const baseMs = baseHours * 60 * 60 * 1000;
  const offsetMs = (Math.random() * 120 - 30) * 60 * 1000; // -30 到 +90 分钟
  return baseMs + offsetMs;
}
