/**
 * Servicio abstracto para localización de firma en PDFs.
 * 
 * Arquitectura desacoplada: la interfaz SignatureLocationProvider permite
 * cambiar fácilmente entre proveedores de IA (Lovable AI, Google Gemini directo,
 * OpenAI, etc.) sin afectar el resto de la aplicación.
 * 
 * Para cambiar de proveedor, solo se necesita:
 * 1. Crear una nueva clase que implemente SignatureLocationProvider
 * 2. Cambiar la instancia en createSignatureLocationProvider()
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Interfaces ───────────────────────────────────────────────

export interface TextLocation {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SignaturePosition {
  x: number;
  y: number;
  page: number;
}

export interface FindTextOptions {
  pdfFile: File;
  searchText: string;
  pageNumber?: number;
}

/**
 * Interfaz que cualquier proveedor de IA debe implementar.
 * Para migrar a otro proveedor, crea una clase que implemente esta interfaz.
 */
export interface SignatureLocationProvider {
  /** Nombre del proveedor para logs y debug */
  readonly providerName: string;

  /** Busca un texto en el PDF y retorna su ubicación */
  findTextInPDF(options: FindTextOptions): Promise<TextLocation | null>;
}

// ─── Implementación: Lovable AI (via Edge Function) ───────────

class LovableAIProvider implements SignatureLocationProvider {
  readonly providerName = "Lovable AI";

  async findTextInPDF(options: FindTextOptions): Promise<TextLocation | null> {
    const { pdfFile, searchText, pageNumber } = options;

    // Convertir PDF a base64
    const pdfBase64 = await this.fileToBase64(pdfFile);

    const { data, error } = await supabase.functions.invoke("find-text-in-pdf", {
      body: { pdfBase64, searchText, pageNumber },
    });

    if (error) {
      console.error(`[${this.providerName}] Error:`, error);
      throw new Error(error.message || "Error al buscar texto con IA");
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data?.location ?? null;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// ─── Ejemplo: Proveedor manual/directo (para migración futura) ─
//
// class DirectGeminiProvider implements SignatureLocationProvider {
//   readonly providerName = "Google Gemini (Directo)";
//   private apiKey: string;
//
//   constructor(apiKey: string) {
//     this.apiKey = apiKey;
//   }
//
//   async findTextInPDF(options: FindTextOptions): Promise<TextLocation | null> {
//     // Implementar llamada directa a Google Gemini API
//     // usando this.apiKey
//     throw new Error("Not implemented");
//   }
// }

// ─── Factory ──────────────────────────────────────────────────

/**
 * Crea el proveedor de localización de firma.
 * Para cambiar de proveedor, modifica esta función.
 */
export function createSignatureLocationProvider(): SignatureLocationProvider {
  return new LovableAIProvider();
}

// ─── Utilidad de posición ─────────────────────────────────────

/**
 * Calcula la posición de la firma relativa a la línea de firma encontrada
 * Nota: X siempre es 80 (fijado temporalmente)
 * Y viene de la IA (posición de la línea de firma encima del bloque)
 */
export function calculateSignaturePosition(
  textLocation: TextLocation,
  offsetX: number = 0,
  offsetY: number = 0, // Por defecto 0, ya que las coordenadas son de la línea de firma
): SignaturePosition {
  return {
    x: 80, // X fijado en 80 (temporalmente)
    y: Math.max(0, textLocation.y + offsetY),
    page: textLocation.page,
  };
}
