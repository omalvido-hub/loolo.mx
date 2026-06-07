"use client";

// Logo oficial de Nelzzon. Si /brand/nelzzon-logo.png no carga, cae a texto
// plano con APP_NAME — nunca queda un hueco vacío. Proporción fija (2048x720)
// para no deformar la imagen; solo cambia el tamaño según "size".

import { useState } from "react";
import Image from "next/image";
import { APP_NAME } from "@/lib/brand";

const LOGO_SRC = "/brand/nelzzon-logo.png";
const LOGO_WIDTH = 2048;
const LOGO_HEIGHT = 720;

interface BrandLogoProps {
  size: "horizontal" | "compact";
  className?: string;
}

const SIZES: Record<BrandLogoProps["size"], { width: number; height: number; textClassName: string }> = {
  horizontal: { width: 220, height: 77, textClassName: "text-2xl font-bold" },
  compact: { width: 120, height: 42, textClassName: "text-lg font-bold" },
};

export function BrandLogo({ size, className }: BrandLogoProps) {
  const [failed, setFailed] = useState(false);
  const { width, height, textClassName } = SIZES[size];

  if (failed) {
    return <span className={className ? `${textClassName} ${className}` : textClassName}>{APP_NAME}</span>;
  }

  return (
    <Image
      src={LOGO_SRC}
      alt={APP_NAME}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      style={{ width, height }}
      className={className}
      priority={size === "horizontal"}
      onError={() => setFailed(true)}
    />
  );
}
