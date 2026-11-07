import { describe, expect, it } from "vitest";

import { validateOrderDraft } from "./validation";

describe("validateOrderDraft", () => {
  it("normalizes a Brazilian WhatsApp number and strips client-supplied prices", () => {
    const result = validateOrderDraft({
      customer: {
        name: "  Ana Souza  ",
        phone: "(11) 98765-4321",
      },
      address: {
        street: "  Rua das Flores ",
        number: " 123 ",
        neighborhood: " Centro ",
        complement: "   ",
        reference: " Portaria azul ",
      },
      notes: " Sem cebola ",
      deliveries: [
        {
          deliveryDayId: "day-1",
          items: [
            {
              productId: "salad-chicken",
              quantity: 2,
              unitPriceCents: 1,
              notes: " Molho separado ",
            },
          ],
        },
      ],
    });

    expect(result.customer).toEqual({
      name: "Ana Souza",
      phone: "5511987654321",
    });
    expect(result.address).toEqual({
      street: "Rua das Flores",
      number: "123",
      neighborhood: "Centro",
      reference: "Portaria azul",
    });
    expect(result.notes).toBe("Sem cebola");
    expect(result.deliveries[0]?.items[0]).toEqual({
      productId: "salad-chicken",
      quantity: 2,
      notes: "Molho separado",
    });
  });

  it("rejects numbers that cannot be a Brazilian mobile or landline", () => {
    expect(() =>
      validateOrderDraft({
        customer: { name: "Ana Souza", phone: "12345" },
        address: {
          street: "Rua das Flores",
          number: "123",
          neighborhood: "Centro",
        },
        deliveries: [
          {
            deliveryDayId: "day-1",
            items: [{ productId: "salad-chicken", quantity: 1 }],
          },
        ],
      }),
    ).toThrow(/telefone brasileiro/i);
  });
});
