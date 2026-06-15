"use client";

// Renderiza el HTML de referencia aprobado (docs/visual-references/nelzzon-dashboard.html)
// literal, sin convertirlo a componentes React ni copiar su CSS. Solo para
// revisión visual interna — el iframe es un documento aislado.

interface ZipDashboardClientProps {
  html: string;
}

export function ZipDashboardClient({ html }: ZipDashboardClientProps) {
  return (
    <iframe
      title="Referencia visual Nelzzon — Tablero"
      srcDoc={html}
      className="fixed inset-0 h-screen w-screen border-0"
    />
  );
}
