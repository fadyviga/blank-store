import { SupabaseClient } from "@supabase/supabase-js";

export interface PartnerCapital {
  capitalByPartner: Record<string, number>;
  totalCapital: number;
}

/** Compute capital by summing transactions up to a given date */
export async function computeCapital(
  admin: SupabaseClient,
  upToDate?: string
): Promise<PartnerCapital> {
  let query = admin
    .from("partner_transactions")
    .select("partner_id, amount, type");

  if (upToDate) {
    query = query.lte("date", upToDate);
  }

  const { data: allTx } = await query;

  const capitalByPartner: Record<string, number> = {};
  let totalCapital = 0;
  for (const tx of allTx || []) {
    const delta = tx.type === "deposit" ? Number(tx.amount) : -Number(tx.amount);
    capitalByPartner[tx.partner_id] = (capitalByPartner[tx.partner_id] || 0) + delta;
    totalCapital += delta;
  }
  return { capitalByPartner, totalCapital };
}

/** Get the latest snapshot */
export async function getLatestSnapshot(admin: SupabaseClient) {
  const { data: snapshots } = await admin
    .from("partner_snapshots")
    .select("id, total_capital, snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1);

  if (!snapshots || snapshots.length === 0) return null;
  const snapshot = snapshots[0];

  const { data: items } = await admin
    .from("partner_snapshot_items")
    .select("partner_id, capital, percentage")
    .eq("snapshot_id", snapshot.id);

  return { ...snapshot, items: items || [] };
}

/** Get the snapshot that was active at a given date (the most recent snapshot at or before that date) */
export async function getSnapshotAtDate(admin: SupabaseClient, date: string) {
  const { data: snapshots } = await admin
    .from("partner_snapshots")
    .select("id, total_capital, snapshot_date")
    .lte("snapshot_date", date)
    .order("snapshot_date", { ascending: false })
    .limit(1);

  if (!snapshots || snapshots.length === 0) return null;
  const snapshot = snapshots[0];

  const { data: items } = await admin
    .from("partner_snapshot_items")
    .select("*, partners(name)")
    .eq("snapshot_id", snapshot.id);

  return { ...snapshot, items: items || [] };
}

/** Get all snapshots within a date range, ordered chronologically */
export async function getSnapshotsInRange(
  admin: SupabaseClient,
  startDate: string,
  endDate: string
) {
  const { data: snapshots } = await admin
    .from("partner_snapshots")
    .select("id, total_capital, snapshot_date")
    .gte("snapshot_date", startDate)
    .lte("snapshot_date", endDate)
    .order("snapshot_date", { ascending: true });

  if (!snapshots || snapshots.length === 0) return [];

  const result = [];
  for (const s of snapshots) {
    const { data: items } = await admin
      .from("partner_snapshot_items")
      .select("*, partners(name)")
      .eq("snapshot_id", s.id);
    result.push({ ...s, items: items || [] });
  }
  return result;
}

/** Generate a snapshot at a given date (defaults to now) */
export async function generateSnapshot(
  admin: SupabaseClient,
  snapshotDate?: string
) {
  const date = snapshotDate || new Date().toISOString();
  const { capitalByPartner, totalCapital } = await computeCapital(admin, date);

  const { data: snapshot, error: snapErr } = await admin
    .from("partner_snapshots")
    .insert({ total_capital: totalCapital, snapshot_date: date })
    .select()
    .single();

  if (snapErr || !snapshot) throw snapErr || new Error("Failed to create snapshot");

  const items = Object.entries(capitalByPartner)
    .filter(([, capital]) => capital !== 0)
    .map(([partnerId, capital]) => ({
      snapshot_id: snapshot.id,
      partner_id: partnerId,
      capital,
      percentage: totalCapital > 0 ? capital / totalCapital : 0,
    }));

  if (items.length > 0) {
    const { error: itemErr } = await admin.from("partner_snapshot_items").insert(items);
    if (itemErr) throw itemErr;
  }

  return snapshot;
}

export async function getTransactionsByPartner(admin: SupabaseClient) {
  const { data: allTx } = await admin
    .from("partner_transactions")
    .select("partner_id");

  const partnerIds = new Set<string>();
  for (const tx of allTx || []) {
    partnerIds.add(tx.partner_id);
  }
  return partnerIds;
}
