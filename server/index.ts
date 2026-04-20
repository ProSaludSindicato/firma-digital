/**
 * Auto-sign HTTP microservice for ProSalud president signature.
 *
 * Exposes:
 *   POST /api/auto-sign  — receive PDF, sign with president stamp, return signed PDF
 *   GET  /api/health     — liveness check
 *
 * Environment variables:
 *   AUTO_SIGN_API_KEY  (required)  — shared secret sent as X-Api-Key header by Laravel
 *   AUTO_SIGN_PORT     (default 3001)
 */

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
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
const IMG_MAX_BYTES = 5 * 1024 * 1024;  // 5 MB

// President signature anchor text and default config (mirrors autoSignConfig.ts)
const SEARCH_TEXT = 'JORGE IVAN ÁLVAREZ SOTO';
const DEFAULT_SIGN_CONFIG = {
  page: 2,
  x: 80,
  y: 255,
  width: 38,
  height: 50,
};

// Path to bundled default signature image
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIRMA_DEFAULT_PATH = path.resolve(__dirname, '../src/firma_default.png');

// ─── Logger ───────────────────────────────────────────────────

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// ─── App ──────────────────────────────────────────────────────

const app = express();

// ─── Rate limiting ────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'rate_limited' },
});

app.use('/api/', limiter);

// ─── Multer (multipart) ───────────────────────────────────────

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

// ─── Auth middleware ──────────────────────────────────────────

function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.AUTO_SIGN_API_KEY ?? '';
  if (!apiKey) {
    logger.warn('AUTO_SIGN_API_KEY no está configurada — rechazando todas las peticiones');
    res.status(500).json({ error: 'Servicio no configurado correctamente', code: 'misconfigured' });
    return;
  }

  const provided = req.headers['x-api-key'];
  if (!provided || provided !== apiKey) {
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
    const referenceId = req.headers['x-reference-id'] ?? '';
    const startedAt = Date.now();

    // Set the reference id on all responses for traceability
    res.set('X-Reference-Id', String(referenceId));

    const log = logger.child({ requestId, referenceId });
    log.info('auto-sign request received');

    // --- Validate PDF ------------------------------------------------
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const pdfFile = files?.['pdf']?.[0];

    if (!pdfFile) {
      res.status(400).json({ error: 'El campo pdf es obligatorio', code: 'missing_pdf' });
      return;
    }

    const pdfBuffer = pdfFile.buffer;

    // Magic bytes check
    if (pdfBuffer.length < 5 || pdfBuffer.slice(0, 5).toString('ascii') !== '%PDF-') {
      res.status(400).json({ error: 'El archivo pdf no es un PDF válido', code: 'invalid_pdf' });
      return;
    }

    // --- Resolve signature image --------------------------------------
    let signatureBuffer: Buffer;
    let isPng: boolean;

    const sigFile = files?.['signature']?.[0];
    if (sigFile) {
      if (sigFile.size > IMG_MAX_BYTES) {
        res.status(400).json({ error: 'La imagen de firma excede 5 MB', code: 'signature_too_large' });
        return;
      }
      signatureBuffer = sigFile.buffer;
      isPng = sigFile.mimetype === 'image/png';
    } else {
      // Use default president signature
      if (!fs.existsSync(FIRMA_DEFAULT_PATH)) {
        log.error({ path: FIRMA_DEFAULT_PATH }, 'firma_default.png no encontrada');
        res.status(500).json({ error: 'Imagen de firma por defecto no disponible', code: 'default_signature_missing' });
        return;
      }
      signatureBuffer = fs.readFileSync(FIRMA_DEFAULT_PATH);
      isPng = true; // firma_default.png is always PNG
    }

    // --- Detect signature position ------------------------------------
    let detectionMethod: string;
    let signConfig: typeof DEFAULT_SIGN_CONFIG;

    try {
      const detectionResult = await findSignatureLocationInBuffer(pdfBuffer, SEARCH_TEXT, 2);

      if (!detectionResult) {
        log.warn('Anchor not found in PDF');
        res.status(422).json({
          error: 'No se pudo detectar la posición de firma en el documento',
          code: 'anchor_not_found',
        });
        return;
      }

      const position = calculateSignaturePosition(detectionResult.location);
      detectionMethod = detectionResult.detectionMethod;

      signConfig = {
        page: position.page,
        x: position.x,
        y: position.y,
        width: DEFAULT_SIGN_CONFIG.width,
        height: DEFAULT_SIGN_CONFIG.height,
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

    // --- Sign PDF -----------------------------------------------------
    let signedBuffer: Buffer;

    try {
      signedBuffer = await signPDFWithBuffer(pdfBuffer, signatureBuffer, isPng, signConfig);
    } catch (err: any) {
      log.error({ err }, 'Error signing PDF');

      if (err.message?.includes('fuera de los límites')) {
        res.status(422).json({ error: err.message, code: 'draw_out_of_page' });
        return;
      }

      res.status(500).json({ error: 'Error al firmar el PDF', code: 'signing_error' });
      return;
    }

    // --- Return signed PDF --------------------------------------------
    const durationMs = Date.now() - startedAt;
    log.info({ durationMs }, 'auto-sign completed');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="convenio_firmado_presidente.pdf"',
      'Content-Length': signedBuffer.length,
      'X-Signature-Detection-Method': detectionMethod,
      'X-Signature-Page': String(signConfig.page),
      'X-Reference-Id': String(referenceId),
      'X-Duration-Ms': String(durationMs),
    });
    res.status(200).send(signedBuffer);
  },
);

// ─── Global error handler ─────────────────────────────────────

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, url: req.url }, 'Unhandled server error');
  res.status(500).json({ error: 'Error interno del servidor', code: 'internal_error' });
});

// ─── Start ────────────────────────────────────────────────────

app.listen(PORT, () => {
  logger.info({ port: PORT }, `Auto-sign service started`);

  if (!process.env.AUTO_SIGN_API_KEY) {
    logger.warn('AUTO_SIGN_API_KEY is not set — all requests will be rejected');
  }

  if (!fs.existsSync(FIRMA_DEFAULT_PATH)) {
    logger.warn({ path: FIRMA_DEFAULT_PATH }, 'firma_default.png not found — custom signature required on every request');
  }
});

export default app;
