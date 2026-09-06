import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("vercel pdf worker routing", () => {
  it("does not rewrite /pdf.worker.js to the SPA shell", () => {
    const vercel = JSON.parse(
      readFileSync(path.resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as {
      rewrites: Array<{ source: string; destination: string }>;
    };

    const source = vercel.rewrites[0]?.source ?? "";
    expect(source).toContain("pdf");
    expect(source).toContain("worker");
    expect("/pdf.worker.js").not.toMatch(new RegExp(`^${source}$`));
    expect("/sign/token").toMatch(new RegExp(`^${source}$`));
    expect(vercel.rewrites[0]?.destination).toBe("/index.html");
  });
});

