import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

interface LedgerEntry {
  date: string;
  type: string;
  description: string;
  amount: number;
  runningBalance: number;
}

export async function GET() {
  try {
    const admin = getAdminClient();
    const entries: { date: string; type: string; description: string; amount: number }[] = [];

    // Load partner names
    const partnersMap: Record<string, string> = {};
    const { data: partnersRaw } = await admin.from("partners").select("id, name");
    for (const p of partnersRaw || []) {
      partnersMap[p.id] = (p as { name: string }).name;
    }

    // Partner transactions (deposits & withdrawals)
    const { data: partnerTx } = await admin
      .from("partner_transactions")
      .select("amount, type, date, created_at, partner_id")
      .order("date", { ascending: true, nullsFirst: false });

    for (const tx of partnerTx || []) {
      const txDate = tx.date || tx.created_at;
      if (!txDate) continue;
      const pName = partnersMap[tx.partner_id] || "Unknown";
      const isDeposit = tx.type === "deposit";
      entries.push({
        date: txDate,
        type: isDeposit ? "Partner Deposit" : "Partner Withdrawal",
        description: `${pName} - ${isDeposit ? "Deposit" : "Withdrawal"}`,
        amount: isDeposit ? Number(tx.amount) : -Number(tx.amount),
      });
    }

    // Completed order revenue
    const { data: orders } = await admin
      .from("orders")
      .select("subtotal, discount_amount, created_at, id")
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    for (const o of orders || []) {
      const revenue = (Number(o.subtotal) || 0) - (Number(o.discount_amount) || 0);
      if (revenue <= 0) continue;
      entries.push({
        date: o.created_at,
        type: "Order Revenue",
        description: `Order #${o.id}`,
        amount: revenue,
      });
    }

    // Purchases
    const { data: purchases } = await admin
      .from("purchases")
      .select("total_cost, created_at, supplier_name")
      .order("created_at", { ascending: true });

    for (const p of purchases || []) {
      entries.push({
        date: p.created_at,
        type: "Purchase",
        description: (p as { supplier_name?: string }).supplier_name || "Purchase",
        amount: -(Number(p.total_cost) || 0),
      });
    }

    // Expenses
    const { data: expenses } = await admin
      .from("expenses")
      .select("amount, date, created_at, title")
      .order("date", { ascending: true });

    for (const e of expenses || []) {
      entries.push({
        date: e.date || e.created_at,
        type: "Expense",
        description: (e as { title?: string }).title || "Expense",
        amount: -(Number(e.amount) || 0),
      });
    }

    // Sort by date, then by type priority
    const typeOrder: Record<string, number> = {
      "Partner Deposit": 0,
      "Order Revenue": 1,
      "Purchase": 2,
      "Expense": 3,
      "Partner Withdrawal": 4,
    };

    // Normalize date to UTC for sorting (parse without timezone as UTC)
    function parseAsUTC(dateStr: string): number {
      if (dateStr.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
        return new Date(dateStr).getTime();
      }
      return new Date(dateStr + "Z").getTime();
    }

    entries.sort((a, b) => {
      const dateCmp = parseAsUTC(a.date) - parseAsUTC(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
    });

    // Compute running balance
    let running = 0;
    const ledger: LedgerEntry[] = entries.map((e) => {
      running += e.amount;
      return { ...e, runningBalance: running };
    });

    return NextResponse.json(ledger);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
