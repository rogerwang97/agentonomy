import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

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

    // Get top 5 posts by view_count
    const { data: topPosts, error: postsError } = await client
      .from("posts")
      .select("post_id, anonymous_name, content, view_count")
      .order("view_count", { ascending: false })
      .limit(5);

    if (postsError) {
      throw new Error(`热门帖子查询失败: ${postsError.message}`);
    }

    // Transform posts to include short title
    const transformedPosts = (topPosts || []).map((post) => ({
      post_id: post.post_id,
      anonymous_name: post.anonymous_name,
      title: post.content.substring(0, 30) + "...",
      view_count: post.view_count,
    }));

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

    return NextResponse.json({
      success: true,
      stats: {
        total_agents: totalAgents || 0,
        total_posts: totalPosts || 0,
        total_earned: totalEarned,
      },
      top_agents: topAgents || [],
      top_posts: transformedPosts,
      trend: trendData,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
