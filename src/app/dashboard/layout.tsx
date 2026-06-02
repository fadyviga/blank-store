import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/dashboard-auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");

  if (!sessionCookie?.value) {
    redirect("/login");
  }

  const session = verifySessionToken(sessionCookie.value);
  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
