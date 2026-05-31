import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

const ALLOWED_CATEGORIES = [
  "Facebook Ads",
  "Instagram Ads",
  "TikTok Ads",
  "Google Ads",
  "Shipping",
  "Packaging",
  "Salaries",
  "Rent",
  "Other",
] as const;

type ExpenseCategory = (typeof ALLOWED_CATEGORIES)[number];

function isValidCategory(value: string): value is ExpenseCategory {
  return (ALLOWED_CATEGORIES as readonly string[]).includes(value);
}

export async function GET() {
  const logId = Date.now().toString(36);
  console.log(`[api/expenses:${logId}] GET`);

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.htmlResponse || parsed.tableNotFound) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { title, category, amount, notes, date } = body as {
      title?: string;
      category?: string;
      amount?: number;
      notes?: string;
      date?: string;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!category?.trim()) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (!isValidCategory(category.trim())) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }
    if (amount == null || typeof amount !== "number" || amount < 0) {
      return NextResponse.json({ error: "Amount must be a non-negative number" }, { status: 400 });
    }

    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      return NextResponse.json(
        { error: configErr instanceof Error ? configErr.message : "Supabase not configured" },
        { status: 500 }
      );
    }

    const { data: inserted, error: insertErr } = await admin
      .from("expenses")
      .insert({
        title: title.trim(),
        category: category.trim(),
        amount: Math.round(amount * 100) / 100,
        notes: notes?.trim() || null,
        date: date || new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (insertErr) {
      console.error(`[api/expenses:${logId}] Insert error:`, insertErr);
      const parsed = getResponseError(insertErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json(inserted, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, title, category, amount, notes, date } = body as {
      id?: number;
      title?: string;
      category?: string;
      amount?: number;
      notes?: string;
      date?: string;
    };

    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }
    if (category && !isValidCategory(category.trim())) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }
    if (amount != null && (typeof amount !== "number" || amount < 0)) {
      return NextResponse.json({ error: "Amount must be a non-negative number" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (title?.trim()) updates.title = title.trim();
    if (category?.trim()) updates.category = category.trim();
    if (amount != null) updates.amount = Math.round(amount * 100) / 100;
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (date) updates.date = date;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      return NextResponse.json(
        { error: configErr instanceof Error ? configErr.message : "Supabase not configured" },
        { status: 500 }
      );
    }

    const { data: updated, error: updateErr } = await admin
      .from("expenses")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error(`[api/expenses:${logId}] Update error:`, updateErr);
      const parsed = getResponseError(updateErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      return NextResponse.json(
        { error: configErr instanceof Error ? configErr.message : "Supabase not configured" },
        { status: 500 }
      );
    }

    const { error: deleteErr } = await admin.from("expenses").delete().eq("id", id);

    if (deleteErr) {
      const parsed = getResponseError(deleteErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
