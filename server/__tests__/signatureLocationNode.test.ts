import { describe, expect, it } from 'vitest';
import { calculateSignaturePosition } from '../lib/signatureLocationNode.js';

describe('calculateSignaturePosition', () => {
  it('centers the stamp on the signer text width', () => {
    const position = calculateSignaturePosition(
      { page: 2, x: 80, y: 300, width: 140, height: 0 },
      0,
      0,
      48,
    );

    expect(position).toEqual({
      page: 2,
      x: 126,
      y: 300,
    });
  });

  it('applies offsets after centering', () => {
    const position = calculateSignaturePosition(
      { page: 2, x: 80, y: 300, width: 140, height: 0 },
      5,
      -14,
      48,
    );

    expect(position).toEqual({
      page: 2,
      x: 131,
      y: 286,
    });
  });

  it('keeps left alignment when the region is narrower than the stamp', () => {
    const position = calculateSignaturePosition(
      { page: 2, x: 80, y: 300, width: 20, height: 0 },
      0,
      0,
      38,
    );

    expect(position.x).toBe(80);
  });
});
