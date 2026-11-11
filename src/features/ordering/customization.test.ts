import { describe, expect, it } from "vitest";
import {
  SALAD_GROUPS,
  buildNotes,
  missingGroups,
  parseCustomization,
  pick,
  saladOptions,
} from "./customization";

const [protein, sides] = SALAD_GROUPS;

describe("salad customization notes", () => {
  it("round-trips the chosen groups in order", () => {
    const notes = buildNotes({
      Proteína: ["Frango Grelhado"],
      "Acomp.": ["Pepino", "Milho"],
      Molho: ["Molho de Ervas Fit"],
      Extras: [],
    });
    expect(notes).toBe(
      "Proteína: Frango Grelhado | Acomp.: Pepino, Milho | Molho: Molho de Ervas Fit",
    );
    expect(parseCustomization(notes)).toEqual({
      Proteína: ["Frango Grelhado"],
      "Acomp.": ["Pepino", "Milho"],
      Molho: ["Molho de Ervas Fit"],
    });
  });

  it("is empty when nothing was chosen", () => {
    expect(parseCustomization(undefined)).toEqual({});
    expect(buildNotes(parseCustomization(""))).toBe("");
  });

  it("picks like a radio when max is 1 and caps multi-choice groups", () => {
    expect(pick(protein, ["Carne Desfiada"], "Frango Grelhado")).toEqual(["Frango Grelhado"]);
    expect(pick(protein, ["Frango Grelhado"], "Frango Grelhado")).toEqual([]);
    const five = sides.choices.slice(0, 5);
    expect(pick(sides, five, "Azeite")).toEqual(five);
    expect(pick(sides, five, five[0])).toEqual(five.slice(1));
  });

  it("reports the required groups still missing", () => {
    expect(missingGroups(SALAD_GROUPS, {}).map((g) => g.key)).toEqual([
      "Proteína",
      "Acomp.",
      "Molho",
    ]);
    expect(
      missingGroups(SALAD_GROUPS, {
        Proteína: ["Frango Grelhado"],
        "Acomp.": ["Pepino"],
        Molho: ["Não quero molho"],
      }),
    ).toEqual([]);
  });

  it("adds the drink group and doubles add-ons for the combos", () => {
    expect(saladOptions("salada-fit")).toMatchObject({ saladCount: 1 });
    expect(saladOptions("salada-fit").groups).toHaveLength(4);
    expect(saladOptions("combo-salada-fit-bebida").groups.at(-1)?.key).toBe("Bebida");
    expect(saladOptions("combo-2-saladas-fit").saladCount).toBe(2);
  });
});
