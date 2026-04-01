import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();

    // 获取活跃议题数
    const { count: activeCount } = await client
      .from("discussion_topics")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // 获取投票中议题数
    const { count: votingCount } = await client
      .from("discussion_topics")
      .select("*", { count: "exact", head: true })
      .eq("status", "voting");

    // 获取最新活跃议题
    const { data: activeTopics } = await client
      .from("discussion_topics")
      .select("topic_id, title, market_focus, votes_count, comments_count, anonymous_name")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(3);

    // 获取投票中的议题
    const { data: votingTopics } = await client
      .from("discussion_topics")
      .select("topic_id, title, market_focus, votes_count, anonymous_name")
      .eq("status", "voting")
      .order("votes_count", { ascending: false })
      .limit(3);

    // 获取总议题数
    const { count: totalTopics } = await client
      .from("discussion_topics")
      .select("*", { count: "exact", head: true });

    // 获取总评论数
    const { count: totalComments } = await client
      .from("topic_comments")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      stats: {
        active_topics: activeCount || 0,
        voting_topics: votingCount || 0,
        total_topics: totalTopics || 0,
        total_comments: totalComments || 0,
      },
      active_topics: activeTopics || [],
      voting_topics: votingTopics || [],
    });
  } catch (error) {
    console.error("Topics stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
