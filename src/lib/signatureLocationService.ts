/**
 * Servicio abstracto para localización de firma en PDFs.
 *
 * Estrategia activa:
 *  1. PDFJSTextExtractionProvider — extracción determinística con pdfjs-dist.
 *     Funciona para PDFs con texto seleccionable (convenios ProSalud).
 *     a) Busca la LÍNEA GRÁFICA HORIZONTAL (vectorial) que está justo encima
 *        del bloque de firma del presidente, usando getOperatorList().
 *     b) Fallback interno local: baseline del nombre + offset calibrado.
 *
 * No usa proveedores de IA remotos. Si no se logra detectar la posición
 * con este proveedor, la operación debe fallar para ese documento.
 */

import { pdfjsLib, OPS } from "@/lib/pdfjsSetup";
import { loadPdfjsDocumentFromBytes } from "@/lib/loadPdfjsDocument";
import { AI_SEARCH_CONFIG } from "@/lib/autoSignConfig";
import { CONVENIO_SIGNATURE_PAGE } from "@/lib/convenioEditorConfig";
import { getFieldSizeLimits } from "@/lib/fieldDefaults";
import type { ApiDocumentField } from "@/types/documentEditor";

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

export interface SignatureLocationProvider {
  readonly providerName: string;
  findTextInPDF(options: FindTextOptions): Promise<TextLocation | null>;
}

export interface HorizontalLine {
  y: number;
  length: number;
  x: number;
}

export interface AffiliateFieldFromLineParams {
  lineX: number;
  lineY: number;
  pageHeight: number;
  page: number;
  width: number;
  height: number;
}

export interface DetectAffiliateSignatureOptions {
  isMobile?: boolean;
  searchText?: string;
  pageNumber?: number;
}

// ─── Constantes ───────────────────────────────────────────────

// Offset de respaldo si no se detecta la línea gráfica.
// Promedio empírico: nombre baseline + 18pt ≈ línea de firma.
const FALLBACK_OFFSET_NAME_TO_LINE = 18;
const FALLBACK_OFFSET_PRESIDENTE_TO_LINE = 28;

export const PRESIDENT_COLUMN_MAX_X = 280;
export const MIN_SIGNATURE_LINE_LENGTH = 50;
export const AFFILIATE_SIGNATURE_FALLBACK_X = 360;
export const AFFILIATE_LINE_Y_TOLERANCE = 8;
/** Inset from the start of the affiliate signature line so the box is not flush left. */
export const AFFILIATE_SIGNATURE_OFFSET_X = 56;
/** Lift the box slightly so its bottom sits just above the line. */
export const AFFILIATE_SIGNATURE_OFFSET_Y = 3;

export function pickPresidentSignatureLine(
  candidates: HorizontalLine[],
  anchorBaselineY: number,
): HorizontalLine | null {
  const validCandidates = candidates.filter((candidate) => {
    const deltaY = candidate.y - anchorBaselineY;
    return (
      candidate.length >= MIN_SIGNATURE_LINE_LENGTH &&
      candidate.x < PRESIDENT_COLUMN_MAX_X &&
      deltaY > 5 &&
      deltaY < 60
    );
  });

  if (validCandidates.length === 0) {
    return null;
  }

  validCandidates.sort(
    (a, b) => a.y - anchorBaselineY - (b.y - anchorBaselineY),
  );
  return validCandidates[0];
}

export function pickAffiliateSignatureLine(
  candidates: HorizontalLine[],
  presidentLineY: number,
): HorizontalLine | null {
  const validCandidates = candidates.filter(
    (candidate) =>
      candidate.length >= MIN_SIGNATURE_LINE_LENGTH &&
      candidate.x >= PRESIDENT_COLUMN_MAX_X &&
      Math.abs(candidate.y - presidentLineY) <= AFFILIATE_LINE_Y_TOLERANCE,
  );

  if (validCandidates.length === 0) {
    return null;
  }

  validCandidates.sort((a, b) => {
    const deltaY =
      Math.abs(a.y - presidentLineY) - Math.abs(b.y - presidentLineY);
    if (deltaY !== 0) {
      return deltaY;
    }
    return a.x - b.x;
  });
  return validCandidates[0];
}

export function resolveAffiliateSignatureLine(
  candidates: HorizontalLine[],
  presidentLineY: number,
  fallbackX = AFFILIATE_SIGNATURE_FALLBACK_X,
): HorizontalLine {
  return (
    pickAffiliateSignatureLine(candidates, presidentLineY) ?? {
      x: fallbackX,
      y: presidentLineY,
      length: 0,
    }
  );
}

/**
 * Converts a PDF signature line (bottom-left origin, line Y = bottom of the box)
 * into an API field (top-left origin).
 */
export function affiliateFieldFromSignatureLine({
  lineX,
  lineY,
  pageHeight,
  page,
  width,
  height,
}: AffiliateFieldFromLineParams): ApiDocumentField {
  return {
    type: "signature",
    page,
    x: lineX + AFFILIATE_SIGNATURE_OFFSET_X,
    y: Math.max(0, pageHeight - lineY - height - AFFILIATE_SIGNATURE_OFFSET_Y),
    width,
    height,
  };
}

// ─── Implementación 1: pdfjs-dist (primaria) ──────────────────

class PDFJSTextExtractionProvider implements SignatureLocationProvider {
  readonly providerName = "pdfjs-dist (texto)";

  async findTextInPDF(options: FindTextOptions): Promise<TextLocation | null> {
    const { pdfFile, searchText, pageNumber } = options;

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await loadPdfjsDocumentFromBytes(arrayBuffer);

    const totalPages = pdfDoc.numPages;
    const pagesToSearch = pageNumber
      ? [pageNumber]
      : Array.from({ length: totalPages }, (_, i) => i + 1);

    try {
      for (const pg of pagesToSearch) {
        if (pg < 1 || pg > totalPages) continue;

        const page = await pdfDoc.getPage(pg);
        const textContent = await page.getTextContent();
        const items = textContent.items.filter(
          (item): item is pdfjsLib.TextItem => "str" in item,
        );

        // Buscar el nombre del presidente como ancla de referencia
        const nameItem = this.findText(items, searchText);
        const presidenteItem = this.findText(items, "PRESIDENTE");
        const anchorItem = nameItem ?? presidenteItem;

        if (!anchorItem) continue;

        const anchorBaselineY = anchorItem.transform[5];
        this.logRelevantItems(items, pg);

        const candidates = await this.collectHorizontalLines(page);
        const presidentLine = pickPresidentSignatureLine(
          candidates,
          anchorBaselineY,
        );

        if (presidentLine) {
          console.log(
            `[${this.providerName}] Línea de firma GRÁFICA detectada en Y=${presidentLine.y.toFixed(1)} ` +
              `(ancla baseline Y=${anchorBaselineY.toFixed(1)}, delta=${(presidentLine.y - anchorBaselineY).toFixed(1)})`,
          );
          return {
            page: pg,
            x: anchorItem.transform[4],
            y: presidentLine.y,
            width: anchorItem.width ?? 0,
            height: 0,
          };
        }

        // Estrategia 2 (fallback): offset fijo desde el baseline del ancla
        const offset = nameItem
          ? FALLBACK_OFFSET_NAME_TO_LINE
          : FALLBACK_OFFSET_PRESIDENTE_TO_LINE;
        const signatureLineY = anchorBaselineY + offset;
        const anchorLabel = nameItem ? searchText : "PRESIDENTE";
        console.log(
          `[${this.providerName}] Sin línea gráfica detectada. ` +
            `Usando fallback: "${anchorLabel}" baseline Y=${anchorBaselineY.toFixed(1)} + ${offset} = ${signatureLineY.toFixed(1)}`,
        );
        return {
          page: pg,
          x: anchorItem.transform[4],
          y: signatureLineY,
          width: anchorItem.width ?? 0,
          height: anchorItem.height ?? 0,
        };
      }

      throw new Error(
        "No se pudo detectar automáticamente la posición de firma en este documento.",
      );
    } finally {
      await pdfDoc.destroy();
    }
  }

  private async collectHorizontalLines(
    page: pdfjsLib.PDFPageProxy,
  ): Promise<HorizontalLine[]> {
    const operatorList = await page.getOperatorList();
    const { fnArray, argsArray } = operatorList;
    const candidates: HorizontalLine[] = [];

    for (let i = 0; i < fnArray.length; i++) {
      if (fnArray[i] === OPS.constructPath) {
        const subOps: number[] = argsArray[i][0];
        const coords: number[] = argsArray[i][1];
        this.extractHorizontalLines(subOps, coords, candidates);
      }
    }

    return candidates;
  }

  async detectAffiliatePlacement(
    pdfFile: File,
    options: DetectAffiliateSignatureOptions = {},
  ): Promise<ApiDocumentField | null> {
    const searchText = options.searchText ?? AI_SEARCH_CONFIG.searchText;
    const isMobile = options.isMobile ?? false;
    const preferredPage = options.pageNumber ?? CONVENIO_SIGNATURE_PAGE;
    const { defaultWidth, defaultHeight } = getFieldSizeLimits(
      "signature",
      isMobile,
    );

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await loadPdfjsDocumentFromBytes(arrayBuffer);
    const totalPages = pdfDoc.numPages;
    const pagesToSearch = [
      preferredPage,
      ...Array.from({ length: totalPages }, (_, i) => i + 1).filter(
        (page) => page !== preferredPage,
      ),
    ];

    try {
      for (const pg of pagesToSearch) {
        if (pg < 1 || pg > totalPages) {
          continue;
        }

        const page = await pdfDoc.getPage(pg);
        const textContent = await page.getTextContent();
        const items = textContent.items.filter(
          (item): item is pdfjsLib.TextItem => "str" in item,
        );

        const nameItem = this.findText(items, searchText);
        const presidenteItem = this.findText(items, "PRESIDENTE");
        const anchorItem = nameItem ?? presidenteItem;
        if (!anchorItem) {
          continue;
        }

        const anchorBaselineY = anchorItem.transform[5];
        const candidates = await this.collectHorizontalLines(page);
        const presidentLine = pickPresidentSignatureLine(
          candidates,
          anchorBaselineY,
        );
        const presidentLineY = presidentLine
          ? presidentLine.y
          : anchorBaselineY +
            (nameItem
              ? FALLBACK_OFFSET_NAME_TO_LINE
              : FALLBACK_OFFSET_PRESIDENTE_TO_LINE);

        const affiliateLine = resolveAffiliateSignatureLine(
          candidates,
          presidentLineY,
        );
        const viewport = page.getViewport({ scale: 1 });

        return affiliateFieldFromSignatureLine({
          lineX: affiliateLine.x,
          lineY: affiliateLine.y,
          pageHeight: viewport.height,
          page: pg,
          width: defaultWidth,
          height: defaultHeight,
        });
      }

      return null;
    } finally {
      await pdfDoc.destroy();
    }
  }

  /**
   * Extrae líneas horizontales de las sub-operaciones de constructPath.
   * Formato de subOps/coords en pdfjs-dist v4:
   *   subOp 13 = moveTo (consume 2 coords: x, y)
   *   subOp 14 = lineTo (consume 2 coords: x, y)
   *   subOp 15 = curveTo (consume 6 coords)
   *   subOp 16 = curveTo2 (consume 4 coords)
   *   subOp 17 = curveTo3 (consume 4 coords)
   *   subOp 19 = rectangle (consume 4 coords: x, y, w, h)
   *   subOp 18 = closePath (consume 0 coords)
   */
  private extractHorizontalLines(
    subOps: number[],
    coords: number[],
    candidates: HorizontalLine[],
  ): void {
    let coordIdx = 0;
    let lastX = 0;
    let lastY = 0;

    for (const op of subOps) {
      switch (op) {
        case 13: { // moveTo
          lastX = coords[coordIdx++];
          lastY = coords[coordIdx++];
          break;
        }
        case 14: { // lineTo
          const x2 = coords[coordIdx++];
          const y2 = coords[coordIdx++];

          // Chequear si es horizontal (tolerancia 0.5pt en Y)
          if (Math.abs(y2 - lastY) < 0.5) {
            const length = Math.abs(x2 - lastX);
            const startX = Math.min(lastX, x2);
            candidates.push({ y: lastY, length, x: startX });
          }

          lastX = x2;
          lastY = y2;
          break;
        }
        case 15: { // curveTo (bezier cúbica: 6 coords)
          coordIdx += 4;
          lastX = coords[coordIdx++];
          lastY = coords[coordIdx++];
          break;
        }
        case 16: // curveTo2 (4 coords)
        case 17: { // curveTo3 (4 coords)
          coordIdx += 2;
          lastX = coords[coordIdx++];
          lastY = coords[coordIdx++];
          break;
        }
        case 19: { // rectangle (x, y, w, h)
          const rx = coords[coordIdx++];
          const ry = coords[coordIdx++];
          const rw = coords[coordIdx++];
          const rh = coords[coordIdx++];
          // Rectángulos muy delgados (h < 2pt) son líneas horizontales
          if (Math.abs(rh) < 2 && Math.abs(rw) >= MIN_SIGNATURE_LINE_LENGTH) {
            candidates.push({ y: ry, length: Math.abs(rw), x: rx });
          }
          break;
        }
        case 18: { // closePath (0 coords)
          break;
        }
        default: {
          // Op desconocida — intentar no romper el parsing.
          // No consumimos coords aquí; si hay un op desconocido, las coords
          // pueden desalinearse. Log para diagnóstico.
          console.warn(
            `[${this.providerName}] Op desconocida en constructPath: ${op}`,
          );
          break;
        }
      }
    }
  }

  private findText(
    items: pdfjsLib.TextItem[],
    target: string,
  ): pdfjsLib.TextItem | null {
    const normalizedTarget = this.normalizeText(target);

    for (const item of items) {
      if (this.normalizeText(item.str) === normalizedTarget) {
        return item;
      }
    }

    for (let i = 0; i < items.length; i++) {
      let accumulated = "";
      for (let j = i; j < items.length; j++) {
        accumulated += items[j].str;
        if (this.normalizeText(accumulated) === normalizedTarget) {
          return items[i];
        }
        if (
          accumulated.replace(/\s+/g, "").length >
          normalizedTarget.replace(/\s+/g, "").length + 5
        ) {
          break;
        }
      }
    }

    for (const item of items) {
      if (this.normalizeText(item.str).includes(normalizedTarget)) {
        return item;
      }
    }

    return null;
  }

  private normalizeText(text: string): string {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  private logRelevantItems(items: pdfjsLib.TextItem[], page: number): void {
    const relevant = items.filter((item) => {
      const norm = this.normalizeText(item.str);
      return (
        norm.includes("PRESIDENTE") ||
        norm.includes("JORGE") ||
        norm.includes("ALVAREZ") ||
        norm.includes("C.C.")
      );
    });

    if (relevant.length === 0) return;

    console.group(
      `[${this.providerName}] Items del bloque de firma en página ${page}:`,
    );
    for (const item of relevant) {
      console.log(
        `  "${item.str}" → baseline Y=${item.transform[5].toFixed(1)}, X=${item.transform[4].toFixed(1)}`,
      );
    }
    console.groupEnd();
  }
}

// ─── Factory ──────────────────────────────────────────────────

export function createSignatureLocationProvider(): SignatureLocationProvider {
  return new PDFJSTextExtractionProvider();
}

// ─── Utilidad de posición ─────────────────────────────────────

export function calculateSignaturePosition(
  textLocation: TextLocation,
  offsetX: number = 0,
  offsetY: number = 0,
): SignaturePosition {
  return {
    x: 80,
    y: Math.max(0, textLocation.y + offsetY),
    page: textLocation.page,
  };
}

export async function detectAffiliateSignaturePlacement(
  pdfFile: File,
  options: DetectAffiliateSignatureOptions = {},
): Promise<ApiDocumentField | null> {
  const provider = new PDFJSTextExtractionProvider();
  return provider.detectAffiliatePlacement(pdfFile, options);
}
