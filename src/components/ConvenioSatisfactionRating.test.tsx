import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ConvenioSatisfactionRating,
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

  it("starts with no stars filled before the user interacts", () => {
    render(<ConvenioSatisfactionRating token="abc" canRate />);

    expect(screen.getByText("1 Muy mala · 5 Excelente")).toBeInTheDocument();
    expect(screen.queryByText("1 · Muy mala")).not.toBeInTheDocument();

    screen.getAllByRole("radio").forEach((star) => {
      expect(star).toHaveAttribute("aria-checked", "false");
    });
  });

  it("does not preview a score when a star receives focus on mount", () => {
    render(<ConvenioSatisfactionRating token="abc" canRate />);

    const firstStar = screen.getByRole("radio", { name: /1 de 5/i });
    firstStar.focus();

    expect(screen.getByText("1 Muy mala · 5 Excelente")).toBeInTheDocument();
    expect(screen.queryByText("1 · Muy mala")).not.toBeInTheDocument();
    expect(firstStar).toHaveAttribute("aria-checked", "false");
  });

  it("shows a hover preview without persisting a selection", () => {
    render(<ConvenioSatisfactionRating token="abc" canRate />);

    fireEvent.mouseEnter(screen.getByRole("radio", { name: /3 de 5/i }));
    expect(screen.getByText("3 · Regular")).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByRole("radio", { name: /3 de 5/i }));
    expect(screen.getByText("1 Muy mala · 5 Excelente")).toBeInTheDocument();
  });

  it("submits the selected score", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConvenioSatisfactionRating token="abc" canRate />);

    fireEvent.click(screen.getByRole("radio", { name: /4 de 5/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/satisfaction-rating"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ score: 4 }),
      }),
    );

    expect(await screen.findByText(/Gracias por tu calificación/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
