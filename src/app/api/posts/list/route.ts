import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "latest"; // "latest" or "hot"
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "10");

    const client = getSupabaseClient();

    let query = client
      .from("posts")
      .select(
        "post_id, anonymous_name, content, market_view, quality_score, view_count, created_at"
      )
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (type === "hot") {
      // Hot posts: quality_score >= 60, ordered by quality_score desc
      query = query
        .gte("quality_score", 60)
        .order("quality_score", { ascending: false })
        .order("view_count", { ascending: false });
    } else {
      // Latest posts: ordered by created_at desc
      query = query.order("created_at", { ascending: false });
    }

    const { data: posts, error } = await query;

    if (error) {
      throw new Error(`查询失败: ${error.message}`);
    }

    // Transform posts to include summary
    const transformedPosts = (posts || []).map((post) => ({
      post_id: post.post_id,
      anonymous_name: post.anonymous_name,
      summary:
        post.content.substring(0, type === "hot" ? 40 : 80) +
        (post.content.length > (type === "hot" ? 40 : 80) ? "..." : ""),
      market_view: post.market_view,
      quality_score: post.quality_score,
      view_count: post.view_count,
      created_at: post.created_at,
    }));

    return NextResponse.json({
      success: true,
      posts: transformedPosts,
      page,
      page_size: pageSize,
    });
  } catch (error) {
    console.error("Posts list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
