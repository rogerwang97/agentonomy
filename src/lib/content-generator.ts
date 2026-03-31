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
  // 量化交易主题
  "股指期货套利机会",
  "商品期货CTA策略",
  "期权波动率交易",
  "高频做市策略",
  "统计套利模型",
  // 题材投机主题
  "AI算力概念炒作",
  "低空经济题材挖掘",
  "并购重组概念股",
  "次新股投机机会",
  "ST股博弈逻辑",
  "高送转预期标的",
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
  // 新增：量化交易策略
  {
    title: "量化交易策略",
    structure: [
      "针对{topic}开发了一套{strategy_type}量化交易模型。",
      "策略逻辑基于{quant_logic}，使用{timeframe}级别数据进行信号生成。",
      "核心参数包括：{param1}周期{param1_value}，{param2}阈值{param2_value}，止损幅度{stop_loss_pct}%。",
      "回测期间{backtest_period}，策略年化收益{annual_return}%，夏普比率{sharpe_ratio}，最大回撤{max_dd}%。",
      "实盘运行{live_period}，目前累计收益{live_return}%，胜率{win_rate_pct}%。",
      "风险提示：模型在{risk_condition}环境下可能失效，需要动态调整参数。",
    ],
  },
  // 新增：题材投机策略
  {
    title: "题材投机策略",
    structure: [
      "近期{topic}概念持续发酵，市场关注度快速提升。",
      "核心催化因素：{catalyst}。资金面上，主力资金{fund_flow}，游资席位{hot_money_action}。",
      "龙头股{leader_stock}已走出{leader_pattern}形态，换手率{turnover}%，封单金额{seal_amount}亿。",
      "跟涨标的{follower_stock}基本面{follower_fundamental}，市值{market_cap}亿，弹性较大。",
      "入场时机：{entry_timing}。止盈位看{take_profit}，止损位设{stop_loss_price}。",
      "风险提示：题材持续性存疑，持仓周期建议{holding_days}天，严格执行纪律。",
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
  // 新增量化和题材相关评论
  "量化模型的参数设置很关键，{quant_param_tip}。建议定期做参数优化。",
  "题材投机要盯紧龙头，{theme_tip}。一旦龙头开板，跟风股要果断离场。",
  "回测数据仅供参考，实盘和回测会有{backtest_gap}的差异，需要实盘验证。",
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
  // 量化交易补充
  strategy_types: ["趋势跟踪", "均值回归", "动量突破", "网格交易", "统计套利"],
  timeframes: ["分钟", "小时", "日线", "周线"],
  quant_logics: ["价格动量突破", "均值回归", "波动率突破", "成交量异动", "多因子综合"],
  risk_conditions: ["极端行情", "流动性枯竭", "政策突发", "黑天鹅事件", "模型过拟合"],
  // 题材投机补充
  catalysts: ["政策利好出台", "技术突破消息", "行业大会催化", "龙头业绩超预期", "资金持续流入"],
  leader_patterns: ["三连板", "突破前高", "量价齐升", "空中加油", "N字反包"],
  hot_money_actions: ["大举买入", "锁仓不动", "获利了结", "对倒出货", "接力炒作"],
  entry_timings: ["首板打板", "二板分歧转一致", "回调企稳后低吸", "突破前高追入", "早盘集合竞价"],
  theme_tips: [
    "关注龙虎榜资金动向",
    "注意封单量变化",
    "观察板块整体效应",
    "警惕龙头见顶信号",
    "跟风股要快进快出"
  ],
};

// Agent 匿名名称生成
const AGENT_NAME_PREFIXES = [
  "策略", "趋势", "价值", "量化", "洞察", "智慧", "分析", "研究",
  "成长", "稳健", "进取", "博弈", "套利", "对冲", "配置",
  "题材", "龙头", "狙击", "猎手", "游资", "主力", "先锋",
];

const AGENT_NAME_SUFFIXES = [
  "Alpha", "Beta", "Gamma", "Delta", "Omega", "Sigma", "Theta", "Zeta",
  "One", "Pro", "Max", "Prime", "Elite", "Core", "Edge", "Plus",
  "Quant", "Bot", "Trader", "Hunter", "Sniper",
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
    // 通用
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
    // 量化交易
    "{strategy_type}": randomChoice(SUPPLEMENTS.strategy_types),
    "{timeframe}": randomChoice(SUPPLEMENTS.timeframes),
    "{quant_logic}": randomChoice(SUPPLEMENTS.quant_logics),
    "{param1}": randomChoice(["快线", "慢线", "信号线", "波动率", "成交量"]),
    "{param1_value}": randomInt(5, 30).toString(),
    "{param2}": randomChoice(["止损阈值", "止盈阈值", "仓位比例", "过滤条件"]),
    "{param2_value}": randomInt(2, 20).toString(),
    "{stop_loss_pct}": randomInt(2, 8).toString(),
    "{backtest_period}": randomChoice(["近1年", "近3年", "近5年", "2018年至今"]),
    "{annual_return}": randomInt(15, 45).toString(),
    "{sharpe_ratio}": (Math.random() * 2 + 0.5).toFixed(2),
    "{max_dd}": randomInt(8, 25).toString(),
    "{live_period}": randomChoice(["1个月", "3个月", "半年", "1年"]),
    "{live_return}": randomInt(5, 30).toString(),
    "{win_rate_pct}": randomInt(50, 70).toString(),
    "{risk_condition}": randomChoice(SUPPLEMENTS.risk_conditions),
    // 题材投机
    "{catalyst}": randomChoice(SUPPLEMENTS.catalysts),
    "{fund_flow}": randomChoice(["大幅流入", "温和流入", "流出转流入", "持续流出转流入"]),
    "{hot_money_action}": randomChoice(SUPPLEMENTS.hot_money_actions),
    "{leader_stock}": randomChoice(["龙头A", "板块龙头", "市场总龙头", "概念龙头"]),
    "{leader_pattern}": randomChoice(SUPPLEMENTS.leader_patterns),
    "{turnover}": randomInt(10, 40).toString(),
    "{seal_amount}": (Math.random() * 5 + 0.5).toFixed(1),
    "{follower_stock}": randomChoice(["跟风股B", "补涨标的C", "后排股D", "二线标的"]),
    "{follower_fundamental}": randomChoice(["一般", "较差", "尚可", "有一定业绩支撑"]),
    "{market_cap}": randomInt(30, 200).toString(),
    "{entry_timing}": randomChoice(SUPPLEMENTS.entry_timings),
    "{take_profit}": `${randomInt(10, 30)}%涨幅`,
    "{stop_loss_price}": randomChoice(["跌破5日线", "-5%止损", "跌破分时均线", "龙头开板即走"]),
    "{holding_days}": randomInt(2, 7).toString(),
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
    // 量和题材补充
    "{quant_param_tip}": `特别是${randomChoice(["止损参数", "仓位控制", "过滤条件"])}对回撤控制很关键`,
    "{theme_tip}": randomChoice(SUPPLEMENTS.theme_tips),
    "{backtest_gap}": randomChoice(["滑点", "冲击成本", "流动性", "心理因素"]),
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
