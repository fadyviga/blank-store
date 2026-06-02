import { createHmac, timingSafeEqual, scryptSync, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAdminClient } from "./supabase-admin";

const SECRET = process.env.DASHBOARD_AUTH_SECRET || "bl4nk-st0re-d4shb04rd-s3cr3t";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length < 2) return password === stored;
  const [salt, hash] = parts;
  if (!salt || !hash) return false;
  try {
    const derivedKey = scryptSync(password, salt, 64).toString("hex");
    const a = Buffer.from(hash);
    const b = Buffer.from(derivedKey);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function validateCredentialsFromDb(
  username: string,
  password: string
): Promise<{ username: string; role: "admin" | "viewer" } | null> {
  try {
    const admin = getAdminClient();
    const { data: user, error } = await admin
      .from("admin_users")
      .select("username, password_hash, role")
      .eq("username", username)
      .maybeSingle();

    if (error || !user) return null;

    const valid = verifyPassword(password, user.password_hash);
    if (!valid) return null;

    return { username: user.username, role: user.role as "admin" | "viewer" };
  } catch {
    return null;
  }
}

export async function ensureAdminUsersTable(): Promise<string | null> {
  try {
    const admin = getAdminClient();

    // Try the RPC function first (creates table + seeds only when empty)
    const { error: rpcError } = await admin.rpc("ensure_admin_users");
    if (!rpcError) return null;

    // RPC doesn't exist — check if table exists
    const { count, error: tableError } = await admin
      .from("admin_users")
      .select("*", { count: "exact", head: true });

    if (tableError) {
      return "Dashboard users table not found. Run the migration SQL in Supabase SQL Editor.";
    }

    // Table exists but is empty — seed the two required accounts
    if (count !== null && count === 0) {
      const adminHash = hashPassword("blank@2026");
      const dataHash = hashPassword("123456789");
      const { error: insertError } = await admin.from("admin_users").insert([
        { username: "admin", password_hash: adminHash, role: "admin" },
        { username: "data", password_hash: dataHash, role: "viewer" },
      ]);
      if (insertError) {
        return "Failed to seed admin users: " + insertError.message;
      }
    }

    return null;
  } catch (err) {
    return "Auth setup failed: " + (err instanceof Error ? err.message : String(err));
  }
}

export async function validateCredentials(
  username: string,
  password: string
): Promise<{ username: string; role: "admin" | "viewer" } | null> {
  return validateCredentialsFromDb(username, password);
}

export function createSessionToken(username: string, role: string): string {
  const payload = Buffer.from(
    JSON.stringify({ username, role, exp: Date.now() + SESSION_DURATION_MS })
  ).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(
  token: string
): { username: string; role: "admin" | "viewer"; exp: number } | null {
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!payload || !sig) return null;

  try {
    const expectedSig = createHmac("sha256", SECRET).update(payload).digest("hex");
    if (sig.length !== expectedSig.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(
  request: Request
): { username: string; role: "admin" | "viewer" } | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/admin_session=([^;]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  const session = verifySessionToken(token);
  if (!session) return null;
  return { username: session.username, role: session.role };
}

export function requireAdmin(request: Request): NextResponse | null {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
  }
  return null;
}
