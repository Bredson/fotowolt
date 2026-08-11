import { describe, expect, it } from "vitest";
import { VOIVODESHIPS, toggleVoivodeship } from "./voivodeships";

describe("toggleVoivodeship", () => {
  it("adds a code that is not selected", () => {
    expect(toggleVoivodeship(["mazowieckie"], "łódzkie")).toEqual(["mazowieckie", "łódzkie"]);
  });

  it("removes a code that is selected", () => {
    expect(toggleVoivodeship(["mazowieckie", "łódzkie"], "łódzkie")).toEqual(["mazowieckie"]);
  });

  it("has 16 voivodeships", () => {
    expect(VOIVODESHIPS).toHaveLength(16);
  });
});
