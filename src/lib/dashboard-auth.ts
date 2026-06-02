import { createHmac, timingSafeEqual, scryptSync, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAdminClient } from "./supabase-admin";
export { getAdminClient } from "./supabase-admin";

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

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.admin_users (username, password_hash, role) VALUES
  ('admin', '83725399088ae092fb3cc1074c77a893:caede31f212cf18984596be81d62a7241812bd5e026370b01991a3855fa3677fddb99783ff66632659673f3d37e014ef1245d72e21c9b08a24102da132d8a672', 'admin'),
  ('data', 'a44415658dcbcd95ddd13e1138a47c88:e6669c4166ead2727edf9f7a60115de4047a2c83d0560720f6034c9828b466908b8b52e938c494c519c6fdb483d601deb98274bf9ae288ec91ef39f913783ae3', 'viewer')
ON CONFLICT (username) DO NOTHING;
`;

async function tryCreateTableRemotely(): Promise<boolean> {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mgmtToken = process.env.SUPABASE_MGMT_TOKEN;
  const databaseUrl = process.env.DATABASE_URL;

  const projectRef = supabaseUrl.match(/https:\/\/(.+)\.supabase\.co/)?.[1];

  // Method A: Direct pg connection via DATABASE_URL
  if (databaseUrl) {
    try {
      const { default: postgres } = await import("postgres");
      const sql = postgres(databaseUrl);
      await sql.unsafe(CREATE_TABLE_SQL);
      await sql.end();
      return true;
    } catch {
      // fall through
    }
  }

  // Method B: Supabase Management API
  if (mgmtToken && projectRef) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/sql`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mgmtToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: CREATE_TABLE_SQL }),
      });
      if (res.ok) return true;
    } catch {
      // fall through
    }
  }

  return false;
}

export async function ensureAdminUsersTable(): Promise<string | null> {
  try {
    const admin = getAdminClient();

    // Try the RPC function first (creates table + seeds only when empty)
    const { error: rpcError } = await admin.rpc("ensure_admin_users");
    if (!rpcError) return null;

    // RPC doesn't exist — check if table has rows
    const { data: existing, error: tableError } = await admin
      .from("admin_users")
      .select("id")
      .limit(1);

    if (tableError) {
      // Table doesn't exist — try to create it at runtime
      const created = await tryCreateTableRemotely();
      if (created) {
        // Table now exists and was seeded — retry should work
        return null;
      }

      // Build a useful error message with the project URL
      const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "");
      const projectRef = supabaseUrl.match(/https:\/\/(.+)\.supabase\.co/)?.[1] || supabaseUrl;

      return [
        `Dashboard users table not found in Supabase project: ${projectRef}.supabase.co`,
        "",
        "Fix: Go to https://supabase.com/dashboard/project/" + projectRef + "/sql/new",
        "Paste this SQL and click RUN:",
        "",
        "--- SQL BEGIN ---",
        CREATE_TABLE_SQL.trim(),
        "--- SQL END ---",
        "",
        "Alternative: add DATABASE_URL (postgres connection string) or SUPABASE_MGMT_TOKEN to Vercel env vars for auto-bootstrap.",
      ].join("\n");
    }

    // Table exists but is empty — seed the two required accounts
    if (existing && existing.length === 0) {
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
