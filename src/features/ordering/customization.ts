// Per-salad choices travel in the item notes (free text the DB already stores).
export const DRINKS = [
  { name: "Coca-Cola", image: "/images/coca-cola.webp" },
  { name: "Coca-Cola Zero", image: "/images/coca-cola-zero.webp" },
  { name: "Água", image: "/images/agua.webp" },
  { name: "Água com gás", image: "/images/agua-com-gas.webp" },
  { name: "Mineiro Zero", image: "/images/mineiro-zero.webp" },
  { name: "Limoneto", image: "/images/limoneto.webp" },
];

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

export type Customization = { drink: string; without: string[]; with: string[] };

const list = (notes: string, key: string) =>
  notes
    .match(new RegExp(`${key}: ([^|]+)`))?.[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

export function parseCustomization(notes = ""): Customization {
  return {
    drink: list(notes, "Bebida")[0] || DRINKS[0].name,
    without: list(notes, "Sem"),
    with: list(notes, "Com"),
  };
}

export function buildNotes(c: Customization): string {
  return [
    `Bebida: ${c.drink}`,
    c.without.length ? `Sem: ${c.without.join(", ")}` : "",
    c.with.length ? `Com: ${c.with.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

export const toggle = (values: string[], value: string) =>
  values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
