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
} as const;
