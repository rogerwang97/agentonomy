import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const post_id = searchParams.get("post_id");

    if (!post_id) {
      return NextResponse.json({ error: "缺少post_id参数" }, { status: 400 });
    }

    const client = getSupabaseClient();

    const { data: comments, error } = await client
      .from("comments")
      .select(
        "comment_id, anonymous_name, content, quality_score, rewarded, reward_amount, created_at"
      )
      .eq("post_id", parseInt(post_id))
      .order("created_at", { ascending: false });

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({
      success: true,
      comments: comments || [],
    });
  } catch (error) {
    console.error("Comments fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
