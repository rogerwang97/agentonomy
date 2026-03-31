import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

interface ViewPostRequest {
  session_id: string;
  post_id: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ViewPostRequest = await request.json();
    const { session_id, post_id } = body;

    if (!session_id || !post_id) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const KEY_COST = 5;

    // 1. Get or create human wallet
    let { data: wallet, error: walletError } = await client
      .from("human_wallets")
      .select("*")
      .eq("session_id", session_id)
      .maybeSingle();

    if (walletError) {
      throw new Error(`钱包查询失败: ${walletError.message}`);
    }

    // Create wallet if not exists (with 3 free keys)
    if (!wallet) {
      const { data: newWallet, error: createError } = await client
        .from("human_wallets")
        .insert({
          session_id,
          free_keys: 3,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`钱包创建失败: ${createError.message}`);
      }
      wallet = newWallet;
    }

    // 2. Check if already viewed this post
    const { data: existingView } = await client
      .from("human_view_logs")
      .select("log_id")
      .eq("session_id", session_id)
      .eq("post_id", post_id)
      .maybeSingle();

    if (existingView) {
      // Already viewed, return post without charge
      const { data: post, error: postError } = await client
        .from("posts")
        .select(
          "post_id, anonymous_name, content, market_view, quality_score, created_at"
        )
        .eq("post_id", post_id)
        .single();

      if (postError) {
        throw new Error(`帖子查询失败: ${postError.message}`);
      }

      return NextResponse.json({
        success: true,
        post,
        message: "已购买过此帖子",
        new_balance: wallet.free_keys,
      });
    }

    // 3. Check balance
    if (wallet.free_keys < KEY_COST) {
      return NextResponse.json({
        success: false,
        message: "Key币不足",
        current_balance: wallet.free_keys,
      });
    }

    // 4. Deduct keys
    const newFreeKeys = wallet.free_keys - KEY_COST;

    // Update wallet
    const { error: updateError } = await client
      .from("human_wallets")
      .update({
        free_keys: newFreeKeys,
      })
      .eq("session_id", session_id);

    if (updateError) {
      throw new Error(`钱包更新失败: ${updateError.message}`);
    }

    // 5. Log the view
    const { error: logError } = await client.from("human_view_logs").insert({
      session_id,
      post_id,
      key_cost: KEY_COST,
      viewed_at: new Date().toISOString(),
    });

    if (logError) {
      console.error("View log error:", logError);
      // Don't fail the request, just log
    }

    // 6. Get post content
    const { data: post, error: postError } = await client
      .from("posts")
      .select(
        "post_id, anonymous_name, content, market_view, quality_score, created_at"
      )
      .eq("post_id", post_id)
      .single();

    if (postError) {
      throw new Error(`帖子查询失败: ${postError.message}`);
    }

    // 7. Increment view count
    await client
      .from("posts")
      .update({ view_count: (post as any).view_count + 1 })
      .eq("post_id", post_id);

    return NextResponse.json({
      success: true,
      post,
      new_balance: newFreeKeys,
    });
  } catch (error) {
    console.error("View post error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查看失败" },
      { status: 500 }
    );
  }
}
