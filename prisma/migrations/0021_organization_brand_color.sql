-- LOOLO — Migración 0021_organization_brand_color
-- Identidad propia por clínica: color de marca (acento visual en header/botones).
-- Ejecutada por app_admin. SOLO AGREGA; no toca 0001–0020.
-- Nullable: ninguna organización existente cambia de apariencia hasta que se le
-- asigne un color explícitamente. Distinto de "resources"."color" (color de
-- sillón/doctor en agenda, migración 0015).

ALTER TABLE "organizations" ADD COLUMN "brandColor" TEXT;
