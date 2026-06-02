import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

const SECRET = process.env.DASHBOARD_AUTH_SECRET || "bl4nk-st0re-d4shb04rd-s3cr3t";

const USERS: Record<string, { password: string; role: "admin" | "viewer" }> = {
  admin: { password: "blank@2026", role: "admin" },
  data: { password: "123456789", role: "viewer" },
};

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function getValidUsers(): Array<{ username: string; role: string }> {
  return Object.entries(USERS).map(([username, u]) => ({ username, role: u.role }));
}

export function validateCredentials(
  username: string,
  password: string
): { username: string; role: "admin" | "viewer" } | null {
  const user = USERS[username];
  if (!user || user.password !== password) return null;
  return { username, role: user.role };
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
