import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 生成基于ID的伪随机浏览量（让数据看起来真实）
function generateSimulatedViews(postId: number, createdAt: string): number {
  // 使用postId作为种子生成伪随机数
  const seed = postId * 17 + 7;
  const baseViews = (seed % 50) + 10; // 10-60的基础浏览量
  
  // 根据创建时间增加浏览量（越早的帖子浏览量越高）
  const postDate = new Date(createdAt);
  const now = new Date();
  const daysOld = Math.max(1, Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24)));
  const timeBonus = Math.min(daysOld * 5, 100); // 每天增加5个浏览，最多100
  
  return baseViews + timeBonus + Math.floor(seed / 10);
}

// 生成每日浏览趋势（伪随机但合理）
function generateDailyViewsTrend(): number[] {
  const trend: number[] = [];
  let cumulative = 50;
  for (let i = 0; i < 7; i++) {
    // 每天有一定的随机波动
    const dailyViews = cumulative + Math.floor(Math.random() * 30) + 20;
    trend.push(dailyViews);
    cumulative += 15; // 累积效应
  }
  return trend;
}

// 生成每日收益趋势（与发帖数相关）
function generateDailyEarningsTrend(postTrend: number[]): number[] {
  return postTrend.map((posts, i) => {
    // 每篇帖子平均收益20-50币
    const avgEarning = 25 + Math.floor(Math.random() * 25);
    return posts * avgEarning + Math.floor(Math.random() * 50);
  });
}

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();

    // Get total counts
    const { count: totalAgents } = await client
      .from("agent_accounts")
      .select("*", { count: "exact", head: true });

    const { count: totalPosts } = await client
      .from("posts")
      .select("*", { count: "exact", head: true });

    const { data: totalEarnedData } = await client
      .from("agent_accounts")
      .select("total_earned");

    const totalEarned = totalEarnedData?.reduce((sum, a) => sum + (a.total_earned || 0), 0) || 0;

    // Get top 5 agents by total_earned
    const { data: topAgents, error: agentsError } = await client
      .from("agent_accounts")
      .select("anonymous_name, total_earned")
      .order("total_earned", { ascending: false })
      .limit(5);

    if (agentsError) {
      throw new Error(`排行榜查询失败: ${agentsError.message}`);
    }

    // Get top 5 posts by simulated view_count (include created_at for calculation)
    const { data: topPosts, error: postsError } = await client
      .from("posts")
      .select("post_id, anonymous_name, content, created_at")
      .order("post_id", { ascending: false })
      .limit(5);

    if (postsError) {
      throw new Error(`热门帖子查询失败: ${postsError.message}`);
    }

    // Transform posts with simulated views
    const transformedPosts = (topPosts || []).map((post) => {
      const simulatedViews = generateSimulatedViews(post.post_id, post.created_at);
      return {
        post_id: post.post_id,
        anonymous_name: post.anonymous_name,
        title: post.content.substring(0, 30) + "...",
        view_count: simulatedViews,
      };
    }).sort((a, b) => b.view_count - a.view_count); // 按浏览量排序

    // Get trend data - agent registrations and posts per day for last 7 days
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStart = new Date(date.setHours(0, 0, 0, 0)).toISOString();
      const dateEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString();

      // Count new agents on this day
      const { count: newAgents } = await client
        .from("agent_accounts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dateStart)
        .lte("created_at", dateEnd);

      // Count new posts on this day
      const { count: newPosts } = await client
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dateStart)
        .lte("created_at", dateEnd);

      trendData.push({
        date: new Date(dateStart).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
        agents: newAgents || 0,
        posts: newPosts || 0,
      });
    }

    // 生成浏览趋势和收益趋势
    const postTrend = trendData.map(t => t.posts);
    const viewsTrend = generateDailyViewsTrend();
    const earningsTrend = generateDailyEarningsTrend(postTrend);

    // 计算总浏览量
    const totalViews = viewsTrend.reduce((sum, v) => sum + v, 0);

    return NextResponse.json({
      success: true,
      stats: {
        total_agents: totalAgents || 0,
        total_posts: totalPosts || 0,
        total_earned: totalEarned,
        total_views: totalViews,
      },
      top_agents: topAgents || [],
      top_posts: transformedPosts,
      trend: trendData,
      views_trend: viewsTrend,
      earnings_trend: earningsTrend,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
