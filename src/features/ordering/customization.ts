// Free salad choices (Brendi menu) travel in the item notes:
// "Proteína: Frango Grelhado | Acomp.: Pepino, Milho | Molho: Molho de Ervas Fit | Extras: Limão".
export type OptionGroup = {
  key: string;
  title: string;
  min: number;
  max: number;
  choices: string[];
};

export const SIDES = [
  "Tomate Cereja",
  "Pepino",
  "Cenoura Ralada",
  "Beterraba Ralada",
  "Cebola Roxa",
  "Manga",
  "Abacaxi",
  "Azeitona",
  "Palmito",
  "Milho",
  "Ervilha",
  "Uva Passa",
  "Azeite",
  "Banana Assada",
  "Batata Doce Assada",
  "Macarrão Cozido",
  "Queijo Mussarela",
];

export const SALAD_GROUPS: OptionGroup[] = [
  {
    key: "Proteína",
    title: "Escolha sua proteína",
    min: 1,
    max: 1,
    choices: [
      "Carne Desfiada",
      "Carne Suína em Tiras",
      "Frango Grelhado",
      "Ovo Cozido (2 und)",
    ],
  },
  { key: "Acomp.", title: "Acompanhamentos", min: 1, max: 5, choices: SIDES },
  {
    key: "Molho",
    title: "Escolha seu molho (30ml)",
    min: 1,
    max: 1,
    choices: ["Não quero molho", "Molho de Ervas Fit", "Molho de Mostarda e Mel"],
  },
  { key: "Extras", title: "Limão e sal", min: 0, max: 2, choices: ["Limão", "Sal"] },
];

export const COMBO_DRINK_GROUP: OptionGroup = {
  key: "Bebida",
  title: "Bebida do combo",
  min: 1,
  max: 1,
  choices: [
    "Água sem gás 500ml",
    "Água com gás 500ml",
    "Coca-Cola lata 350ml",
    "Fanta Laranja lata 350ml",
    "Guaraná Mineiro lata 350ml",
    "Guaraná Mineiro Zero lata 350ml",
  ],
};

// Which groups a salad-category product shows and how many salads it serves, by slug.
export function saladOptions(slug = "") {
  return {
    groups: slug.includes("bebida") ? [...SALAD_GROUPS, COMBO_DRINK_GROUP] : SALAD_GROUPS,
    saladCount: slug.includes("2-saladas") ? 2 : 1,
  };
}

export type Customization = Record<string, string[]>;

export function parseCustomization(notes = ""): Customization {
  return Object.fromEntries(
    notes
      .split(" | ")
      .filter(Boolean)
      .map((part) => {
        const [key, rest = ""] = part.split(": ");
        return [key, rest.split(", ").filter(Boolean)];
      }),
  );
}

export function buildNotes(c: Customization): string {
  return Object.entries(c)
    .filter(([, values]) => values.length)
    .map(([key, values]) => `${key}: ${values.join(", ")}`)
    .join(" | ");
}

// Toggle a choice respecting the group's max; max 1 behaves like a radio.
export function pick(group: OptionGroup, values: string[], value: string): string[] {
  if (values.includes(value)) return values.filter((v) => v !== value);
  if (group.max === 1) return [value];
  return values.length < group.max ? [...values, value] : values;
}

export const missingGroups = (groups: OptionGroup[], c: Customization) =>
  groups.filter((g) => (c[g.key]?.length ?? 0) < g.min);
