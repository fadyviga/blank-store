import { SupabaseClient } from "@supabase/supabase-js";

export interface PartnerCapital {
  capitalByPartner: Record<string, number>;
  totalCapital: number;
}

export async function computeCapital(admin: SupabaseClient): Promise<PartnerCapital> {
  const { data: allTx } = await admin
    .from("partner_transactions")
    .select("partner_id, amount, type");

  const capitalByPartner: Record<string, number> = {};
  let totalCapital = 0;
  for (const tx of allTx || []) {
    const delta = tx.type === "deposit" ? Number(tx.amount) : -Number(tx.amount);
    capitalByPartner[tx.partner_id] = (capitalByPartner[tx.partner_id] || 0) + delta;
    totalCapital += delta;
  }
  return { capitalByPartner, totalCapital };
}

export async function getLatestSnapshot(admin: SupabaseClient) {
  const { data: snapshots } = await admin
    .from("partner_snapshots")
    .select("id, total_capital")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!snapshots || snapshots.length === 0) return null;
  const snapshot = snapshots[0];

  const { data: items } = await admin
    .from("partner_snapshot_items")
    .select("partner_id, capital, percentage")
    .eq("snapshot_id", snapshot.id);

  return { ...snapshot, items: items || [] };
}

export async function generateSnapshot(admin: SupabaseClient) {
  const { capitalByPartner, totalCapital } = await computeCapital(admin);

  const { data: snapshot, error: snapErr } = await admin
    .from("partner_snapshots")
    .insert({ total_capital: totalCapital })
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
