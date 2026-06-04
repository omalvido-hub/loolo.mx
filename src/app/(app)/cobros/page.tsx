import Link from "next/link";

export default function CobrosPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-8">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Cobros</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona un paciente para ver su historial de cobros.
        </p>
      </div>
      <Link
        href="/pacientes"
        className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
      >
        Ir a Pacientes
      </Link>
    </div>
  );
}
