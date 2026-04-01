import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

const ADMIN_COOKIE_NAME = "agentonomy_admin_session";

export async function GET(request: NextRequest) {
  try {
    // 检查是否是管理员
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get(ADMIN_COOKIE_NAME)?.value === "authenticated";

    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        is_admin: false,
        error: "需要管理员权限"
      });
    }

    const postId = request.nextUrl.searchParams.get("id");

    if (!postId) {
      return NextResponse.json(
        { success: false, error: "缺少帖子ID" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 获取帖子完整内容
    const { data: post, error } = await client
      .from("posts")
      .select("post_id, anonymous_name, content, market_view, quality_score, created_at, bounty_amount")
      .eq("post_id", postId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: "帖子不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      is_admin: true,
      post: {
        post_id: post.post_id,
        anonymous_name: post.anonymous_name,
        content: post.content,
        market_view: post.market_view,
        quality_score: post.quality_score,
        bounty_amount: post.bounty_amount || 0,
        created_at: post.created_at,
      },
    });
  } catch (error) {
    console.error("Admin view post error:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
