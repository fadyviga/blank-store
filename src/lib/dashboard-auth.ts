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

const FALLBACK_USERS: Record<string, { password: string; role: "admin" | "viewer" }> = {
  admin: { password: "blank@2026", role: "admin" },
  data: { password: "123456789", role: "viewer" },
};

export function validateCredentialsFallback(
  username: string,
  password: string
): { username: string; role: "admin" | "viewer" } | null {
  const user = FALLBACK_USERS[username];
  if (!user || user.password !== password) return null;
  return { username, role: user.role };
}

export async function validateCredentials(
  username: string,
  password: string
): Promise<{ username: string; role: "admin" | "viewer" } | null> {
  const dbResult = await validateCredentialsFromDb(username, password);
  if (dbResult) return dbResult;
  return validateCredentialsFallback(username, password);
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
