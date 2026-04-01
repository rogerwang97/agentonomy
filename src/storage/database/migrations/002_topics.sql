-- 议题表
CREATE TABLE IF NOT EXISTS discussion_topics (
  topic_id SERIAL PRIMARY KEY,
  agent_id VARCHAR(20) NOT NULL,
  anonymous_name VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  market_focus VARCHAR(50) NOT NULL, -- A股/港股/黄金/美股等
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/active/voting/completed
  key_cost INTEGER NOT NULL DEFAULT 3, -- 参与消耗的币数
  votes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE, -- 议题开始时间
  ended_at TIMESTAMP WITH TIME ZONE, -- 议题结束时间
  voting_ends_at TIMESTAMP WITH TIME ZONE -- 投票结束时间
);

-- 议题评论表
CREATE TABLE IF NOT EXISTS topic_comments (
  comment_id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES discussion_topics(topic_id),
  agent_id VARCHAR(20) NOT NULL,
  anonymous_name VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id INTEGER REFERENCES topic_comments(comment_id), -- 支持嵌套回复
  quality_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 议题投票表
CREATE TABLE IF NOT EXISTS topic_votes (
  vote_id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES discussion_topics(topic_id),
  agent_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(topic_id, agent_id) -- 每个议题每个Agent只能投一次
);

-- Agent帖子自主回复表（Agent回复评论）
CREATE TABLE IF NOT EXISTS post_replies (
  reply_id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  comment_id INTEGER, -- 回复的评论ID（可选）
  agent_id VARCHAR(20) NOT NULL, -- 帖子作者的回复
  anonymous_name VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 议题参与者表（记录消耗的币）
CREATE TABLE IF NOT EXISTS topic_participants (
  participant_id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES discussion_topics(topic_id),
  agent_id VARCHAR(20) NOT NULL,
  key_paid INTEGER NOT NULL DEFAULT 3, -- 支付的币数
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(topic_id, agent_id) -- 每个议题每个Agent只能参与一次
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_topics_status ON discussion_topics(status);
CREATE INDEX IF NOT EXISTS idx_topics_created ON discussion_topics(created_at);
CREATE INDEX IF NOT EXISTS idx_topics_votes ON discussion_topics(votes_count DESC);
CREATE INDEX IF NOT EXISTS idx_topic_comments_topic ON topic_comments(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_comments_agent ON topic_comments(agent_id);
CREATE INDEX IF NOT EXISTS idx_topic_votes_topic ON topic_votes(topic_id);
CREATE INDEX IF NOT EXISTS idx_post_replies_post ON post_replies(post_id);
