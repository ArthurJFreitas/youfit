import { addDays, addWeeks, format, startOfWeek } from "date-fns";

import type {
  BusinessSettings,
  CatalogSnapshot,
} from "@/features/ordering/types";

export type StorefrontData = CatalogSnapshot & {
  settings: BusinessSettings;
  storefrontMessage: string;
};

const saladIds = {
  chicken: "10000000-0000-4000-8000-000000000001",
  eggCorn: "10000000-0000-4000-8000-000000000002",
  veggie: "10000000-0000-4000-8000-000000000003",
  tuna: "10000000-0000-4000-8000-000000000004",
};

export function createDemoStorefrontData(now = new Date()): StorefrontData {
  const nextMonday = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
  const eligibleProductIds = Object.values(saladIds);

  return {
    storefrontMessage:
      "Pedidos da próxima semana · escolha seus dias e receba tudo fresquinho em casa.",
    defaultDeliveryFeeCents: 600,
    settings: {
      businessName: "YouFit",
      whatsappNumber: "5511999999999",
      pixKey: "pagamentos@youfit.com.br",
      pixKeyType: "E-mail",
      pixRecipient: "YouFit Alimentação Saudável",
      paymentInstructions:
        "Envie o comprovante pelo WhatsApp para confirmarmos sua entrega.",
    },
    deliveryDays: Array.from({ length: 5 }, (_, index) => {
      const date = format(addDays(nextMonday, index), "yyyy-MM-dd");
      return {
        id: `demo-${date}`,
        date,
        enabled: true,
        capacity: 24,
        reservedQuantity: index * 2 + 3,
        feeCents: null,
        timeWindow: "11h30–13h30",
        cutoffAt: null,
      };
    }),
    products: [
      {
        id: saladIds.chicken,
        name: "Frango Mediterrâneo",
        slug: "frango-mediterraneo",
        description:
          "Frango grelhado, mix de folhas, tomate, pepino, milho e molho de ervas.",
        ingredients: ["frango", "folhas", "tomate", "pepino", "milho"],
        category: "salad",
        priceCents: 2490,
        active: true,
        available: true,
        sortOrder: 1,
      },
      {
        id: saladIds.eggCorn,
        name: "Ovo & Milho",
        slug: "ovo-e-milho",
        description:
          "Ovo cozido, alface crocante, milho, cenoura, tomate e molho cítrico.",
        ingredients: ["ovo", "alface", "milho", "cenoura", "tomate"],
        category: "salad",
        priceCents: 2190,
        active: true,
        available: true,
        sortOrder: 2,
      },
      {
        id: saladIds.veggie,
        name: "Horta Veggie",
        slug: "horta-veggie",
        description:
          "Grão-de-bico, folhas, beterraba, cenoura, pepino e sementes tostadas.",
        ingredients: ["grão-de-bico", "folhas", "beterraba", "pepino"],
        category: "salad",
        priceCents: 2290,
        active: true,
        available: true,
        sortOrder: 3,
      },
      {
        id: saladIds.tuna,
        name: "Atum Crocante",
        slug: "atum-crocante",
        description:
          "Atum, repolho roxo, alface, tomate, milho e crispy de grão-de-bico.",
        ingredients: ["atum", "repolho roxo", "alface", "milho"],
        category: "salad",
        priceCents: 2590,
        active: true,
        available: true,
        sortOrder: 4,
      },
      {
        id: "10000000-0000-4000-8000-000000000011",
        name: "Frango extra",
        description: "Porção de 100 g de peito de frango grelhado.",
        category: "protein",
        priceCents: 790,
        active: true,
        available: true,
        sortOrder: 10,
      },
      {
        id: "10000000-0000-4000-8000-000000000012",
        name: "Ovo cozido",
        description: "Uma unidade, cozida no ponto.",
        category: "protein",
        priceCents: 350,
        active: true,
        available: true,
        sortOrder: 11,
      },
      {
        id: "10000000-0000-4000-8000-000000000021",
        name: "Milho",
        description: "Porção extra de milho doce.",
        category: "extra",
        priceCents: 250,
        active: true,
        available: true,
        sortOrder: 20,
      },
      {
        id: "10000000-0000-4000-8000-000000000022",
        name: "Molho de ervas",
        description: "Pote extra do nosso molho leve de ervas.",
        category: "extra",
        priceCents: 250,
        active: true,
        available: true,
        sortOrder: 21,
      },
    ],
    combos: [
      {
        id: "20000000-0000-4000-8000-000000000003",
        name: "Trio da semana",
        description: "Escolha 3 dias e economize 5% nas saladas.",
        minimumDeliveryCount: 3,
        discountType: "percentage",
        discountValue: 5,
        eligibleProductIds,
        active: true,
        sortOrder: 1,
      },
      {
        id: "20000000-0000-4000-8000-000000000005",
        name: "Semana YouFit",
        description: "Cinco almoços resolvidos com 10% de desconto.",
        minimumDeliveryCount: 5,
        discountType: "percentage",
        discountValue: 10,
        eligibleProductIds,
        active: true,
        sortOrder: 2,
      },
    ],
  };
}
