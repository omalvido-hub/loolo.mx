// Presentacional puro. Error genérico al cargar datos clínicos.

interface Props {
  message?: string;
}

export function ClinicalError({ message }: Props) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message ?? "Error al cargar el expediente clínico."}
    </div>
  );
}
