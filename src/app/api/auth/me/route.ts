import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/dashboard-auth";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ username: session.username, role: session.role });
}
