// Per-salad ingredient choices travel in the item notes (free text the DB already stores).
export const TOPPINGS = [
  "tomate cereja",
  "manga",
  "azeitona",
  "palmito",
  "milho",
  "ervilha",
  "cebola roxa",
  "cenoura ralada",
  "beterraba",
  "pepino",
  "azeite",
  "queijo mussarela",
  "molho de ervas",
];

export const ADDITIONS = ["limão", "sal", "azeite extra"];

export type Customization = { without: string[]; with: string[] };

const list = (notes: string, key: string) =>
  notes
    .match(new RegExp(`${key}: ([^|]+)`))?.[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

export function parseCustomization(notes = ""): Customization {
  return { without: list(notes, "Sem"), with: list(notes, "Com") };
}

export function buildNotes(c: Customization): string {
  return [
    c.without.length ? `Sem: ${c.without.join(", ")}` : "",
    c.with.length ? `Com: ${c.with.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

export const toggle = (values: string[], value: string) =>
  values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
