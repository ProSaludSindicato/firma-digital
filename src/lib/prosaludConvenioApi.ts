/**
 * Base URL of the ProSalud API (including `/api`), e.g. `https://api.example.com/api`
 */
export function getProsaludApiBaseUrl(): string {
  const raw = import.meta.env.VITE_PROSALUD_API_URL as string | undefined;
  if (!raw || !raw.trim()) {
    throw new Error(
      "VITE_PROSALUD_API_URL no está definida. Configúrela en el entorno del build (URL base de la API, con /api al final si aplica).",
    );
  }

  return raw.replace(/\/$/, "");
}

export function convenioFirmaMetadataUrl(token: string): string {
  return `${getProsaludApiBaseUrl()}/public/convenio-firma/${encodeURIComponent(token)}/metadata`;
}

export function convenioFirmaDocumentUrl(token: string): string {
  return `${getProsaludApiBaseUrl()}/public/convenio-firma/${encodeURIComponent(token)}/document.pdf`;
}

export function convenioFirmaSubmitUrl(token: string): string {
  return `${getProsaludApiBaseUrl()}/public/convenio-firma/${encodeURIComponent(token)}/submit-affiliate-signature`;
}

export function convenioFirmaSatisfactionUrl(token: string): string {
  return `${getProsaludApiBaseUrl()}/public/convenio-firma/${encodeURIComponent(token)}/satisfaction-rating`;
}
