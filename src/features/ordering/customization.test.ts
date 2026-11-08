import { describe, expect, it } from "vitest";
import { buildNotes, parseCustomization, toggle } from "./customization";

describe("salad customization notes", () => {
  it("round-trips removed toppings and additions", () => {
    const notes = buildNotes({ without: ["cebola roxa", "azeitona"], with: ["limão"] });
    expect(notes).toBe("Sem: cebola roxa, azeitona | Com: limão");
    expect(parseCustomization(notes)).toEqual({
      without: ["cebola roxa", "azeitona"],
      with: ["limão"],
    });
  });

  it("is empty when nothing changed", () => {
    expect(parseCustomization(undefined)).toEqual({ without: [], with: [] });
    expect(buildNotes(parseCustomization(""))).toBe("");
  });

  it("toggles a value in and out", () => {
    expect(toggle([], "sal")).toEqual(["sal"]);
    expect(toggle(["sal"], "sal")).toEqual([]);
  });
});
