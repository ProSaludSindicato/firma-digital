import { describe, expect, it } from "vitest";
import { parsePublicToolsEnabledFlag } from "./appConfig";

describe("parsePublicToolsEnabledFlag", () => {
  it.each([undefined, "", "  ", "false", "0", "no", "yes", "enabled"])(
    "disables public tools for %j",
    (value) => {
      expect(parsePublicToolsEnabledFlag(value)).toBe(false);
    },
  );

  it.each(["true", "TRUE", " True ", "1"])("enables public tools for %j", (value) => {
    expect(parsePublicToolsEnabledFlag(value)).toBe(true);
  });
});
