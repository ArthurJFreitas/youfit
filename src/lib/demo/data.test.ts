import { describe, expect, it } from "vitest";

import { createDemoStorefrontData } from "./data";

describe("createDemoStorefrontData", () => {
  it("offers the five weekdays of the next week instead of trusting stale hard-coded dates", () => {
    const data = createDemoStorefrontData(
      new Date("2026-11-07T12:00:00-03:00"),
    );

    expect(data.deliveryDays.map((day) => day.date)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
    ]);
    expect(data.deliveryDays.every((day) => day.enabled)).toBe(true);
  });

  it("ships a usable fit-salad catalog and three/five-day combos", () => {
    const data = createDemoStorefrontData(
      new Date("2026-11-07T12:00:00-03:00"),
    );

    expect(data.products.map((product) => product.name)).toEqual(
      expect.arrayContaining([
        "Salada Fit",
        "Combo Salada Fit + 1 Bebida",
        "Combo 2 Saladas Fit",
        "Combo 2 Saladas Fit + Coca-Cola Zero 600ml",
      ]),
    );
    expect(data.combos.map((combo) => combo.minimumDeliveryCount)).toEqual([
      3, 5,
    ]);
    expect(data.settings.whatsappNumber).toMatch(/^55/);
  });
});
