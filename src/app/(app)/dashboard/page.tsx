import { getSessionWithMemberships } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const data = await getSessionWithMemberships();
  if (!data) redirect("/login");

  const { session, memberships } = data;
  const org = memberships[0]?.organization;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">
        Bienvenido, {session.user.name.split(" ")[0]}
      </h1>
      {org && (
        <p className="text-muted-foreground mb-8">{org.name}</p>
      )}
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-lg font-medium">Dashboard en construcción</p>
        <p className="text-sm mt-2">
          El esqueleto está listo. Agenda, pacientes y consultas vienen a continuación.
        </p>
      </div>
    </div>
  );
}
