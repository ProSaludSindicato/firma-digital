/**
 * Auto-sign HTTP microservice.
 *
 * Exposes:
 *   POST /api/auto-sign  — receive PDF + signature image + search text, return signed PDF
 *   GET  /api/health     — liveness check (no API key)
 *
 * Environment variables:
 *   AUTO_SIGN_API_KEY  (required)  — shared secret sent as X-Api-Key header by Laravel
 *   AUTO_SIGN_PORT     (default 3001)
 *   LOG_LEVEL          (default info)
 *   PDFJS_WORKER_SRC   — absolute path to pdfjs worker (set in Docker)
 */

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';
import pino from 'pino';

import {
  findSignatureLocationInBuffer,
  calculateSignaturePosition,
} from './lib/signatureLocationNode.js';
import { signPDFWithBuffer } from './lib/pdfSigningNode.js';

// ─── Config ───────────────────────────────────────────────────

const PORT = parseInt(process.env.AUTO_SIGN_PORT ?? '3001', 10);
const PDF_MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const IMG_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const SEARCH_TEXT_MAX_LEN = 200;
const STAMP_MAX_POINTS = 500;
const DEFAULT_STAMP_WIDTH = 38;
const DEFAULT_STAMP_HEIGHT = 50;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

// ─── Logger ───────────────────────────────────────────────────

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// ─── Helpers ──────────────────────────────────────────────────

function timingSafeEqualString(provided: string, expected: string): boolean {
  const providedHash = crypto.createHash('sha256').update(provided).digest();
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(providedHash, expectedHash);
}

function headerValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function formString(body: Request['body'], field: string): string {
  const raw = body?.[field];
  return typeof raw === 'string' ? raw.trim() : '';
}

function parseOptionalPositiveInt(
  raw: unknown,
  field: string,
): { ok: true; value?: number } | { ok: false; field: string } {
  if (raw == null || raw === '') {
    return { ok: true };
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    return { ok: false, field };
  }
  return { ok: true, value: n };
}

function parseOptionalFiniteNumber(
  raw: unknown,
  field: string,
): { ok: true; value?: number } | { ok: false; field: string } {
  if (raw == null || raw === '') {
    return { ok: true };
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return { ok: false, field };
  }
  return { ok: true, value: n };
}

function detectImageKind(buffer: Buffer, mime: string): 'png' | 'jpeg' | null {
  const isPng = buffer.length >= 4 && buffer.subarray(0, 4).equals(PNG_MAGIC);
  const isJpeg = buffer.length >= 3 && buffer.subarray(0, 3).equals(JPEG_MAGIC);
  if (isPng && mime === 'image/png') {
    return 'png';
  }
  if (isJpeg && mime === 'image/jpeg') {
    return 'jpeg';
  }
  return null;
}

// ─── App ──────────────────────────────────────────────────────

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'rate_limited' },
});

app.use('/api/', limiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PDF_MAX_BYTES },
  fileFilter(_req, file, cb) {
    if (file.fieldname === 'pdf' && file.mimetype !== 'application/pdf') {
      cb(new Error('Solo se aceptan archivos PDF'));
      return;
    }
    if (file.fieldname === 'signature' && !['image/png', 'image/jpeg'].includes(file.mimetype)) {
      cb(new Error('La firma debe ser PNG o JPEG'));
      return;
    }
    cb(null, true);
  },
});

function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.AUTO_SIGN_API_KEY ?? '';
  if (!apiKey) {
    logger.warn('AUTO_SIGN_API_KEY no está configurada — rechazando todas las peticiones');
    res.status(500).json({ error: 'Servicio no configurado correctamente', code: 'misconfigured' });
    return;
  }

  const provided = headerValue(req.headers['x-api-key']);
  if (!provided || !timingSafeEqualString(provided, apiKey)) {
    res.status(401).json({ error: 'API key inválida o ausente', code: 'unauthorized' });
    return;
  }

  next();
}

// ─── Health ───────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// ─── POST /api/auto-sign ──────────────────────────────────────

app.post(
  '/api/auto-sign',
  requireApiKey,
  upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const requestId = crypto.randomUUID();
    const referenceId = headerValue(req.headers['x-reference-id']);
    const startedAt = Date.now();

    res.set('X-Reference-Id', referenceId);

    const log = logger.child({ requestId, referenceId });

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const pdfFile = files?.['pdf']?.[0];
    const sigFile = files?.['signature']?.[0];

    if (!pdfFile) {
      res.status(400).json({ error: 'El campo pdf es obligatorio', code: 'missing_pdf' });
      return;
    }

    const pdfBuffer = pdfFile.buffer;

    if (pdfBuffer.length < 5 || pdfBuffer.slice(0, 5).toString('ascii') !== '%PDF-') {
      res.status(400).json({ error: 'El archivo pdf no es un PDF válido', code: 'invalid_pdf' });
      return;
    }

    if (!sigFile) {
      res.status(400).json({ error: 'El campo signature es obligatorio', code: 'missing_signature' });
      return;
    }

    if (sigFile.size > IMG_MAX_BYTES) {
      res.status(400).json({ error: 'La imagen de firma excede 5 MB', code: 'signature_too_large' });
      return;
    }

    const imageKind = detectImageKind(sigFile.buffer, sigFile.mimetype);
    if (!imageKind) {
      res.status(400).json({ error: 'La firma debe ser un PNG o JPEG válido', code: 'invalid_signature' });
      return;
    }

    const searchText = formString(req.body, 'search_text');
    if (!searchText) {
      res.status(400).json({ error: 'El campo search_text es obligatorio', code: 'missing_search_text' });
      return;
    }
    if (searchText.length > SEARCH_TEXT_MAX_LEN) {
      res.status(400).json({ error: 'search_text es demasiado largo', code: 'invalid_search_text' });
      return;
    }

    const secondaryAnchor = formString(req.body, 'secondary_anchor');
    if (secondaryAnchor.length > SEARCH_TEXT_MAX_LEN) {
      res.status(400).json({ error: 'secondary_anchor es demasiado largo', code: 'invalid_secondary_anchor' });
      return;
    }

    const searchPageParsed = parseOptionalPositiveInt(req.body?.search_page, 'search_page');
    if (!searchPageParsed.ok) {
      res.status(400).json({ error: 'search_page debe ser un entero positivo', code: 'invalid_search_page' });
      return;
    }

    const widthParsed = parseOptionalFiniteNumber(req.body?.width, 'width');
    const heightParsed = parseOptionalFiniteNumber(req.body?.height, 'height');
    const offsetXParsed = parseOptionalFiniteNumber(req.body?.offset_x, 'offset_x');
    const offsetYParsed = parseOptionalFiniteNumber(req.body?.offset_y, 'offset_y');

    if (!widthParsed.ok || !heightParsed.ok || !offsetXParsed.ok || !offsetYParsed.ok) {
      res.status(400).json({ error: 'Parámetros numéricos inválidos', code: 'invalid_numeric_field' });
      return;
    }

    const width = widthParsed.value ?? DEFAULT_STAMP_WIDTH;
    const height = heightParsed.value ?? DEFAULT_STAMP_HEIGHT;
    if (width <= 0 || height <= 0 || width > STAMP_MAX_POINTS || height > STAMP_MAX_POINTS) {
      res.status(400).json({ error: 'width/height fuera de rango', code: 'invalid_stamp_size' });
      return;
    }

    log.info(
      {
        pdfBytes: pdfBuffer.length,
        signatureBytes: sigFile.size,
        searchPage: searchPageParsed.value ?? null,
      },
      'auto-sign request received',
    );

    let detectionMethod: string;
    let signConfig: { page: number; x: number; y: number; width: number; height: number };

    try {
      const detectionResult = await findSignatureLocationInBuffer(
        pdfBuffer,
        searchText,
        searchPageParsed.value,
        secondaryAnchor || undefined,
      );

      if (!detectionResult) {
        log.warn('Anchor not found in PDF');
        res.status(422).json({
          error: 'No se pudo detectar la posición de firma en el documento',
          code: 'anchor_not_found',
        });
        return;
      }

      const position = calculateSignaturePosition(
        detectionResult.location,
        offsetXParsed.value ?? 0,
        offsetYParsed.value ?? 0,
      );
      detectionMethod = detectionResult.detectionMethod;

      signConfig = {
        page: position.page,
        x: position.x,
        y: position.y,
        width,
        height,
      };

      log.info(
        { detectionMethod, page: signConfig.page, x: signConfig.x, y: signConfig.y },
        'Signature position detected',
      );
    } catch (err) {
      log.error({ err }, 'Error during signature detection');
      res.status(500).json({ error: 'Error procesando el PDF', code: 'detection_error' });
      return;
    }

    let signedBuffer: Buffer;

    try {
      signedBuffer = await signPDFWithBuffer(
        pdfBuffer,
        sigFile.buffer,
        imageKind === 'png',
        signConfig,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      log.error({ err }, 'Error signing PDF');

      if (message.includes('fuera de los límites')) {
        res.status(422).json({ error: message, code: 'draw_out_of_page' });
        return;
      }

      res.status(500).json({ error: 'Error al firmar el PDF', code: 'signing_error' });
      return;
    }

    const durationMs = Date.now() - startedAt;
    log.info({ durationMs, signedBytes: signedBuffer.length }, 'auto-sign completed');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="signed.pdf"',
      'Content-Length': signedBuffer.length,
      'X-Signature-Detection-Method': detectionMethod,
      'X-Signature-Page': String(signConfig.page),
      'X-Reference-Id': referenceId,
      'X-Duration-Ms': String(durationMs),
    });
    res.status(200).send(signedBuffer);
  },
);

// ─── Global error handler ─────────────────────────────────────

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'El archivo excede el tamaño máximo permitido', code: 'file_too_large' });
    return;
  }

  if (err.message === 'Solo se aceptan archivos PDF' || err.message === 'La firma debe ser PNG o JPEG') {
    res.status(400).json({ error: err.message, code: 'invalid_file_type' });
    return;
  }

  logger.error({ err, url: req.url }, 'Unhandled server error');
  res.status(500).json({ error: 'Error interno del servidor', code: 'internal_error' });
});

// ─── Start ────────────────────────────────────────────────────

const isMainModule =
  Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Auto-sign service started');

    if (!process.env.AUTO_SIGN_API_KEY) {
      logger.warn('AUTO_SIGN_API_KEY is not set — all requests will be rejected');
    }
  });
}

export default app;
