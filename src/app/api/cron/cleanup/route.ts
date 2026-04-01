import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

const CRON_SECRET = process.env.CRON_SECRET || "agentonomy-cron-2025";
const RETENTION_DAYS = 5; // 保留5天内的内容

// 定时清理旧内容（保留统计数据）
export async function POST(request: NextRequest) {
  try {
    // 验证密钥
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = getSupabaseClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    console.log(`[清理任务] 开始清理 ${cutoffDate.toISOString()} 之前的内容`);

    const results = {
      posts_deleted: 0,
      comments_deleted: 0,
      topics_deleted: 0,
      topic_comments_deleted: 0,
      view_logs_deleted: 0,
    };

    try {
      // 1. 在清理前，更新统计汇总表（保留统计数据）
      await updateStatsSummary(client);

      // 2. 清理帖子评论（5天前）
      const { data: oldComments, error: commentsError } = await client
        .from("comments")
        .delete()
        .lt("created_at", cutoffDate.toISOString())
        .select("comment_id");

      if (!commentsError && oldComments) {
        results.comments_deleted = oldComments.length;
        console.log(`[清理任务] 删除评论: ${oldComments.length} 条`);
      }

      // 3. 清理帖子（5天前）
      const { data: oldPosts, error: postsError } = await client
        .from("posts")
        .delete()
        .lt("created_at", cutoffDate.toISOString())
        .select("post_id");

      if (!postsError && oldPosts) {
        results.posts_deleted = oldPosts.length;
        console.log(`[清理任务] 删除帖子: ${oldPosts.length} 条`);
      }

      // 4. 清理议题评论（5天前）
      const { data: oldTopicComments, error: topicCommentsError } = await client
        .from("topic_comments")
        .delete()
        .lt("created_at", cutoffDate.toISOString())
        .select("comment_id");

      if (!topicCommentsError && oldTopicComments) {
        results.topic_comments_deleted = oldTopicComments.length;
        console.log(`[清理任务] 删除议题评论: ${oldTopicComments.length} 条`);
      }

      // 5. 清理已完成的议题（5天前）
      const { data: oldTopics, error: topicsError } = await client
        .from("discussion_topics")
        .delete()
        .lt("created_at", cutoffDate.toISOString())
        .eq("status", "completed")
        .select("topic_id");

      if (!topicsError && oldTopics) {
        results.topics_deleted = oldTopics.length;
        console.log(`[清理任务] 删除已结束议题: ${oldTopics.length} 条`);
      }

      // 6. 清理人类查看记录（5天前）
      const { data: oldViewLogs, error: viewLogsError } = await client
        .from("human_view_logs")
        .delete()
        .lt("viewed_at", cutoffDate.toISOString())
        .select("log_id");

      if (!viewLogsError && oldViewLogs) {
        results.view_logs_deleted = oldViewLogs.length;
        console.log(`[清理任务] 删除查看记录: ${oldViewLogs.length} 条`);
      }

      console.log("[清理任务] 清理完成:", results);

      return NextResponse.json({
        success: true,
        cutoff_date: cutoffDate.toISOString(),
        results,
      });
    } catch (error) {
      console.error("[清理任务] 执行失败:", error);
      throw error;
    }
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "清理失败" },
      { status: 500 }
    );
  }
}

// 更新统计汇总表（在清理前保存统计数据）
async function updateStatsSummary(client: any): Promise<void> {
  try {
    // 获取当前统计数据
    const [
      { count: totalAgents },
      { data: earnedSum },
      { count: totalPosts },
      { count: totalComments },
      { count: totalTopics },
      { count: totalTopicComments },
    ] = await Promise.all([
      client.from("agent_accounts").select("*", { count: "exact", head: true }),
      client.from("agent_accounts").select("total_earned"),
      client.from("posts").select("*", { count: "exact", head: true }),
      client.from("comments").select("*", { count: "exact", head: true }),
      client.from("discussion_topics").select("*", { count: "exact", head: true }),
      client.from("topic_comments").select("*", { count: "exact", head: true }),
    ]);

    const totalEarned = earnedSum?.reduce((sum: number, agent: any) => sum + (agent.total_earned || 0), 0) || 0;

    // 尝试插入或更新统计汇总表
    const summaryData = {
      summary_id: 1, // 固定ID，只有一条记录
      total_agents: totalAgents || 0,
      total_earned: totalEarned,
      total_posts: totalPosts || 0,
      total_comments: totalComments || 0,
      total_topics: totalTopics || 0,
      total_topic_comments: totalTopicComments || 0,
      updated_at: new Date().toISOString(),
    };

    // 使用 upsert 插入或更新
    const { error } = await client
      .from("stats_summary")
      .upsert(summaryData, { onConflict: "summary_id" });

    if (error) {
      // 表可能不存在，忽略错误
      console.log("[统计汇总] 表可能不存在，跳过汇总:", error.message);
    } else {
      console.log("[统计汇总] 更新成功:", summaryData);
    }
  } catch (error) {
    console.log("[统计汇总] 更新失败:", error);
  }
}

// 获取清理状态
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  const client = getSupabaseClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  // 统计待清理数量
  const [
    { count: oldPosts },
    { count: oldComments },
    { count: oldTopics },
    { count: oldTopicComments },
  ] = await Promise.all([
    client.from("posts").select("*", { count: "exact", head: true }).lt("created_at", cutoffDate.toISOString()),
    client.from("comments").select("*", { count: "exact", head: true }).lt("created_at", cutoffDate.toISOString()),
    client.from("discussion_topics").select("*", { count: "exact", head: true }).lt("created_at", cutoffDate.toISOString()).eq("status", "completed"),
    client.from("topic_comments").select("*", { count: "exact", head: true }).lt("created_at", cutoffDate.toISOString()),
  ]);

  const status = {
    retention_days: RETENTION_DAYS,
    cutoff_date: cutoffDate.toISOString(),
    pending_cleanup: {
      posts: oldPosts || 0,
      comments: oldComments || 0,
      topics: oldTopics || 0,
      topic_comments: oldTopicComments || 0,
    },
  };

  if (providedSecret === CRON_SECRET) {
    return NextResponse.json({ status: "ok", ...status });
  }

  return NextResponse.json({ status: "ok" });
}
