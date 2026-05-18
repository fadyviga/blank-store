import { NextResponse } from "next/server";

let orders: any[] = [];

export async function GET() {
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const body = await req.json();
  orders.push(body);

  return NextResponse.json({
    success: true,
  });
}