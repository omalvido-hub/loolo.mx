export const FINDING_TYPE_COLOR: Record<string, string> = {
  CARIES:      "#dc2626",
  RESTORATION: "#2563eb",
  CROWN:       "#7c3aed",
  ENDODONTICS: "#ea580c",
  IMPLANT:     "#6b7280",
  FRACTURE:    "#f59e0b",
  MOBILITY:    "#ca8a04",
  MISSING:     "#374151",
  SEALANT:     "#0891b2",
  OTHER:       "#9ca3af",
};

interface Props {
  x: number;
  y: number;
  width: number;
  height: number;
  findingType: string | null;
  rx?: number;
}

export function ToothSurfaceZone({ x, y, width, height, findingType, rx = 0 }: Props) {
  if (!findingType) return null;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      fill={FINDING_TYPE_COLOR[findingType] ?? "#9ca3af"}
      opacity={0.88}
    />
  );
}
