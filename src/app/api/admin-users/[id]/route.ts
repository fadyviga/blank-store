import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/dashboard-auth";

export async function DELETE(request: NextRequest) {
  const access = requireAdmin(request);
  if (access) return access;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { error } = await admin.from("admin_users").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
