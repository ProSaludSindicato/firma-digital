export function getProsaludPortalUrl(): string | undefined {
  const portal = import.meta.env.VITE_PROSALUD_PORTAL_URL?.trim().replace(/\/$/, "");
  return portal || undefined;
}

function buildDataTreatmentPolicyUrl(): string {
  const portal = getProsaludPortalUrl();
  if (portal) {
    return `${portal}/politica-de-tratamiento-de-datos`;
  }

  return "https://www.prosalud.org.co/politica-de-tratamiento-de-datos";
}

/** Herramientas sin token (`/` y `/editor`). Solo `true` o `1` las habilitan. */
export function parsePublicToolsEnabledFlag(value: string | undefined): boolean {
  const raw = value?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

export function isPublicToolsEnabled(): boolean {
  return parsePublicToolsEnabledFlag(import.meta.env.VITE_PUBLIC_TOOLS_ENABLED);
}

/**
 * Configuración de producto / marca. Valores estáticos por defecto.
 *
 * Con API: obtén el JSON al arranque (p. ej. en el layout o `App`) y guarda títulos en
 * React state/context; pasa `title` a `<Header />` como hacen Index y AutoSign hoy.
 */
export const appConfig = {
  /**
   * Título por defecto del header cuando aún no hay metadata del API (carga inicial / Index).
   * El flujo por token usa `header_title` devuelto por `/metadata`.
   */
  headerTitle: "Convenio de afiliación ProSalud",
  /** Título del header en la ruta de firma automática. */
  autoSignHeaderTitle: "Firma automática de documentos",
  /** Título del editor de documentos con campos dinámicos. */
  editorHeaderTitle: "Editor de documentos",
  /** Título por defecto del flujo genérico por token. */
  documentHeaderTitle: "Completar documento",
  /** Logo para cabeceras de confirmación (archivo en `public/`). */
  proSaludBrandLogoSrc: "/prosalud-logo.webp",
  /** URL pública de la política de tratamiento de datos personales (portal ProSalud). */
  dataTreatmentPolicyUrl: buildDataTreatmentPolicyUrl(),
  /** Correo de soporte para afiliados (estados bloqueados y herramientas públicas deshabilitadas). */
  affiliateHelpEmail: "auxiliartalento.sprosalud@gmail.com",
} as const;
