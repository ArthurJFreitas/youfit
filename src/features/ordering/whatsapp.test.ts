import { describe, expect, it } from "vitest";

import { buildWhatsAppSummary, buildWhatsAppUrl } from "./whatsapp";
import type { BusinessSettings, OrderReceipt } from "./types";

const order = {
  orderNumber: "YF-1042",
  status: "awaiting_pix",
  customer: {
    name: "Ana Souza",
    phone: "5511987654321",
  },
  address: {
    street: "Rua das Flores",
    number: "123",
    neighborhood: "Centro",
    complement: "Apto 42",
    reference: "Portaria azul",
  },
  customerNotes: "Sem cebola",
  deliveries: [
    {
      deliveryDayId: "day-1",
      date: "2026-11-09",
      feeCents: 600,
      items: [
        {
          productId: "salad-chicken",
          productName: "Salada de frango",
          unitPriceCents: 2_590,
          quantity: 2,
          lineTotalCents: 5_180,
        },
      ],
    },
    {
      deliveryDayId: "day-2",
      date: "2026-11-11",
      feeCents: 700,
      items: [
        {
          productId: "egg-corn",
          productName: "Salada de ovo e milho",
          unitPriceCents: 2_190,
          quantity: 1,
          lineTotalCents: 2_190,
        },
      ],
    },
  ],
  subtotalCents: 7_370,
  discountCents: 700,
  deliveryFeeCents: 1_300,
  totalCents: 7_970,
} satisfies OrderReceipt;

const settings = {
  businessName: "YouFit",
  whatsappNumber: "(11) 99999-0000",
  pixKey: "pix@youfit.com",
  pixKeyType: "email",
  pixRecipient: "YouFit Saladas",
  paymentInstructions: "Envie o comprovante por aqui.",
} satisfies BusinessSettings;

describe("buildWhatsAppSummary", () => {
  it("builds a copyable Portuguese payment summary grouped by delivery date", () => {
    const summary = buildWhatsAppSummary(order, settings);

    expect(summary).toContain("Pedido YouFit #YF-1042");
    expect(summary).toContain("Cliente: Ana Souza");
    expect(summary).toContain("WhatsApp: +55 11 98765-4321");
    expect(summary).toContain("Endereço: Rua das Flores, 123 — Centro");
    expect(summary).toContain("Complemento: Apto 42");
    expect(summary).toContain("Referência: Portaria azul");
    expect(summary).toContain("Observações: Sem cebola");
    expect(summary).toContain("Entrega 1 — 09/11/2026");
    expect(summary).toContain("2x Salada de frango — R$ 51,80");
    expect(summary).toContain("Entrega 2 — 11/11/2026");
    expect(summary).toContain("Subtotal: R$ 73,70");
    expect(summary).toContain("Desconto: R$ 7,00");
    expect(summary).toContain("Taxa de entrega: R$ 13,00");
    expect(summary).toContain("Total: R$ 79,70");
    expect(summary).toContain("Pix (email): pix@youfit.com");
    expect(summary).toContain("Favorecido: YouFit Saladas");
    expect(summary).toContain("Envie o comprovante por aqui.");
    expect(summary).not.toContain("undefined");
  });
});

describe("buildWhatsAppUrl", () => {
  it("normalizes the business phone and URL-encodes the complete summary", () => {
    const summary = "Pedido #YF-1042\nTotal: R$ 79,70";

    const url = new URL(buildWhatsAppUrl("(11) 99999-0000", summary));

    expect(`${url.origin}${url.pathname}`).toBe("https://wa.me/5511999990000");
    expect(url.searchParams.get("text")).toBe(summary);
  });
});
