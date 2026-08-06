"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await requestPasswordReset({ email, redirectTo: "/reset-password" });
    setLoading(false);
    // Siempre mostramos el mismo mensaje exista o no la cuenta — evita revelar
    // qué correos están registrados (mismo comportamiento que ya usa el propio
    // endpoint de Better Auth, ver request-password-reset en el server).
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="flex justify-center">
            <BrandLogo size="horizontal" />
          </CardTitle>
          <CardDescription>Recupera el acceso a tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Si <strong>{email}</strong> tiene una cuenta, te mandamos un correo con instrucciones para elegir una contraseña nueva.
              </p>
              <Link href="/login" className="text-sm underline underline-offset-2">
                Volver a ingresar
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="correo@clinica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace de recuperación"}
              </Button>
              <Link href="/login" className="block text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
                Volver a ingresar
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
