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

import * as pdfjsLib from "pdfjs-dist";
import { OPS } from "pdfjs-dist";

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
}

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

// ─── Constantes ───────────────────────────────────────────────

// Offset de respaldo si no se detecta la línea gráfica.
// Promedio empírico: nombre baseline + 18pt ≈ línea de firma.
const FALLBACK_OFFSET_NAME_TO_LINE = 18;
const FALLBACK_OFFSET_PRESIDENTE_TO_LINE = 28;

// La línea de firma del presidente está en la columna izquierda (X < ~280)
const PRESIDENT_COLUMN_MAX_X = 280;
// Longitud mínima para considerar una línea como "línea de firma" (no un guion corto)
const MIN_SIGNATURE_LINE_LENGTH = 50;

// ─── Implementación 1: pdfjs-dist (primaria) ──────────────────

class PDFJSTextExtractionProvider implements SignatureLocationProvider {
  readonly providerName = "pdfjs-dist (texto)";

  async findTextInPDF(options: FindTextOptions): Promise<TextLocation | null> {
    const { pdfFile, searchText, pageNumber } = options;

    const arrayBuffer = await pdfFile.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;

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

        // Estrategia 1: detectar la línea gráfica horizontal vectorial
        const graphicLineY = await this.findGraphicSignatureLine(
          page,
          anchorBaselineY,
        );

        if (graphicLineY !== null) {
          console.log(
            `[${this.providerName}] Línea de firma GRÁFICA detectada en Y=${graphicLineY.toFixed(1)} ` +
              `(ancla baseline Y=${anchorBaselineY.toFixed(1)}, delta=${(graphicLineY - anchorBaselineY).toFixed(1)})`,
          );
          return {
            page: pg,
            x: anchorItem.transform[4],
            y: graphicLineY,
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

  /**
   * Escanea las operaciones de dibujo de la página para encontrar una línea
   * horizontal que esté ENCIMA del bloque de firma del presidente.
   *
   * Criterios:
   *  - Es una línea horizontal (misma Y en moveTo y lineTo, tolerancia 0.5pt)
   *  - Longitud >= MIN_SIGNATURE_LINE_LENGTH pt
   *  - Columna izquierda (X inicio < PRESIDENT_COLUMN_MAX_X)
   *  - Y está ENCIMA del ancla (Y > anchorBaselineY) pero no demasiado lejos (< 60pt)
   *
   * Si hay varias candidatas, retorna la más cercana al ancla (la más baja/close).
   */
  private async findGraphicSignatureLine(
    page: pdfjsLib.PDFPageProxy,
    anchorBaselineY: number,
  ): Promise<number | null> {
    const operatorList = await page.getOperatorList();
    const { fnArray, argsArray } = operatorList;

    const candidates: { y: number; length: number; x: number }[] = [];

    // Iterar las operaciones del PDF buscando constructPath con líneas horizontales
    for (let i = 0; i < fnArray.length; i++) {
      if (fnArray[i] === OPS.constructPath) {
        const subOps: number[] = argsArray[i][0];
        const coords: number[] = argsArray[i][1];

        this.extractHorizontalLines(subOps, coords, candidates);
      }
    }

    // Filtrar candidatas: encima del ancla, en la columna izquierda, largo suficiente
    const validCandidates = candidates.filter((c) => {
      const deltaY = c.y - anchorBaselineY;
      return (
        c.length >= MIN_SIGNATURE_LINE_LENGTH &&
        c.x < PRESIDENT_COLUMN_MAX_X &&
        deltaY > 5 &&    // al menos 5pt encima del nombre
        deltaY < 60      // no más de 60pt encima (no es una línea del texto principal)
      );
    });

    if (validCandidates.length > 0) {
      console.log(
        `[${this.providerName}] Líneas gráficas candidatas (${validCandidates.length}):`,
        validCandidates.map(
          (c) => `Y=${c.y.toFixed(1)}, len=${c.length.toFixed(1)}, X=${c.x.toFixed(1)}`,
        ),
      );
      // La más cercana al ancla (menor delta) es la línea de firma
      validCandidates.sort((a, b) => a.y - anchorBaselineY - (b.y - anchorBaselineY));
      return validCandidates[0].y;
    }

    // Log todas las líneas horizontales encontradas para diagnóstico
    if (candidates.length > 0) {
      console.log(
        `[${this.providerName}] Líneas gráficas encontradas pero ninguna válida. Todas:`,
        candidates
          .filter((c) => c.length >= 30)
          .map(
            (c) =>
              `Y=${c.y.toFixed(1)}, len=${c.length.toFixed(1)}, X=${c.x.toFixed(1)}, ` +
              `deltaFromAnchor=${(c.y - anchorBaselineY).toFixed(1)}`,
          ),
      );
    }

    return null;
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
    candidates: { y: number; length: number; x: number }[],
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
