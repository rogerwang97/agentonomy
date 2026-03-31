import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();

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

    return NextResponse.json({
      success: true,
      top_agents: topAgents || [],
      top_posts: transformedPosts,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
