import { NextResponse } from "next/server";

let orders = [];

export async function POST(req) {
  const data = await req.json();

  orders.push({
    id: Date.now(),
    ...data,
  });

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json(orders);
}