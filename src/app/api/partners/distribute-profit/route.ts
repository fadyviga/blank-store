import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";
import { getSnapshotsInRange, getSnapshotAtDate } from "../_utils";
import { requireAdmin } from "@/lib/dashboard-auth";

export async function POST(request: NextRequest) {
  const access = requireAdmin(request);
  if (access) return access;
  try {
    const body = await request.json();
    const { periodStart, periodEnd, netProfit } = body;

    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: "periodStart and periodEnd are required" }, { status: 400 });
    }
    if (netProfit === undefined || netProfit === null) {
      return NextResponse.json({ error: "netProfit is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: partners, error: pErr } = await admin
      .from("partners")
      .select("id, name");

    if (pErr) {
      const parsed = getResponseError(pErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    if (!partners || partners.length === 0) {
      return NextResponse.json({ error: "No partners found" }, { status: 400 });
    }

    // Get all snapshots that fall within the profit period
    const periodSnapshots = await getSnapshotsInRange(admin, periodStart, periodEnd);

    // Get the snapshot active just before the period starts (if any)
    const priorSnapshot = await getSnapshotAtDate(admin, periodStart);

    // Build ownership timeline segments
    interface Segment {
      startDate: string;
      endDate: string;
      ownerships: { partner_id: string; capital: number; percentage: number }[];
    }

    const segments: Segment[] = [];

    if (priorSnapshot) {
      // There's a snapshot before period start; use it until the first in-period snapshot
      const firstInPeriod = periodSnapshots.length > 0 ? periodSnapshots[0] : null;
      if (firstInPeriod) {
        segments.push({
          startDate: periodStart,
          endDate: firstInPeriod.snapshot_date,
          ownerships: priorSnapshot.items.map((item: any) => ({
            partner_id: item.partner_id,
            capital: Number(item.capital),
            percentage: Number(item.percentage),
          })),
        });
      } else {
        // No snapshots in period, use prior snapshot for the whole period
        segments.push({
          startDate: periodStart,
          endDate: periodEnd,
          ownerships: priorSnapshot.items.map((item: any) => ({
            partner_id: item.partner_id,
            capital: Number(item.capital),
            percentage: Number(item.percentage),
          })),
        });
      }
    } else if (periodSnapshots.length > 0) {
      // No prior snapshot, use first in-period snapshot from period start
      segments.push({
        startDate: periodStart,
        endDate: periodSnapshots[0].snapshot_date,
        ownerships: periodSnapshots[0].items.map((item: any) => ({
          partner_id: item.partner_id,
          capital: Number(item.capital),
          percentage: Number(item.percentage),
        })),
      });
    }

    // Add segments for each snapshot in the period
    for (let i = 0; i < periodSnapshots.length; i++) {
      const snap = periodSnapshots[i];
      const nextSnap = periodSnapshots[i + 1];
      segments.push({
        startDate: snap.snapshot_date,
        endDate: nextSnap ? nextSnap.snapshot_date : periodEnd,
        ownerships: snap.items.map((item: any) => ({
          partner_id: item.partner_id,
          capital: Number(item.capital),
          percentage: Number(item.percentage),
        })),
      });
    }

    // Calculate total days in the profit period
    const periodStartMs = new Date(periodStart).getTime();
    const periodEndMs = new Date(periodEnd).getTime();
    const totalDays = Math.max(1, (periodEndMs - periodStartMs) / 86400000);

    // Accumulate profit shares per partner
    const profitShares: Record<string, number> = {};
    const capitalInPeriod: Record<string, { capital: number; ownership: number }> = {};
    let totalCapitalUsed = 0;

    for (const partner of partners || []) {
      profitShares[partner.id] = 0;
      capitalInPeriod[partner.id] = { capital: 0, ownership: 0 };
    }

    for (const segment of segments) {
      const segStart = new Date(segment.startDate).getTime();
      const segEnd = new Date(segment.endDate).getTime();
      const segDays = Math.max(0, (segEnd - segStart) / 86400000);
      const segWeight = segDays / totalDays;
      const segProfit = Number(netProfit) * segWeight;

      for (const owner of segment.ownerships) {
        profitShares[owner.partner_id] =
          (profitShares[owner.partner_id] || 0) + segProfit * owner.percentage;
        // Track the latest capital/ownership for display
        capitalInPeriod[owner.partner_id] = {
          capital: owner.capital,
          ownership: owner.percentage,
        };
      }
    }

    // If no segments (no snapshots at all), use uniform distribution
    const hasSegments = segments.length > 0;
    if (!hasSegments) {
      const uniformShare = Number(netProfit) / (partners?.length || 1);
      for (const partner of partners || []) {
        profitShares[partner.id] = uniformShare;
      }
    }

    // Calculate totals
    let totalCapital = 0;
    const usedCapitals = new Set<string>();
    for (const seg of segments) {
      for (const owner of seg.ownerships) {
        if (!usedCapitals.has(owner.partner_id)) {
          totalCapital += owner.capital;
          usedCapitals.add(owner.partner_id);
        }
      }
    }
    if (totalCapital === 0 && segments.length > 0) {
      totalCapital = Number(segments[segments.length - 1].ownerships.reduce(
        (sum: number, o: any) => sum + o.capital, 0
      ));
    }

    const result = (partners || []).map((partner) => {
      const info = capitalInPeriod[partner.id] || { capital: 0, ownership: 0 };
      return {
        partner_id: partner.id,
        partner_name: partner.name,
        capital: info.capital,
        ownershipPercentage: info.ownership,
        profitShare: Number((profitShares[partner.id] || 0).toFixed(2)),
      };
    });

    return NextResponse.json({
      periodStart,
      periodEnd,
      netProfit: Number(netProfit),
      totalCapital,
      segments: segments.map((s) => ({
        startDate: s.startDate,
        endDate: s.endDate,
        weight: Math.max(0, (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 86400000 / totalDays),
        ownerships: s.ownerships,
      })),
      distributions: result,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid JSON" }, { status: 400 });
  }
}
