"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TenantAccessDeniedProps {
  tenantSlug: string;
}

export function TenantAccessDenied({ tenantSlug }: TenantAccessDeniedProps) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Sin acceso a esta clínica</CardTitle>
          <CardDescription>
            Tu cuenta no tiene permiso para entrar a &ldquo;{tenantSlug}&rdquo;. Pide acceso al administrador de esa clínica o entra con otra cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" className="w-full" onClick={handleSignOut}>
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
