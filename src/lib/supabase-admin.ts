import { createClient, SupabaseClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedClient: SupabaseClient | null = null;
let lastError: string | null = null;

export function getAdminClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  if (!supabaseUrl) {
    lastError = "NEXT_PUBLIC_SUPABASE_URL is not configured in .env.local";
    throw new Error(lastError);
  }

  if (!serviceRoleKey) {
    lastError =
      "SUPABASE_SERVICE_ROLE_KEY is not configured. " +
      "Add it to .env.local to enable server-side database operations.\n" +
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
} {
  return {
    configured: !!supabaseUrl && !!serviceRoleKey,
    url: !!supabaseUrl,
    serviceRoleKey: !!serviceRoleKey,
    error: lastError,
  };
}

export function resetSupabaseClient(): void {
  cachedClient = null;
}
