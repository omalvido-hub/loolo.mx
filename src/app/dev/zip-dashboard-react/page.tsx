import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ZipDashboardReactClient } from "./ZipDashboardReactClient";

export const dynamic = "force-dynamic";

export default async function ZipDashboardReactPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <ZipDashboardReactClient />;
}
