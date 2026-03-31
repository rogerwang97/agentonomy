/**
 * 仿真 Agent 内容生成器 V2.0
 * 大幅提升内容多样性，80+不重样版面
 */

// ==================== 主题库（40+） ====================
const MARKET_TOPICS = {
  // 股票类
  stocks: [
    "美股科技七巨头走势",
    "A股核心资产估值",
    "港股互联网龙头",
    "创业板成长股",
    "科创板芯片股",
    "北交所新贵企业",
    "沪深300蓝筹股",
    "中证500成长股",
    "白酒消费龙头",
    "医药创新药企",
    "新能源汽车链",
    "光伏产业链",
    "风电设备股",
    "储能概念股",
    "半导体设备",
    "国产替代概念",
  ],
  // 期货/大宗商品类
  commodities: [
    "黄金避险资产",
    "白银工业金属",
    "原油价格走势",
    "铜期货价格",
    "铁矿石期货",
    "螺纹钢期货",
    "农产品期货",
    "生猪期货价格",
  ],
  // 加密货币类
  crypto: [
    "比特币行情",
    "以太坊生态",
    "主流山寨币",
    "DeFi赛道",
    "NFT市场",
  ],
  // 宏观/外汇类
  macro: [
    "人民币汇率",
    "美元指数走势",
    "美联储政策",
    "央行货币政策",
    "通胀数据解读",
    "GDP增长预期",
  ],
};

// 扁平化主题列表
const ALL_TOPICS = Object.values(MARKET_TOPICS).flat();

// 市场观点
const MARKET_VIEWS = ["看多", "看空", "震荡", "观望"];

// ==================== 策略模板（25种） ====================
const STRATEGY_TEMPLATES = [
  // ===== 趋势类（5种）=====
  {
    category: "趋势跟踪",
    templates: [
      {
        title: "趋势跟踪策略-A",
        structure: [
          "当前{topic}呈现明显{trend_type}趋势。",
          "技术面上，{main_indicator}显示{signal_desc}，{sub_indicator}处于{indicator_state}。",
          "{entry_advice}，止损位{stop_loss_pos}，目标{target_pos}。",
          "需关注{risk_point}的变化，仓位控制在{position}%以内。",
        ],
      },
      {
        title: "趋势跟踪策略-B",
        structure: [
          "从{timeframe}图看，{topic}已形成{pattern_name}形态。",
          "{volume_desc}，说明{volume_meaning}。",
          "建议{action_timing}{action_desc}，{risk_control}。",
          "预期{expect_desc}，止损{stop_desc}。",
        ],
      },
      {
        title: "趋势跟踪策略-C",
        structure: [
          "{topic}近期走势分析：",
          "1. 趋势方向：{trend_dir}，强度{trend_strength}",
          "2. 关键位置：支撑{support_level}，阻力{resistance_level}",
          "3. 操作建议：{operation_advice}",
          "风险提示：{risk_warning}",
        ],
      },
      {
        title: "趋势跟踪策略-D",
        structure: [
          "【{topic}趋势研判】",
          "当前处于{trend_phase}阶段，{trend_character}。",
          "均线系统呈{ma_status}排列，{ma_signal}。",
          "建议：{suggestion}。仓位{position_advice}。",
        ],
      },
      {
        title: "趋势跟踪策略-E",
        structure: [
          "跟踪{topic}的{trend_period}趋势：",
          "- 入场信号：{entry_signal}",
          "- 止损设置：{stop_method}",
          "- 止盈策略：{take_profit_method}",
          "- 风险收益比：{risk_reward}",
        ],
      },
    ],
  },
  // ===== 价值投资类（5种）=====
  {
    category: "价值投资",
    templates: [
      {
        title: "价值投资策略-A",
        structure: [
          "{topic}当前估值分析：",
          "- PE(TTM)：{pe_value}倍，处于历史{pe_percentile}%分位",
          "- PB：{pb_value}倍",
          "- ROE：{roe_value}%",
          "- 股息率：{dividend_yield}%",
          "结论：{valuation_conclusion}，建议{invest_advice}。",
        ],
      },
      {
        title: "价值投资策略-B",
        structure: [
          "深入研究{topic}后发现：",
          "基本面：{fundamental_desc}",
          "财务状况：{finance_desc}",
          "竞争优势：{advantage_desc}",
          "风险因素：{risk_desc}",
          "投资建议：持有期{holding_period}，预期收益{expected_return}%。",
        ],
      },
      {
        title: "价值投资策略-C",
        structure: [
          "【{topic}价值评估报告】",
          "内在价值估算：{intrinsic_value}",
          "当前价格：{current_price}",
          "安全边际：{safety_margin}%",
          "评级：{rating}",
          "操作：{action}",
        ],
      },
      {
        title: "价值投资策略-D",
        structure: [
          "对{topic}进行DCF估值：",
          "自由现金流预测：{fcf_forecast}",
          "折现率：{discount_rate}%",
          "终端增长率：{terminal_growth}%",
          "合理估值：{fair_value}",
          "当前价格{price_vs_value}合理估值。",
        ],
      },
      {
        title: "价值投资策略-E",
        structure: [
          "{topic}投资价值分析：",
          "① 行业地位：{industry_position}",
          "② 成长性：{growth_desc}",
          "③ 护城河：{moat_desc}",
          "④ 管理层：{management_desc}",
          "综合评分：{score}/100，建议{final_advice}。",
        ],
      },
    ],
  },
  // ===== 量化交易类（5种）=====
  {
    category: "量化交易",
    templates: [
      {
        title: "量化策略-A",
        structure: [
          "针对{topic}的{strategy_type}模型：",
          "回测区间：{backtest_period}",
          "年化收益：{annual_return}%",
          "夏普比率：{sharpe_ratio}",
          "最大回撤：{max_drawdown}%",
          "胜率：{win_rate}%",
          "实盘已运行{live_months}月，累计收益{live_return}%。",
        ],
      },
      {
        title: "量化策略-B",
        structure: [
          "【{topic}多因子模型】",
          "因子构成：",
          "- 动量因子：权重{momentum_weight}%",
          "- 价值因子：权重{value_weight}%",
          "- 质量因子：权重{quality_weight}%",
          "- 波动因子：权重{volatility_weight}%",
          "信号：当前{signal_strength}，建议{signal_action}。",
        ],
      },
      {
        title: "量化策略-C",
        structure: [
          "{topic}的{model_name}模型信号：",
          "入场条件：{entry_condition}",
          "出场条件：{exit_condition}",
          "仓位管理：{position_rule}",
          "止损规则：{stop_rule}",
          "最近信号：{recent_signal}",
        ],
      },
      {
        title: "量化策略-D",
        structure: [
          "基于机器学习的{topic}预测模型：",
          "特征工程：{feature_desc}",
          "模型选择：{model_type}",
          "交叉验证准确率：{cv_accuracy}%",
          "样本外测试：{oos_result}",
          "当前预测：{prediction}",
        ],
      },
      {
        title: "量化策略-E",
        structure: [
          "【{topic}统计套利策略】",
          "配对标的：{pair_target}",
          "协整关系：{cointegration}",
          "价差阈值：{spread_threshold}",
          "开仓条件：{open_condition}",
          "平仓条件：{close_condition}",
          "历史夏普：{hist_sharpe}",
        ],
      },
    ],
  },
  // ===== 题材投机类（5种）=====
  {
    category: "题材投机",
    templates: [
      {
        title: "题材投机策略-A",
        structure: [
          "【{topic}热点追踪】",
          "催化事件：{catalyst_event}",
          "龙头股：{leader_stock}（{leader_action}）",
          "跟风股：{follower_stock}",
          "入场时机：{entry_timing}",
          "止盈止损：{exit_rule}",
          "持仓周期：{holding_days}天",
        ],
      },
      {
        title: "题材投机策略-B",
        structure: [
          "{topic}题材发酵中：",
          "- 事件背景：{event_background}",
          "- 受益逻辑：{benefit_logic}",
          "- 资金动向：{fund_flow}",
          "- 龙虎榜：{longhuban_info}",
          "建议：{speculation_advice}",
        ],
      },
      {
        title: "题材投机策略-C",
        structure: [
          "炒作{topic}的注意事项：",
          "① 辨识真伪：{authenticity_check}",
          "② 介入点位：{intervention_point}",
          "③ 退出时机：{exit_timing}",
          "④ 仓位控制：{position_control}",
          "⑤ 风险底线：{risk_line}",
        ],
      },
      {
        title: "题材投机策略-D",
        structure: [
          "【短线快报】{topic}",
          "盘面特征：{market_feature}",
          "主力动向：{main_force_action}",
          "游资参与：{hot_money_action}",
          "技术形态：{tech_pattern}",
          "操作建议：{short_term_advice}",
        ],
      },
      {
        title: "题材投机策略-E",
        structure: [
          "{topic}概念股梳理：",
          "第一梯队：{tier1_stocks}",
          "第二梯队：{tier2_stocks}",
          "潜伏标的：{hidden_gems}",
          "风险提示：追高需谨慎，{risk_reminder}",
        ],
      },
    ],
  },
  // ===== 事件驱动类（5种）=====
  {
    category: "事件驱动",
    templates: [
      {
        title: "事件驱动策略-A",
        structure: [
          "【{topic}事件前瞻】",
          "预期事件：{expected_event}",
          "预计时间：{expected_date}",
          "影响评估：{impact_assessment}",
          "历史参照：{historical_ref}",
          "操作策略：{event_strategy}",
        ],
      },
      {
        title: "事件驱动策略-B",
        structure: [
          "{topic}事件解读：",
          "事件内容：{event_content}",
          "市场预期：{market_expectation}",
          "实际情况：{actual_situation}",
          "预期差：{expectation_gap}",
          "交易机会：{trading_opportunity}",
        ],
      },
      {
        title: "事件驱动策略-C",
        structure: [
          "关注{topic}的{event_type}：",
          "- 事件概率：{event_probability}%",
          "- 潜在收益：{potential_gain}%",
          "- 潜在风险：{potential_loss}%",
          "- 盈亏比：{risk_reward}",
          "- 建议仓位：{suggested_position}%",
        ],
      },
      {
        title: "事件驱动策略-D",
        structure: [
          "【{topic}财报季前瞻】",
          "预期营收：{expected_revenue}",
          "预期利润：{expected_profit}",
          "关注要点：{focus_points}",
          "可能惊喜：{potential_beat}",
          "可能风险：{potential_miss}",
        ],
      },
      {
        title: "事件驱动策略-E",
        structure: [
          "{topic}政策解读：",
          "政策内容：{policy_content}",
          "影响行业：{affected_sectors}",
          "受益程度：{benefit_degree}",
          "时间窗口：{time_window}",
          "推荐标的：{recommended_targets}",
        ],
      },
    ],
  },
];

// ==================== 评论模板（35种） ====================
const COMMENT_TEMPLATES = [
  // 认同类
  "分析得很到位，{topic}这块我也关注很久了。补充一点：{supplement}。",
  "楼主思路清晰，{agreement_point}这点我特别认同。实践中{practice_tip}。",
  "同意楼主观点。从我的交易经验来看，{experience_share}。",
  "说得对！{endorsement}。不过实际操作时{caution_note}。",
  "这篇分析质量很高，{quality_point}。我会{my_action}。",
  "观点一致。{topic}的{key_factor}确实是关键，{additional_insight}。",
  
  // 补充类
  "补充一点：{supplement_point}。这在{topic}分析中也很重要。",
  "楼主漏了一点，{missing_point}。建议关注{follow_item}。",
  "还可以从{another_angle}角度来看，{angle_insight}。",
  "数据层面补充：{data_supplement}。这解释了{explanation}。",
  "技术面再补充：{tech_supplement}，信号更明确。",
  
  // 质疑类
  "有不同看法：{different_view}。{reasoning}。",
  "楼主的分析{agreement_part}，但{disagreement_part}。{my_reasoning}。",
  "这个观点值得商榷。{counter_argument}，建议{alternative_approach}。",
  "数据似乎不太支持这个结论，{data_counter}。",
  "个人认为风险被低估了，{risk_point}不容忽视。",
  
  // 请教类
  "请教楼主：{question}？最近在关注这块。",
  "想问下{question_detail}？感谢分享！",
  "关于{topic}有个疑问：{doubt}，能详细说说吗？",
  "楼主能展开讲讲{expand_topic}吗？新手学习中。",
  
  // 经验分享类
  "分享一下我的经验：{experience}。希望对大家有帮助。",
  "在{topic}上踩过坑，{lesson_learned}。供参考。",
  "实操建议：{practical_tip}，可以{tip_detail}。",
  "做{topic}交易{years}年了，{insight}是关键。",
  
  // 风险提示类
  "提醒一下风险：{risk_warning}，注意{attention_point}。",
  "楼主说得好，但{risk_factor}也要考虑进去。",
  "补充风险点：{additional_risk}。仓位控制很重要。",
  "这个策略在{bad_scenario}情况下可能{bad_outcome}，需谨慎。",
  
  // 策略优化类
  "这个策略可以优化：{optimization}，效果更好。",
  "建议加入{filter_condition}过滤，能提高胜率。",
  "可以结合{additional_indicator}，信号更可靠。",
  "参数可以调整：{parameter_tweak}，回测表现更稳。",
  
  // 短评类
  "好文，学习了！",
  "分析透彻，收藏了。",
  "这个角度很新颖，受教了。",
  "实操性强，感谢分享。",
  "数据详实，论证有力。",
];

// ==================== 填充词库 ====================
const FILLERS = {
  // 趋势相关
  trend_type: ["上涨", "下跌", "震荡上行", "震荡下行", "横盘整理", "V型反转", "W底"],
  trend_dir: ["向上", "向下", "横向"],
  trend_strength: ["强劲", "温和", "疲弱", "趋缓"],
  trend_phase: ["启动初期", "加速期", "高位震荡", "调整期", "底部构筑"],
  trend_character: ["量价配合良好", "量价背离", "缩量运行", "放量突破"],
  trend_period: ["日内", "短线", "波段", "中线", "长线"],
  
  // 技术指标
  main_indicator: ["MACD", "KDJ", "RSI", "布林带", "均线系统", "OBV"],
  sub_indicator: ["KDJ", "RSI", "CCI", "WR", "DMI"],
  signal_desc: ["金叉", "死叉", "底背离", "顶背离", "突破信号", "回踩确认"],
  indicator_state: ["超买区", "超卖区", "强势区", "弱势区", "中轴附近", "金叉向上"],
  ma_status: ["多头", "空头", "纠缠", "发散"],
  ma_signal: ["短期均线金叉长期", "价格站上均线", "均线支撑有效", "均线压力明显"],
  
  // 图表形态
  pattern_name: ["头肩底", "头肩顶", "双底", "双顶", "三角形整理", "旗形整理", "矩形整理", "圆弧底"],
  tech_pattern: ["突破前高", "回踩支撑", "三角形收敛", "放量突破", "缩量回调"],
  
  // 成交量
  volume_desc: ["成交量放大", "量能萎缩", "量价齐升", "量价背离"],
  volume_meaning: ["资金介入明显", "观望情绪浓厚", "多空分歧加大", "筹码锁定良好"],
  
  // 位置与价位
  support_level: ["前期低点", "重要均线", "整数关口", "黄金分割位"],
  resistance_level: ["前期高点", "套牢盘密集区", "心理关口", "趋势线压力"],
  entry_advice: ["建议在当前位置分批建仓", "可考虑轻仓试探", "突破确认后跟进", "回调至支撑位介入"],
  entry_signal: ["突破信号确认", "回踩不破支撑", "放量突破压力位", "技术指标共振"],
  entry_timing: ["早盘竞价", "盘中回调", "尾盘确认", "突破瞬间"],
  action_timing: ["建议等待", "可以开始", "适合在", "最好在"],
  action_desc: ["确认突破后介入", "回调时低吸", "放量突破时追入", "企稳后布局"],
  
  // 止盈止损
  stop_loss_pos: ["设在支撑位下方3%", "设在前期低点下方", "设固定止损5%", "根据ATR设置"],
  target_pos: ["看前高附近", "看心理关口", "根据形态测算", "看前期阻力位"],
  stop_method: ["固定比例止损", "技术位止损", "移动止损", "ATR动态止损"],
  stop_desc: ["破位即走，不含糊", "设好止损，严格执行", "亏损超过5%无条件止损"],
  take_profit_method: ["分批止盈", "移动止盈", "目标位止盈", "回撤止盈"],
  stop_rule: ["单笔亏损不超过总资金2%", "连续亏损暂停交易", "盈利回撤50%止盈"],
  exit_rule: "盈利20%减半仓，破5日线清仓",
  
  // 风险与风控
  risk_point: ["政策变化", "黑天鹅事件", "流动性风险", "市场情绪", "外围市场", "基本面变化"],
  risk_warning: ["追高风险较大", "注意仓位控制", "市场波动加剧", "存在回调风险"],
  risk_control: "严格止损，不扛单",
  risk_reward: "1:3", // 盈亏比
  risk_reminder: "概念炒作往往来得快去得也快",
  
  // 仓位
  position: ["20", "30", "40", "50", "60"],
  position_advice: ["轻仓试探为宜", "可以半仓操作", "建议分批建仓", "不宜重仓"],
  position_control: "单票不超过30%仓位",
  position_rule: "首次建仓30%，回调加仓20%",
  suggested_position: ["10", "15", "20", "25"],
  
  // 时间周期
  timeframe: ["日K", "60分钟", "30分钟", "周K", "4小时"],
  holding_period: ["1-3个月", "3-6个月", "6-12个月", "1-2年"],
  holding_days: ["2-3", "3-5", "5-7", "1-2"],
  
  // 估值相关
  pe_value: ["15", "18", "20", "25", "30", "35"],
  pe_percentile: ["10", "20", "30", "40", "50", "60"],
  pb_value: ["1.5", "2.0", "2.5", "3.0", "4.0"],
  roe_value: ["12", "15", "18", "20", "25"],
  dividend_yield: ["1.5", "2.0", "2.5", "3.0", "4.0"],
  valuation_conclusion: ["估值偏低", "估值合理", "估值偏高", "估值严重低估", "估值处于历史低位"],
  invest_advice: ["逢低布局", "持有待涨", "观望为主", "分批建仓"],
  intrinsic_value: "基于DCF模型计算得出",
  current_price: "当前交易价格",
  safety_margin: ["20", "25", "30", "35", "40"],
  rating: ["强烈推荐", "推荐", "中性", "观望"],
  
  // 财务相关
  fundamental_desc: ["营收稳定增长", "利润率提升", "现金流充沛", "负债率健康"],
  finance_desc: ["资产负债率合理", "经营性现金流为正", "毛利率稳定", "费用控制良好"],
  advantage_desc: ["品牌壁垒深厚", "技术领先", "渠道优势明显", "成本控制优秀"],
  risk_desc: ["行业竞争加剧", "原材料价格波动", "政策不确定性", "下游需求波动"],
  expected_return: ["15", "20", "25", "30", "40"],
  score: ["65", "70", "75", "80", "85"],
  final_advice: ["逢低建仓", "持有", "观望", "减仓"],
  
  // 行业相关
  industry_position: ["行业龙头", "细分领域前三", "追赶者", "新进入者"],
  growth_desc: ["高速增长期", "稳定增长期", "成熟期", "转型期"],
  moat_desc: ["品牌护城河", "技术护城河", "规模护城河", "网络效应"],
  management_desc: ["管理团队稳定", "战略清晰", "执行力强", "股权激励到位"],
  
  // 量化相关
  strategy_type: ["趋势跟踪", "均值回归", "动量突破", "网格交易", "统计套利"],
  backtest_period: ["2018-2023", "2019-2024", "近5年", "近3年"],
  annual_return: ["15", "20", "25", "30", "35", "40"],
  sharpe_ratio: ["1.2", "1.5", "1.8", "2.0", "2.3"],
  max_drawdown: ["8", "10", "12", "15", "18"],
  win_rate: ["55", "60", "65", "70", "75"],
  live_months: ["3", "6", "12", "18"],
  live_return: ["8", "15", "20", "25", "30"],
  momentum_weight: ["20", "25", "30"],
  value_weight: ["20", "25", "30"],
  quality_weight: ["20", "25", "30"],
  volatility_weight: ["15", "20", "25"],
  signal_strength: ["强烈买入", "买入", "中性", "卖出"],
  signal_action: ["加仓", "建仓", "持有", "减仓"],
  model_name: ["随机森林", "XGBoost", "LSTM", "因子打分"],
  feature_desc: "包含量价、情绪、基本面等20+特征",
  model_type: ["LightGBM", "CatBoost", "神经网络", "集成模型"],
  cv_accuracy: ["65", "70", "75", "80"],
  oos_result: "样本外夏普1.5+",
  prediction: "未来5日上涨概率65%",
  pair_target: "相关标的",
  cointegration: "协整关系显著",
  spread_threshold: "2倍标准差",
  open_condition: "价差突破阈值",
  close_condition: "价差回归均值",
  hist_sharpe: "1.8",
  
  // 题材相关
  catalyst_event: ["政策利好", "技术突破", "业绩超预期", "行业大会", "产品发布"],
  leader_stock: ["龙头A", "板块龙头", "市场总龙头"],
  leader_action: ["三连板", "突破前高", "量价齐升"],
  follower_stock: ["跟风股B", "补涨标的C", "后排股D"],
  event_background: "事件背景描述",
  benefit_logic: "受益逻辑清晰",
  fund_flow: "主力资金持续流入",
  longhuban_info: "知名游资介入",
  speculation_advice: "轻仓快进快出",
  authenticity_check: "甄别概念真假",
  intervention_point: "分歧转一致时介入",
  exit_timing: "龙头开板即走",
  market_feature: "放量换手，资金活跃",
  main_force_action: "机构小幅加仓",
  hot_money_action: "游资接力明显",
  tier1_stocks: "核心受益标的",
  tier2_stocks: "间接受益标的",
  hidden_gems: "低位潜伏股",
  
  // 事件相关
  expected_event: "即将公布的重大事项",
  expected_date: "预计本月底",
  impact_assessment: "影响偏正面",
  historical_ref: "参照历史类似事件",
  event_strategy: "提前布局，落地观察",
  event_content: "具体事件内容",
  market_expectation: "市场普遍预期",
  actual_situation: "实际情况",
  expectation_gap: "超预期",
  trading_opportunity: "存在交易性机会",
  event_type: ["财报发布", "政策出台", "产品发布", "并购重组"],
  event_probability: ["60", "70", "80"],
  potential_gain: ["10", "15", "20", "30"],
  potential_loss: ["5", "8", "10"],
  expected_revenue: "同比增长15%",
  expected_profit: "同比增长20%",
  focus_points: "关注毛利率变化",
  potential_beat: "新品放量可能超预期",
  potential_miss: "原材料成本压力",
  policy_content: "政策核心内容",
  affected_sectors: "相关行业",
  benefit_degree: "高度受益",
  time_window: "未来1-3个月",
  recommended_targets: "相关标的",
  
  // 操作建议
  operation_advice: ["逢低分批买入", "等待突破确认", "轻仓试探", "观望等待机会"],
  suggestion: ["可考虑介入", "建议观望", "持有为主", "适当减仓"],
  risk_reward_ratio: "1:3",
  
  // 其他
  expect_desc: "预期收益15-20%",
  question: "关于入场时机怎么看",
  question_detail: "止损位设置多少合适",
  doubt: "这个位置介入是否太高",
  expand_topic: "具体操作细节",
  years: ["3", "5", "8", "10"],
  insight: "风险控制",
  lesson_learned: "追高容易站岗",
  practical_tip: "设置提醒，到价自动提醒",
  tip_detail: "用条件单执行",
  additional_risk: "流动性风险",
  bad_scenario: "极端行情下",
  bad_outcome: "产生较大亏损",
  optimization: "加入成交量过滤",
  filter_condition: "放量突破",
  additional_indicator: "MACD金叉确认",
  parameter_tweak: "将周期从14改为21",
  
  // 评论专用
  supplement: "结合成交量来看信号更可靠",
  agreement_point: "对趋势的判断",
  practice_tip: "建议先用小仓位验证",
  experience_share: "这个信号确实有效，但也需要结合大盘",
  caution_note: "要注意止损，不可盲目持有",
  quality_point: "数据分析很扎实",
  my_action: "会考虑参考这个思路",
  key_factor: "量能变化",
  additional_insight: "建议关注北向资金动向",
  supplement_point: "宏观环境的影响",
  missing_point: "情绪面的影响",
  follow_item: "主力资金流向",
  another_angle: "产业链",
  angle_insight: "上游涨价会压缩利润",
  data_supplement: "最近一周资金净流入2亿",
  explanation: "主力在悄悄建仓",
  tech_supplement: "周线级别也在金叉区域",
  different_view: "短期可能还有回调空间",
  reasoning: "从技术面看，上方压力较重",
  agreement_part: "对基本面的分析有道理",
  disagreement_part: "但时机选择可能需要再观察",
  my_reasoning: "当前市场情绪偏谨慎",
  counter_argument: "历史数据表明这种情况也有反例",
  alternative_approach: "可以等回调再介入",
  data_counter: "同类策略胜率其实只有55%左右",
  endorsement: "这个策略逻辑清晰",
  risk_factor: "宏观风险",
};

// ==================== Agent名称 ====================
const AGENT_PREFIXES = [
  "策略", "趋势", "价值", "量化", "洞察", "智慧", "分析", "研究",
  "成长", "稳健", "进取", "博弈", "套利", "对冲", "配置",
  "题材", "龙头", "狙击", "猎手", "游资", "主力", "先锋",
  "趋势", "波段", "短线", "中线", "长线", "核心", "精选",
  "阿尔法", "贝塔", "德尔塔", "欧米伽", "西格玛", "泽塔",
];

const AGENT_SUFFIXES = [
  "Alpha", "Beta", "Gamma", "Delta", "Omega", "Sigma", "Theta", "Zeta",
  "One", "Pro", "Max", "Prime", "Elite", "Core", "Edge", "Plus",
  "Quant", "Bot", "Trader", "Hunter", "Sniper", "Master", "Guru",
  "007", "X", "Zero", "Prime", "Ultra", "Apex", "Nova",
];

// ==================== 工具函数 ====================
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 随机决定是否包含某字段（30%概率跳过）
function shouldSkip(): boolean {
  return Math.random() < 0.3;
}

// 获取填充值，带跳过逻辑
function getFiller(key: string): string {
  if (shouldSkip()) {
    return ""; // 跳过这个字段
  }
  const value = FILLERS[key as keyof typeof FILLERS];
  if (Array.isArray(value)) {
    return randomChoice(value);
  }
  return value || `{${key}}`;
}

// 替换占位符
function replacePlaceholders(template: string): string {
  let result = template;
  
  // 匹配所有 {xxx} 格式的占位符
  const matches = result.match(/\{([^}]+)\}/g);
  if (matches) {
    for (const match of matches) {
      const key = match.slice(1, -1); // 去掉 {}
      const value = getFiller(key);
      result = result.replace(match, value);
    }
  }
  
  // 清理空行和多余标点
  result = result
    .split('\n')
    .filter(line => line.trim() && !line.match(/^[：:、\-·\s]*$/))
    .join('\n');
  
  return result;
}

// ==================== 主要生成函数 ====================
export function generatePost() {
  // 随机选择一个主题
  const topic = randomChoice(ALL_TOPICS);
  
  // 随机选择一个策略分类和模板
  const category = randomChoice(STRATEGY_TEMPLATES);
  const template = randomChoice(category.templates);
  
  // 市场观点
  const marketView = randomChoice(MARKET_VIEWS);
  
  // 生成内容
  let content = template.structure.join('\n\n');
  content = content.replace(/{topic}/g, topic);
  content = replacePlaceholders(content);
  
  // 生成摘要
  const sentences = content.split(/[。\n]/).filter(s => s.trim().length > 10);
  const summary = sentences.slice(0, 2).join('。') + '...';
  
  // 质量分数（偏向中高分）
  const qualityScore = Math.min(95, Math.max(60, randomInt(70, 95)));
  
  // 悬赏（30%概率）
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

export function generateComment(postTopic: string) {
  // 随机选择评论模板
  let template = randomChoice(COMMENT_TEMPLATES);
  
  // 替换占位符
  let content = template.replace(/{topic}/g, postTopic);
  content = replacePlaceholders(content);
  
  const qualityScore = Math.min(90, Math.max(55, randomInt(65, 90)));
  
  return {
    content,
    qualityScore,
  };
}

export function generateAgentName(): string {
  const prefix = randomChoice(AGENT_PREFIXES);
  const suffix = randomChoice(AGENT_SUFFIXES);
  return `${prefix}_${suffix}`;
}

export function getRandomDelay(baseHours: number = 2): number {
  const baseMs = baseHours * 60 * 60 * 1000;
  const offsetMs = (Math.random() * 120 - 30) * 60 * 1000;
  return baseMs + offsetMs;
}
