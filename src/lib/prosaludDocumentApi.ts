import { getProsaludApiBaseUrl } from "@/lib/prosaludConvenioApi";

export function documentMetadataUrl(token: string): string {
  return `${getProsaludApiBaseUrl()}/public/document/${encodeURIComponent(token)}/metadata`;
}

export function documentPdfUrl(token: string): string {
  return `${getProsaludApiBaseUrl()}/public/document/${encodeURIComponent(token)}/document.pdf`;
}

export function documentSubmitUrl(token: string): string {
  return `${getProsaludApiBaseUrl()}/public/document/${encodeURIComponent(token)}/submit`;
}
