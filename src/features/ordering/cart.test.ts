import { describe, expect, it } from "vitest";

import { previewOrder } from "./cart";
import type { CatalogSnapshot, OrderDraft } from "./types";

const catalog = {
  defaultDeliveryFeeCents: 600,
  products: [
    {
      id: "salad-chicken",
      name: "Salada de frango",
      category: "salad",
      priceCents: 2_599,
      active: true,
      available: true,
    },
    {
      id: "egg-corn",
      name: "Salada de ovo e milho",
      category: "salad",
      priceCents: 499,
      active: true,
      available: true,
    },
    {
      id: "inactive-tuna",
      name: "Salada de atum",
      category: "salad",
      priceCents: 2_300,
      active: false,
      available: true,
    },
  ],
  combos: [
    {
      id: "combo-3",
      name: "Combo 3 entregas",
      minimumDeliveryCount: 3,
      discountType: "percentage",
      discountValue: 10,
      eligibleProductIds: ["salad-chicken", "egg-corn"],
      active: true,
    },
  ],
  deliveryDays: [
    {
      id: "day-1",
      date: "2026-11-09",
      enabled: true,
      capacity: 20,
      reservedQuantity: 2,
      feeCents: null,
    },
    {
      id: "day-2",
      date: "2026-11-11",
      enabled: true,
      capacity: 20,
      reservedQuantity: 2,
      feeCents: 750,
    },
    {
      id: "day-3",
      date: "2026-11-13",
      enabled: true,
      capacity: null,
      reservedQuantity: 0,
      feeCents: 0,
    },
  ],
} satisfies CatalogSnapshot;

const customer = {
  name: "Ana Souza",
  phone: "5511987654321",
};

const address = {
  street: "Rua das Flores",
  number: "123",
  neighborhood: "Centro",
};

function draft(deliveries: OrderDraft["deliveries"]): OrderDraft {
  return { customer, address, deliveries };
}

describe("previewOrder", () => {
  it("uses catalog centavos and ignores a price tampered into the browser draft", () => {
    const tamperedItem = {
      productId: "salad-chicken",
      quantity: 2,
      unitPriceCents: 1,
    } as OrderDraft["deliveries"][number]["items"][number];

    const preview = previewOrder(
      draft([{ deliveryDayId: "day-1", items: [tamperedItem] }]),
      catalog,
    );

    expect(preview.deliveries[0]?.items[0]).toMatchObject({
      unitPriceCents: 2_599,
      lineTotalCents: 5_198,
    });
    expect(preview).toMatchObject({
      subtotalCents: 5_198,
      discountCents: 0,
      deliveryFeeCents: 600,
      totalCents: 5_798,
    });
  });

  it("uses each date fee override, including an explicit free-delivery override", () => {
    const preview = previewOrder(
      draft([
        {
          deliveryDayId: "day-2",
          items: [{ productId: "egg-corn", quantity: 1 }],
        },
        {
          deliveryDayId: "day-3",
          items: [{ productId: "egg-corn", quantity: 1 }],
        },
      ]),
      catalog,
    );

    expect(preview.deliveries.map(({ feeCents }) => feeCents)).toEqual([
      750, 0,
    ]);
    expect(preview.deliveryFeeCents).toBe(750);
    expect(preview.totalCents).toBe(1_748);
  });

  it("rejects a combo used on fewer distinct dates than its minimum", () => {
    const input = draft([
      {
        deliveryDayId: "day-1",
        items: [
          { productId: "salad-chicken", quantity: 1, comboId: "combo-3" },
        ],
      },
      {
        deliveryDayId: "day-2",
        items: [{ productId: "egg-corn", quantity: 1, comboId: "combo-3" }],
      },
    ]);

    expect(() => previewOrder(input, catalog)).toThrowError(
      expect.objectContaining({ code: "COMBO_MINIMUM_DELIVERIES" }),
    );
  });

  it("floors percentage discounts over eligible combo lines after the minimum is met", () => {
    const input = draft([
      {
        deliveryDayId: "day-1",
        items: [
          { productId: "salad-chicken", quantity: 1, comboId: "combo-3" },
        ],
      },
      {
        deliveryDayId: "day-2",
        items: [
          { productId: "salad-chicken", quantity: 1, comboId: "combo-3" },
        ],
      },
      {
        deliveryDayId: "day-3",
        items: [
          { productId: "salad-chicken", quantity: 1, comboId: "combo-3" },
        ],
      },
    ]);

    const preview = previewOrder(input, catalog);

    expect(preview).toMatchObject({
      subtotalCents: 7_797,
      discountCents: 779,
      deliveryFeeCents: 1_350,
      totalCents: 8_368,
    });
  });

  it("rejects inactive catalog products even when their id is submitted directly", () => {
    const input = draft([
      {
        deliveryDayId: "day-1",
        items: [{ productId: "inactive-tuna", quantity: 1 }],
      },
    ]);

    expect(() => previewOrder(input, catalog)).toThrowError(
      expect.objectContaining({ code: "PRODUCT_UNAVAILABLE" }),
    );
  });
});
