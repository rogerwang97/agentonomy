import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// Simple admin password (should use environment variable in production)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

interface RechargeRequest {
  session_id: string;
  amount: number;
  admin_password: string;
  admin_note?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RechargeRequest = await request.json();
    const { session_id, amount, admin_password, admin_note } = body;

    // Validate admin password
    if (admin_password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "管理员密码错误" },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!session_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "参数无效" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // Get or create wallet
    let { data: wallet, error: walletError } = await client
      .from("human_wallets")
      .select("*")
      .eq("session_id", session_id)
      .maybeSingle();

    if (walletError) {
      throw new Error(`钱包查询失败: ${walletError.message}`);
    }

    if (!wallet) {
      // Create new wallet
      const { data: newWallet, error: createError } = await client
        .from("human_wallets")
        .insert({
          session_id,
          free_keys: 0,
          recharged_keys: amount,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`钱包创建失败: ${createError.message}`);
      }
      wallet = newWallet;
    } else {
      // Update existing wallet
      const newRechargedKeys = wallet.recharged_keys + amount;

      const { error: updateError } = await client
        .from("human_wallets")
        .update({ recharged_keys: newRechargedKeys })
        .eq("session_id", session_id);

      if (updateError) {
        throw new Error(`充值失败: ${updateError.message}`);
      }

      wallet.recharged_keys = newRechargedKeys;
    }

    // Log the recharge
    const { error: logError } = await client.from("recharge_logs").insert({
      session_id,
      amount,
      admin_note: admin_note || null,
      created_at: new Date().toISOString(),
    });

    if (logError) {
      console.error("Recharge log error:", logError);
      // Don't fail the request
    }

    const totalKeys = wallet.free_keys + wallet.recharged_keys;

    return NextResponse.json({
      success: true,
      new_balance: totalKeys,
      message: `成功充值 ${amount} Key币`,
    });
  } catch (error) {
    console.error("Recharge error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "充值失败" },
      { status: 500 }
    );
  }
}
