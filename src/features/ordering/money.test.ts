import { describe, expect, it } from "vitest";

import { formatBRL } from "./money";

describe("formatBRL", () => {
  it("formats integer centavos without floating-point drift", () => {
    expect(formatBRL(2_599)).toBe("R$ 25,99");
    expect(formatBRL(1)).toBe("R$ 0,01");
  });

  it("rejects fractional centavos instead of silently rounding money", () => {
    expect(() => formatBRL(199.5)).toThrow(/centavos inteiros/i);
  });
});
