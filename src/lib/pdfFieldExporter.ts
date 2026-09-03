import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import {
  canvasPxToPdfPoints,
  exportFontSizePt,
  fieldContentLeftX,
  fieldTextBaselineY,
  fieldTextContentHeightPt,
  fieldTextPaddingPt,
  VIEWER_LINE_HEIGHT,
  VIEWER_SIGNATURE_BORDER_PX,
} from "@/lib/fieldLayoutInsets";
import { loadPdfDocument } from "@/lib/loadPdfDocument";
import { pdfSignatureConfig } from "@/lib/pdfSignatureConfig";
import type { DocumentField } from "@/types/documentEditor";

export interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Converts a field stored in canvas pixels (top-left origin, center-based)
 * into a PDF rectangle (bottom-left origin, top-left of the box).
 */
export function fieldToPdfRect(
  field: DocumentField,
  pageHeight: number,
): PdfRect {
  const storedScale = field.scale || 1;
  const leftPx = field.x - field.width / 2;
  const topPx = field.y - field.height / 2;

  const width = Math.max(1, field.width / storedScale);
  const height = Math.max(1, field.height / storedScale);
  const x = leftPx / storedScale + pdfSignatureConfig.exportOffsetX;
  const y =
    pageHeight - topPx / storedScale - height + pdfSignatureConfig.exportOffsetY;

  return { x, y, width, height };
}

/**
 * Fits a signature image inside the field box the same way the viewer does:
 * CSS `object-contain` centered in the inner area (box minus the 1px overlay border).
 */
export function signatureImagePdfRect(
  field: DocumentField,
  pageHeight: number,
  imageAspectRatio: number,
): PdfRect {
  const storedScale = field.scale || 1;
  const box = fieldToPdfRect(field, pageHeight);
  const borderPt = canvasPxToPdfPoints(VIEWER_SIGNATURE_BORDER_PX, storedScale);
  const innerWidth = Math.max(1, box.width - borderPt * 2);
  const innerHeight = Math.max(1, box.height - borderPt * 2);
  const innerX = box.x + borderPt;
  const innerY = box.y + borderPt;

  const safeRatio = imageAspectRatio > 0 ? imageAspectRatio : 1;
  const innerRatio = innerWidth / innerHeight;
  const width = safeRatio >= innerRatio ? innerWidth : innerHeight * safeRatio;
  const height = safeRatio >= innerRatio ? innerWidth / safeRatio : innerHeight;

  return {
    x: innerX + (innerWidth - width) / 2,
    y: innerY + (innerHeight - height) / 2,
    width,
    height,
  };
}

function wrapTextToWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let current = "";

  const pushLongWord = (word: string) => {
    let chunk = "";
    for (const char of word) {
      const trial = chunk + char;
      if (chunk && font.widthOfTextAtSize(trial, fontSize) > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = trial;
      }
    }
    current = chunk;
  };

  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(trial, fontSize) <= maxWidth) {
      current = trial;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
      current = word;
    } else {
      pushLongWord(word);
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function fitTextSize(
  text: string,
  font: PDFFont,
  maxWidth: number,
  maxSize: number,
): number {
  let size = maxSize;
  while (size > 6 && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  return size;
}

async function embedSignatureImage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  field: DocumentField,
  pageHeight: number,
): Promise<void> {
  if (!field.value || field.value.type !== "signature") {
    return;
  }

  const dataUrl = field.value.dataUrl;
  const imageBytes = await fetch(dataUrl).then((res) => res.arrayBuffer());
  const signatureImage = dataUrl.includes("image/png")
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);

  const nat = signatureImage.scale(1);
  const aspectRatio = nat.height > 0 ? nat.width / nat.height : 1;
  const rect = signatureImagePdfRect(field, pageHeight, aspectRatio);

  page.drawImage(signatureImage, rect);
}

function drawTextField(
  page: PDFPage,
  field: DocumentField,
  pageHeight: number,
  font: PDFFont,
): void {
  if (!field.value || field.value.type !== "text") {
    return;
  }

  const text = field.value.text.trim();
  if (!text) {
    return;
  }

  const rect = fieldToPdfRect(field, pageHeight);
  const storedScale = field.scale || 1;
  const textPad = fieldTextPaddingPt(storedScale);
  const maxWidth = Math.max(4, rect.width - textPad * 2);
  const maxHeight = fieldTextContentHeightPt(rect.height, storedScale);
  let fontSize = exportFontSizePt(rect.height);
  let lines = wrapTextToWidth(text, font, fontSize, maxWidth);
  const lineGap = VIEWER_LINE_HEIGHT;

  while (fontSize > 6 && lines.length * fontSize * lineGap > maxHeight) {
    fontSize -= 0.5;
    lines = wrapTextToWidth(text, font, fontSize, maxWidth);
  }

  const fittedLines = lines.filter(
    (_, index) => (index + 1) * fontSize * lineGap <= maxHeight + 0.5,
  );
  const linesToDraw = fittedLines.length > 0 ? fittedLines : lines.slice(0, 1);

  let y = fieldTextBaselineY(rect, fontSize, storedScale);
  const x = fieldContentLeftX(rect, storedScale);

  for (const line of linesToDraw) {
    if (y < rect.y + textPad - 1) {
      break;
    }
    page.drawText(line, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.08, 0.1, 0.14),
      maxWidth,
    });
    y -= fontSize * lineGap;
  }
}

function formatDateForPdf(isoDate: string, displayFormat: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  if (displayFormat === "iso") {
    return isoDate;
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

function drawNumberField(
  page: PDFPage,
  field: DocumentField,
  pageHeight: number,
  font: PDFFont,
): void {
  if (!field.value || field.value.type !== "number") {
    return;
  }

  const text = field.value.value.trim();
  if (!text) {
    return;
  }

  const rect = fieldToPdfRect(field, pageHeight);
  const storedScale = field.scale || 1;
  const textPad = fieldTextPaddingPt(storedScale);
  const maxWidth = Math.max(4, rect.width - textPad * 2);
  const fontSize = fitTextSize(
    text,
    font,
    maxWidth,
    exportFontSizePt(rect.height),
  );
  const y = fieldTextBaselineY(rect, fontSize, storedScale);

  page.drawText(text, {
    x: fieldContentLeftX(rect, storedScale),
    y,
    size: fontSize,
    font,
    color: rgb(0.08, 0.1, 0.14),
    maxWidth,
  });
}

function drawDateField(
  page: PDFPage,
  field: DocumentField,
  pageHeight: number,
  font: PDFFont,
): void {
  if (!field.value || field.value.type !== "date") {
    return;
  }

  const text = formatDateForPdf(field.value.isoDate, field.value.displayFormat);
  const rect = fieldToPdfRect(field, pageHeight);
  const storedScale = field.scale || 1;
  const textPad = fieldTextPaddingPt(storedScale);
  const maxWidth = Math.max(4, rect.width - textPad * 2);
  const fontSize = fitTextSize(
    text,
    font,
    maxWidth,
    exportFontSizePt(rect.height),
  );
  const y = fieldTextBaselineY(rect, fontSize, storedScale);

  page.drawText(text, {
    x: fieldContentLeftX(rect, storedScale),
    y,
    size: fontSize,
    font,
    color: rgb(0.08, 0.1, 0.14),
    maxWidth,
  });
}

function drawCheckboxField(
  page: PDFPage,
  field: DocumentField,
  pageHeight: number,
  font: PDFFont,
): void {
  if (!field.value || field.value.type !== "checkbox") {
    return;
  }

  const rect = fieldToPdfRect(field, pageHeight);
  const size = Math.min(rect.width, rect.height);
  const x = rect.x;
  const y = rect.y + (rect.height - size) / 2;
  const border = rgb(0.2, 0.22, 0.28);

  page.drawRectangle({
    x,
    y,
    width: size,
    height: size,
    borderColor: border,
    borderWidth: Math.max(0.6, size * 0.06),
  });

  if (field.value.checked) {
    const markSize = size * 0.72;
    page.drawText("X", {
      x: x + size * 0.18,
      y: y + size * 0.12,
      size: markSize,
      font,
      color: rgb(0.08, 0.1, 0.14),
    });
  }
}

export async function exportDocumentToPdf(
  originalPdf: File | ArrayBuffer,
  fields: DocumentField[],
): Promise<Blob> {
  const arrayBuffer =
    originalPdf instanceof File ? await originalPdf.arrayBuffer() : originalPdf;
  const pdfDoc = await loadPdfDocument(arrayBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const field of fields) {
    if (field.page < 1 || field.page > pages.length) {
      throw new Error(
        `El campo "${field.label}" apunta a la página ${field.page}, pero el documento tiene ${pages.length} página(s).`,
      );
    }

    const page = pages[field.page - 1];
    const { height: pageHeight } = page.getSize();

    switch (field.value?.type) {
      case "signature":
        await embedSignatureImage(pdfDoc, page, field, pageHeight);
        break;
      case "text":
        drawTextField(page, field, pageHeight, font);
        break;
      case "number":
        drawNumberField(page, field, pageHeight, font);
        break;
      case "date":
        drawDateField(page, field, pageHeight, font);
        break;
      case "checkbox":
        drawCheckboxField(page, field, pageHeight, font);
        break;
      default:
        break;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
}

export function exportedFileName(originalName: string): string {
  return originalName.replace(/\.pdf$/i, "") + "_completado.pdf";
}
