// Resuelve el subdominio de clínica (ej. "clinicaperez" en clinicaperez.nelzzon.app)
// a partir del header Host. Es solo una PISTA de qué organización se espera —
// nunca autoriza acceso por sí sola. La verificación real de membresía sigue
// viviendo en selectOrganization() / assertCanSelectOrganization().

const RESERVED_SUBDOMAINS = new Set(["www", "app", "api"]);

export const TENANT_HEADER = "x-tenant-slug";

function stripSuffix(hostname: string, suffix: string): string | null {
  if (!hostname.endsWith(`.${suffix}`)) return null;
  const sub = hostname.slice(0, -(suffix.length + 1));
  if (!sub || sub.includes(".") || RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

/** `host` es el header Host completo (puede traer puerto, ej. "clinicaperez.localhost:3000"). */
export function extractTenantSlug(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();

  const rootDomain = process.env.ROOT_DOMAIN;
  if (rootDomain) {
    const fromRoot = stripSuffix(hostname, rootDomain);
    if (fromRoot) return fromRoot;
  }

  return stripSuffix(hostname, "localhost");
}
