import { NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";
import { getLatestSnapshot } from "../../_utils";

export async function GET() {
  try {
    const admin = getAdminClient();

    const snapshot = await getLatestSnapshot(admin);

    if (!snapshot) {
      return NextResponse.json({ data: null, warning: "No snapshots found" });
    }

    const { data: items } = await admin
      .from("partner_snapshot_items")
      .select("*, partners(name)")
      .eq("snapshot_id", snapshot.id);

    return NextResponse.json({ ...snapshot, items: items || [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
