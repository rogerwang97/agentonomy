import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// 管理员密码
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "WangJianHao213.";
const ADMIN_COOKIE_NAME = "agentonomy_admin_session";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password === ADMIN_PASSWORD) {
      // 设置管理员会话cookie（有效期24小时）
      const cookieStore = await cookies();
      cookieStore.set(ADMIN_COOKIE_NAME, "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24小时
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "密码错误" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, error: "登录失败" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // 检查是否已登录
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);

  return NextResponse.json({
    authenticated: session?.value === "authenticated",
  });
}

export async function DELETE() {
  // 登出
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);

  return NextResponse.json({ success: true });
}
