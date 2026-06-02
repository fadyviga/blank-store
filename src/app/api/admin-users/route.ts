import { NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";
import { requireAdmin, hashPassword } from "@/lib/dashboard-auth";

export async function GET(request: Request) {
  const access = requireAdmin(request);
  if (access) return access;

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("admin_users")
      .select("id, username, role, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      if (error.message?.includes("does not exist")) {
        return NextResponse.json({ users: [] });
      }
      const parsed = getResponseError(error);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json({ users: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = requireAdmin(request);
  if (access) return access;

  try {
    let body: { username?: string; password?: string; role?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { username, password, role } = body;
    if (!username || !password || !role) {
      return NextResponse.json({ error: "username, password, and role required" }, { status: 400 });
    }
    if (role !== "admin" && role !== "viewer") {
      return NextResponse.json({ error: "role must be 'admin' or 'viewer'" }, { status: 400 });
    }

    const admin = getAdminClient();
    const passwordHash = hashPassword(password);

    const { data, error } = await admin
      .from("admin_users")
      .insert({ username: username.trim(), password_hash: passwordHash, role })
      .select("id, username, role, created_at")
      .maybeSingle();

    if (error) {
      if (error.message?.includes("duplicate key") || error.code === "23505") {
        return NextResponse.json({ error: "Username already exists" }, { status: 409 });
      }
      const parsed = getResponseError(error);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json({ user: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
