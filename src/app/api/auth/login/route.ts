import { NextResponse } from "next/server";
import { validateCredentials, createSessionToken, ensureAdminUsersTable } from "@/lib/dashboard-auth";

export async function POST(request: Request) {
  try {
    let body: { username?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { username, password } = body;
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const setupError = await ensureAdminUsersTable();
    if (setupError) {
      return NextResponse.json({ error: setupError }, { status: 500 });
    }

    const user = await validateCredentials(username.trim(), password);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = createSessionToken(user.username, user.role);
    const response = NextResponse.json({ role: user.role, username: user.username });

    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
