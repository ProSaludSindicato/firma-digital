import { describe, expect, it } from "vitest";
import {
  SATISFACTION_SCORE_LABELS,
  SATISFACTION_TAGLINE,
} from "@/components/ConvenioSatisfactionRating";

describe("ConvenioSatisfactionRating", () => {
  it("covers scores from 1 to 5 without comments", () => {
    expect(Object.keys(SATISFACTION_SCORE_LABELS).map(Number)).toEqual([1, 2, 3, 4, 5]);
    expect(SATISFACTION_SCORE_LABELS[1]).toBe("Muy mala");
    expect(SATISFACTION_SCORE_LABELS[5]).toBe("Excelente");
  });

  it("uses a reassuring tagline instead of a dismiss action", () => {
    expect(SATISFACTION_TAGLINE).toMatch(/pensando en ti/i);
  });
});
