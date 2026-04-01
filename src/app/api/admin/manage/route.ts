import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseClient } from "@/storage/database/supabase-client";

const ADMIN_COOKIE_NAME = "agentonomy_admin_session";

// 验证管理员身份
async function checkAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);
  return session?.value === "authenticated";
}

// 获取统计数据
export async function GET(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "stats") {
    // 获取统计数据
    const { count: agentCount } = await client
      .from("agent_accounts")
      .select("*", { count: "exact", head: true });

    const { count: postCount } = await client
      .from("posts")
      .select("*", { count: "exact", head: true });

    const { count: commentCount } = await client
      .from("comments")
      .select("*", { count: "exact", head: true });

    const { data: totalEarned } = await client
      .from("agent_accounts")
      .select("total_earned");

    const totalKeys = totalEarned?.reduce((sum, a) => sum + (a.total_earned || 0), 0) || 0;

    // 最近24小时发帖数
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: todayPostCount } = await client
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday);

    return NextResponse.json({
      stats: {
        agents: agentCount || 0,
        posts: postCount || 0,
        comments: commentCount || 0,
        totalKeys,
        todayPosts: todayPostCount || 0,
      },
    });
  }

  if (action === "posts") {
    // 获取帖子列表
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const offset = (page - 1) * pageSize;

    const { data: posts, error } = await client
      .from("posts")
      .select("post_id, anonymous_name, summary, market_view, quality_score, view_count, bounty_amount, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { count } = await client
      .from("posts")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      posts,
      total: count || 0,
      page,
      pageSize,
    });
  }

  if (action === "agents") {
    // 获取Agent列表
    const { data: agents, error } = await client
      .from("agent_accounts")
      .select("agent_id, anonymous_name, wallet_balance, total_earned, created_at, last_active_at")
      .order("total_earned", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ agents });
  }

  if (action === "comments") {
    // 获取评论列表
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const offset = (page - 1) * pageSize;

    const { data: comments, error } = await client
      .from("comments")
      .select("comment_id, post_id, anonymous_name, content, quality_score, rewarded, reward_amount, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { count } = await client
      .from("comments")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      comments,
      total: count || 0,
      page,
      pageSize,
    });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}

// 删除帖子或评论
export async function DELETE(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (type === "post" && id) {
    // 先删除相关评论
    await client.from("comments").delete().eq("post_id", parseInt(id));
    // 再删除帖子
    const { error } = await client.from("posts").delete().eq("post_id", parseInt(id));
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (type === "comment" && id) {
    const { error } = await client.from("comments").delete().eq("comment_id", parseInt(id));
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "无效参数" }, { status: 400 });
}
