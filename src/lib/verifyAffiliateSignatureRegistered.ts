import { convenioFirmaMetadataUrl } from "@/lib/prosaludConvenioApi";

export type AffiliateSignatureVerification = {
  registered: boolean;
  firmadoAfiliadoAt: string | null;
};

type MetadataPayload = {
  success?: boolean;
  data?: {
    signing_estado?: string | null;
    can_sign?: boolean;
    firmado_afiliado_at?: string | null;
  };
};

function isRegisteredEstado(estado: string | null | undefined): boolean {
  return estado === "firmado_afiliado" || estado === "completado";
}

export async function verifyAffiliateSignatureRegistered(
  token: string,
): Promise<AffiliateSignatureVerification> {
  try {
    const res = await fetch(convenioFirmaMetadataUrl(token));
    const json = (await res.json()) as MetadataPayload;
    const estado = json.data?.signing_estado;
    const registered = Boolean(json.success && isRegisteredEstado(estado));

    return {
      registered,
      firmadoAfiliadoAt: json.data?.firmado_afiliado_at ?? null,
    };
  } catch {
    return {
      registered: false,
      firmadoAfiliadoAt: null,
    };
  }
}
