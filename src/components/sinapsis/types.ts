// Formas de datos que src/app/dashboard/page.tsx (server) calcula a partir del
// backend real y pasa a los componentes de cliente de Sinapsis. Ningún campo
// aquí se inventa en el cliente — todo llega ya resuelto (o explícitamente
// null/"sin datos suficientes") desde el servidor.

export interface SinapsisFirmaItem {
  id: string;
  kind: "quote" | "plan";
  patientName: string;
  label: string;
  href: string;
  createdAt: string;
}

export interface SinapsisAhoraItem {
  id: string;
  patientName: string;
  startAt: string;
  endAt: string;
  status: string;
  isNow: boolean;
}

export interface SinapsisCarteraItem {
  id: string;
  patientName: string;
  href: string;
  balanceCents: number;
  quoteNumber: string | null;
  // Fecha de referencia para calcular antigüedad: acceptedAt del presupuesto,
  // o su createdAt si por alguna razón no quedó registrada la aceptación.
  acceptedAt: string;
}

export interface SinapsisTrendPoint {
  date: string;
  netCents: number;
}

export interface SinapsisDashboardData {
  userName: string;
  citasHoyCount: number;
  citasHoyHref: string;
  cobradoMesBrutoCents: number | null;
  metaPercent: number | null;
  ocupacionPercent: number | null;
  fechaISO: string;
  firmaItems: SinapsisFirmaItem[];
  ahoraItems: SinapsisAhoraItem[];
  carteraItems: SinapsisCarteraItem[];
  carteraTotalCents: number;
  tendencia: SinapsisTrendPoint[];
  gastoConfigured: boolean;
  flujoNetoCents: number | null;
  equilibrioCents: number | null;
}
