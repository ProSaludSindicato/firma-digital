/**
 * Node.js-compatible port of signatureLocationService.ts.
 *
 * Same algorithm, but accepts Buffer instead of File, and configures
 * pdfjs-dist for a Node.js (non-browser) environment.
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

function resolvePdfjsWorkerSrc(): string {
  if (process.env.PDFJS_WORKER_SRC) {
    return process.env.PDFJS_WORKER_SRC;
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'),
    path.resolve(here, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'),
    path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `file://${resolvePdfjsWorkerSrc()}`;

// OPS.constructPath from pdfjs-dist (do not hardcode – read from the lib)
const CONSTRUCT_PATH_OP: number = (pdfjsLib as any).OPS?.constructPath ?? 91;

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

export interface SignatureDetectionResult {
  location: TextLocation;
  detectionMethod: 'graphic_line' | 'text_fallback';
}

// ─── Constants ────────────────────────────────────────────────

const FALLBACK_OFFSET_NAME_TO_LINE = 18;
const FALLBACK_OFFSET_PRESIDENTE_TO_LINE = 28;
const PRESIDENT_COLUMN_MAX_X = 280;
const MIN_SIGNATURE_LINE_LENGTH = 50;

// OPS numeric codes (same as pdfjs-dist OPS enum)
const OP_MOVE_TO = 13;
const OP_LINE_TO = 14;
const OP_CURVE_TO = 15;
const OP_CURVE_TO_2 = 16;
const OP_CURVE_TO_3 = 17;
const OP_CLOSE_PATH = 18;
const OP_RECTANGLE = 19;

// ─── Text normalization ────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// ─── Text finder (same logic as browser version) ──────────────

function findText(
  items: { str: string; transform: number[]; width?: number; height?: number }[],
  target: string,
): { str: string; transform: number[]; width?: number; height?: number } | null {
  const normalizedTarget = normalizeText(target);

  for (const item of items) {
    if (normalizeText(item.str) === normalizedTarget) {
      return item;
    }
  }

  for (let i = 0; i < items.length; i++) {
    let accumulated = '';
    for (let j = i; j < items.length; j++) {
      accumulated += items[j].str;
      if (normalizeText(accumulated) === normalizedTarget) {
        return items[i];
      }
      if (accumulated.replace(/\s+/g, '').length > normalizedTarget.replace(/\s+/g, '').length + 5) {
        break;
      }
    }
  }

  for (const item of items) {
    if (normalizeText(item.str).includes(normalizedTarget)) {
      return item;
    }
  }

  return null;
}

// ─── Graphic line extraction (same algorithm as browser version) ──

function extractHorizontalLines(
  subOps: number[],
  coords: number[],
  candidates: { y: number; length: number; x: number }[],
): void {
  let coordIdx = 0;
  let lastX = 0;
  let lastY = 0;

  for (const op of subOps) {
    switch (op) {
      case OP_MOVE_TO: {
        lastX = coords[coordIdx++];
        lastY = coords[coordIdx++];
        break;
      }
      case OP_LINE_TO: {
        const x2 = coords[coordIdx++];
        const y2 = coords[coordIdx++];
        if (Math.abs(y2 - lastY) < 0.5) {
          const length = Math.abs(x2 - lastX);
          const startX = Math.min(lastX, x2);
          candidates.push({ y: lastY, length, x: startX });
        }
        lastX = x2;
        lastY = y2;
        break;
      }
      case OP_CURVE_TO: {
        coordIdx += 4;
        lastX = coords[coordIdx++];
        lastY = coords[coordIdx++];
        break;
      }
      case OP_CURVE_TO_2:
      case OP_CURVE_TO_3: {
        coordIdx += 2;
        lastX = coords[coordIdx++];
        lastY = coords[coordIdx++];
        break;
      }
      case OP_RECTANGLE: {
        const rx = coords[coordIdx++];
        const ry = coords[coordIdx++];
        const rw = coords[coordIdx++];
        const rh = coords[coordIdx++];
        if (Math.abs(rh) < 2 && Math.abs(rw) >= MIN_SIGNATURE_LINE_LENGTH) {
          candidates.push({ y: ry, length: Math.abs(rw), x: rx });
        }
        break;
      }
      case OP_CLOSE_PATH: {
        break;
      }
      default: {
        // Unknown operator – skip without consuming coords.
        break;
      }
    }
  }
}

async function findGraphicSignatureLine(
  page: any,
  anchorBaselineY: number,
): Promise<number | null> {
  const operatorList = await page.getOperatorList();
  const { fnArray, argsArray } = operatorList;

  const candidates: { y: number; length: number; x: number }[] = [];

  for (let i = 0; i < fnArray.length; i++) {
    if (fnArray[i] === CONSTRUCT_PATH_OP) {
      const subOps: number[] = argsArray[i][0];
      const coords: number[] = argsArray[i][1];
      extractHorizontalLines(subOps, coords, candidates);
    }
  }

  const validCandidates = candidates.filter((c) => {
    const deltaY = c.y - anchorBaselineY;
    return (
      c.length >= MIN_SIGNATURE_LINE_LENGTH &&
      c.x < PRESIDENT_COLUMN_MAX_X &&
      deltaY > 5 &&
      deltaY < 60
    );
  });

  if (validCandidates.length > 0) {
    validCandidates.sort((a, b) => (a.y - anchorBaselineY) - (b.y - anchorBaselineY));
    return validCandidates[0].y;
  }

  return null;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Finds a signature location in a PDF (Node.js / Buffer version).
 *
 * @param pdfBuffer        Raw PDF bytes
 * @param searchText       Primary anchor text (e.g. signer name)
 * @param pageNumber       Page to search; omit or 0 to scan every page
 * @param secondaryAnchor  Optional fallback anchor (e.g. "PRESIDENTE")
 * @returns Detection result with location and method, or null if not found
 */
export async function findSignatureLocationInBuffer(
  pdfBuffer: Buffer,
  searchText: string,
  pageNumber?: number,
  secondaryAnchor?: string,
): Promise<SignatureDetectionResult | null> {
  const uint8 = new Uint8Array(pdfBuffer);
  const loadingTask = (pdfjsLib as any).getDocument({ data: uint8, verbosity: 0 });
  const pdfDoc = await loadingTask.promise;

  try {
    const totalPages = pdfDoc.numPages;
    const pagesToSearch =
      pageNumber && pageNumber > 0
        ? [pageNumber]
        : Array.from({ length: totalPages }, (_, i) => i + 1);

    const trimmedSecondary = secondaryAnchor?.trim() || undefined;

    for (const pg of pagesToSearch) {
      if (pg < 1 || pg > totalPages) continue;

      const page = await pdfDoc.getPage(pg);
      const textContent = await page.getTextContent();
      const items = (textContent.items as any[]).filter((item: any) => 'str' in item);

      const nameItem = findText(items, searchText);
      const secondaryItem = trimmedSecondary ? findText(items, trimmedSecondary) : null;
      const anchorItem = nameItem ?? secondaryItem;

      if (!anchorItem) continue;

      const anchorBaselineY: number = anchorItem.transform[5];

      const graphicLineY = await findGraphicSignatureLine(page, anchorBaselineY);

      if (graphicLineY !== null) {
        return {
          location: {
            page: pg,
            x: anchorItem.transform[4],
            y: graphicLineY,
            width: anchorItem.width ?? 0,
            height: 0,
          },
          detectionMethod: 'graphic_line',
        };
      }

      const offset = nameItem ? FALLBACK_OFFSET_NAME_TO_LINE : FALLBACK_OFFSET_PRESIDENTE_TO_LINE;
      const signatureLineY = anchorBaselineY + offset;

      return {
        location: {
          page: pg,
          x: anchorItem.transform[4],
          y: signatureLineY,
          width: anchorItem.width ?? 0,
          height: anchorItem.height ?? 0,
        },
        detectionMethod: 'text_fallback',
      };
    }

    return null;
  } finally {
    await pdfDoc.destroy();
  }
}

/**
 * Calculates the final signature stamp position from a detected text location.
 * Uses the detected X plus optional offsets (no hardcoded column).
 */
export function calculateSignaturePosition(
  textLocation: TextLocation,
  offsetX = 0,
  offsetY = 0,
): SignaturePosition {
  return {
    x: Math.max(0, textLocation.x + offsetX),
    y: Math.max(0, textLocation.y + offsetY),
    page: textLocation.page,
  };
}
