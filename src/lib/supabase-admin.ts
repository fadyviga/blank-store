import { createClient, SupabaseClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedClient: SupabaseClient | null = null;
let lastError: string | null = null;

export function isHtmlResponse(msg: string): boolean {
  return msg.includes("DOCTYPE") || msg.includes("<html") || msg.startsWith("<!");
}

export function isTableNotFound(msg: string): boolean {
  return msg.includes("Could not find the table") || msg.includes("does not exist");
}

export function isColumnNotFound(msg: string): boolean {
  return msg.includes("Could not find the") && msg.includes("column");
}

export function getResponseError(err: { message?: string } | null): {
  htmlResponse: boolean;
  tableNotFound: boolean;
  columnNotFound: boolean;
  cleanedMessage: string;
} {
  const msg = err?.message || "";
  return {
    htmlResponse: isHtmlResponse(msg),
    tableNotFound: isTableNotFound(msg),
    columnNotFound: isColumnNotFound(msg),
    cleanedMessage: msg.replace(/<[^>]*>/g, "").slice(0, 200),
  };
}

export async function verifySupabaseUrl(): Promise<{
  ok: boolean;
  status?: number;
  contentType?: string;
  bodyPreview?: string;
  error?: string;
}> {
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, error: "Supabase URL or service role key not configured" };
  }
  try {
    const testUrl = supabaseUrl.replace(/\/$/, "") + "/rest/v1/";
    const res = await fetch(testUrl, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    const ct = res.headers.get("content-type") || "";
    const text = await res.text();
    return {
      ok: res.ok || res.status === 401,
      status: res.status,
      contentType: ct,
      bodyPreview: ct.includes("text/html") ? "(HTML response - URL likely wrong)" : text.slice(0, 100),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function getAdminClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  if (!supabaseUrl) {
    lastError =
      "NEXT_PUBLIC_SUPABASE_URL is not configured. " +
      "Check that it points to your Supabase project URL (e.g. https://xxxx.supabase.co), NOT your Vercel deployment URL.";
    throw new Error(lastError);
  }

  if (!serviceRoleKey) {
    lastError =
      "SUPABASE_SERVICE_ROLE_KEY is not configured. " +
      "Add it to your Vercel Dashboard environment variables.\n" +
      "Get it from: Supabase Dashboard > Project Settings > API > service_role key";
    throw new Error(lastError);
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  lastError = null;
  return cachedClient;
}

export function getSupabaseStatus(): {
  configured: boolean;
  url: boolean;
  serviceRoleKey: boolean;
  error: string | null;
  supabaseUrl: string;
} {
  return {
    configured: !!supabaseUrl && !!serviceRoleKey,
    url: !!supabaseUrl,
    serviceRoleKey: !!serviceRoleKey,
    error: lastError,
    supabaseUrl: supabaseUrl ? supabaseUrl.replace(/\/\/[^@]+@/, "//***@") : "(empty)",
  };
}

export function resetSupabaseClient(): void {
  cachedClient = null;
}
