import { describe, expect, it } from "vitest";
import { VOIVODESHIPS, isValidVoivodeships } from "../src/voivodeships";

describe("voivodeships", () => {
  it("contains all 16 voivodeships", () => {
    expect(VOIVODESHIPS).toHaveLength(16);
    expect(VOIVODESHIPS).toContain("mazowieckie");
    expect(VOIVODESHIPS).toContain("warmińsko-mazurskie");
  });

  it("accepts a non-empty list of valid names", () => {
    expect(isValidVoivodeships(["mazowieckie", "łódzkie"])).toBe(true);
  });

  it("rejects empty list, non-arrays and unknown names", () => {
    expect(isValidVoivodeships([])).toBe(false);
    expect(isValidVoivodeships("mazowieckie")).toBe(false);
    expect(isValidVoivodeships(["mazowieckie", "atlantyda"])).toBe(false);
  });
});
