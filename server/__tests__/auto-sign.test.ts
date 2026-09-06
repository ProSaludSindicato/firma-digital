/**
 * Integration tests for the auto-sign HTTP endpoint.
 *
 * Uses supertest against the Express app (not a real server port).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { PDFDocument } from 'pdf-lib';
import app from '../index.js';

const VALID_API_KEY = 'test-api-key-for-vitest';

const MIN_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function createTestPdf(): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([595, 842]);
  pdfDoc.addPage([595, 842]);
  return Buffer.from(await pdfDoc.save());
}

function withAuth(req: request.Test): request.Test {
  return req.set('X-Api-Key', VALID_API_KEY);
}

function withRequiredFields(req: request.Test, pdfBuffer: Buffer): request.Test {
  return withAuth(req)
    .attach('pdf', pdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
    .attach('signature', MIN_PNG, { filename: 'firma.png', contentType: 'image/png' })
    .field('search_text', 'JORGE IVAN ALVAREZ SOTO');
}

beforeEach(() => {
  process.env.AUTO_SIGN_API_KEY = VALID_API_KEY;
});

afterEach(() => {
  delete process.env.AUTO_SIGN_API_KEY;
});

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/auto-sign — authentication', () => {
  it('rejects request without X-Api-Key', async () => {
    const pdfBuffer = await createTestPdf();
    const res = await request(app)
      .post('/api/auto-sign')
      .attach('pdf', pdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('unauthorized');
  });

  it('rejects request with wrong X-Api-Key', async () => {
    const pdfBuffer = await createTestPdf();
    const res = await request(app)
      .post('/api/auto-sign')
      .set('X-Api-Key', 'wrong-key')
      .attach('pdf', pdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('unauthorized');
  });

  it('returns 500 when AUTO_SIGN_API_KEY is not configured', async () => {
    delete process.env.AUTO_SIGN_API_KEY;
    const pdfBuffer = await createTestPdf();
    const res = await request(app)
      .post('/api/auto-sign')
      .set('X-Api-Key', 'any-key')
      .attach('pdf', pdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe('misconfigured');
  });
});

describe('POST /api/auto-sign — payload validation', () => {
  it('returns 400 when pdf field is missing', async () => {
    const res = await withAuth(request(app).post('/api/auto-sign'))
      .attach('signature', MIN_PNG, { filename: 'firma.png', contentType: 'image/png' })
      .field('search_text', 'NOMBRE FIRMANTE');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('missing_pdf');
  });

  it('returns 400 for invalid PDF bytes (not starting with %PDF)', async () => {
    const fakePdf = Buffer.from('this is not a pdf');
    const res = await withRequiredFields(request(app).post('/api/auto-sign'), fakePdf);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_pdf');
  });

  it('returns 400 when signature field is missing', async () => {
    const pdfBuffer = await createTestPdf();
    const res = await withAuth(request(app).post('/api/auto-sign'))
      .attach('pdf', pdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('search_text', 'NOMBRE FIRMANTE');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('missing_signature');
  });

  it('returns 400 when search_text is missing', async () => {
    const pdfBuffer = await createTestPdf();
    const res = await withAuth(request(app).post('/api/auto-sign'))
      .attach('pdf', pdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
      .attach('signature', MIN_PNG, { filename: 'firma.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('missing_search_text');
  });
});

describe('POST /api/auto-sign — anchor not found', () => {
  it('returns 422 with anchor_not_found when search text is missing from the PDF', async () => {
    const pdfBuffer = await createTestPdf();
    const res = await withRequiredFields(request(app).post('/api/auto-sign'), pdfBuffer);

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('anchor_not_found');
  });
});

describe('POST /api/auto-sign — reference id echo', () => {
  it('echoes X-Reference-Id in response headers even on error responses', async () => {
    const pdfBuffer = await createTestPdf();
    const res = await withRequiredFields(request(app).post('/api/auto-sign'), pdfBuffer).set(
      'X-Reference-Id',
      '42',
    );

    expect(res.headers['x-reference-id']).toBe('42');
  });
});
