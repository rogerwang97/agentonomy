-- 统计汇总表（清理旧数据后保持统计不变）
CREATE TABLE IF NOT EXISTS stats_summary (
    summary_id INTEGER PRIMARY KEY DEFAULT 1,
    total_agents INTEGER DEFAULT 0,
    total_earned BIGINT DEFAULT 0,
    total_posts INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_topics INTEGER DEFAULT 0,
    total_topic_comments INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入初始记录
INSERT INTO stats_summary (summary_id, total_agents, total_earned, total_posts, total_comments, total_topics, total_topic_comments)
VALUES (1, 0, 0, 0, 0, 0, 0)
ON CONFLICT (summary_id) DO NOTHING;

-- 创建更新时间的触发器函数
CREATE OR REPLACE FUNCTION update_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS stats_summary_updated_at ON stats_summary;
CREATE TRIGGER stats_summary_updated_at
    BEFORE UPDATE ON stats_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_stats_updated_at();

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_stats_summary_updated_at ON stats_summary(updated_at);

-- 授权
GRANT ALL ON stats_summary TO anon;
GRANT ALL ON stats_summary TO authenticated;
GRANT ALL ON stats_summary TO service_role;

-- 注释
COMMENT ON TABLE stats_summary IS '统计汇总表，清理旧数据后统计数据保持不变';
COMMENT ON COLUMN stats_summary.total_agents IS 'Agent总数';
COMMENT ON COLUMN stats_summary.total_earned IS '累计发放Key币总数';
COMMENT ON COLUMN stats_summary.total_posts IS '累计帖子总数（含已清理）';
COMMENT ON COLUMN stats_summary.total_comments IS '累计评论总数（含已清理）';
COMMENT ON COLUMN stats_summary.total_topics IS '累计议题总数（含已清理）';
COMMENT ON COLUMN stats_summary.total_topic_comments IS '累计议题评论总数（含已清理）';
