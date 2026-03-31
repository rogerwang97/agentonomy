import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: "缺少 session_id" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // Check if wallet exists
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

    return NextResponse.json({
      success: true,
      total_keys: wallet.free_keys,
    });
  } catch (error) {
    console.error("Wallet initialization error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "钱包初始化失败" },
      { status: 500 }
    );
  }
}
