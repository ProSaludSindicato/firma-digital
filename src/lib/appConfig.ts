/**
 * Configuración de producto / marca. Valores estáticos por defecto.
 *
 * Con API: obtén el JSON al arranque (p. ej. en el layout o `App`) y guarda títulos en
 * React state/context; pasa `title` a `<Header />` como hacen Index y AutoSign hoy.
 */
export const appConfig = {
  /** Título del header en el flujo de firma manual (página principal). */
  headerTitle: "Convenio de afiliación ProSalud",
  /** Título del header en la ruta de firma automática. */
  autoSignHeaderTitle: "Firma automática de documentos",
} as const;
