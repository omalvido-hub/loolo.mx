export function OdontogramError({ detail }: { detail?: string }) {
  return (
    <div className="py-6 text-center text-sm text-destructive">
      No se pudo cargar el odontograma.{detail ? ` ${detail}` : ""}
    </div>
  );
}
