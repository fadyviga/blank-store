import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";
import { generateSnapshot } from "../_utils";

export async function GET() {
  try {
    const admin = getAdminClient();

    const { data: snapshots, error } = await admin
      .from("partner_snapshots")
      .select("*, partner_snapshot_items(*, partners(name))")
      .order("snapshot_date", { ascending: false });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound) {
        return NextResponse.json({ data: [], warning: "Snapshots table not found" });
      }
      return NextResponse.json({ error: parsed.cleanedMessage, data: [] }, { status: 200 });
    }

    return NextResponse.json(snapshots || []);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error", data: [] }, { status: 500 });
  }
}

export async function POST() {
  try {
    const admin = getAdminClient();

    const snapshot = await generateSnapshot(admin);

    const { data: items } = await admin
      .from("partner_snapshot_items")
      .select("*, partners(name)")
      .eq("snapshot_id", snapshot.id);

    return NextResponse.json({ ...snapshot, items: items || [] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
