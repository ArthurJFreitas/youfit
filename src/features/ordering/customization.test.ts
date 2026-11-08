import { describe, expect, it } from "vitest";
import { buildNotes, parseCustomization, toggle } from "./customization";

describe("salad customization notes", () => {
  it("round-trips drink, removed toppings and additions", () => {
    const notes = buildNotes({
      drink: "Coca-Cola Zero",
      without: ["cebola roxa", "azeitona"],
      with: ["limão"],
    });
    expect(notes).toBe("Bebida: Coca-Cola Zero | Sem: cebola roxa, azeitona | Com: limão");
    expect(parseCustomization(notes)).toEqual({
      drink: "Coca-Cola Zero",
      without: ["cebola roxa", "azeitona"],
      with: ["limão"],
    });
  });

  it("defaults to the first drink and nothing removed", () => {
    expect(parseCustomization("")).toEqual({ drink: "Coca-Cola", without: [], with: [] });
    expect(buildNotes(parseCustomization(undefined))).toBe("Bebida: Coca-Cola");
  });

  it("toggles a value in and out", () => {
    expect(toggle([], "sal")).toEqual(["sal"]);
    expect(toggle(["sal"], "sal")).toEqual([]);
  });
});
