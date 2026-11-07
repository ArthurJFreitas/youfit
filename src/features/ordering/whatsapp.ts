import { formatBRL } from "./money";
import type { BusinessSettings, OrderReceipt } from "./types";
import { normalizeBrazilianPhone } from "./validation";

function formatPhone(phone: string): string {
  const normalized = normalizeBrazilianPhone(phone);
  const areaCode = normalized.slice(2, 4);
  const localNumber = normalized.slice(4);
  const splitAt = localNumber.length === 9 ? 5 : 4;

  return `+55 ${areaCode} ${localNumber.slice(0, splitAt)}-${localNumber.slice(splitAt)}`;
}

function formatDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error("A data da entrega deve estar no formato YYYY-MM-DD.");
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function buildWhatsAppSummary(
  order: OrderReceipt,
  settings: BusinessSettings,
): string {
  const lines = [
    `🥗 Pedido ${settings.businessName} #${order.orderNumber}`,
    "",
    `Cliente: ${order.customer.name}`,
    `WhatsApp: ${formatPhone(order.customer.phone)}`,
    `Endereço: ${order.address.street}, ${order.address.number} — ${order.address.neighborhood}`,
  ];

  if (order.address.complement) {
    lines.push(`Complemento: ${order.address.complement}`);
  }
  if (order.address.reference) {
    lines.push(`Referência: ${order.address.reference}`);
  }
  if (order.customerNotes) {
    lines.push(`Observações: ${order.customerNotes}`);
  }

  lines.push("", "Entregas:");
  order.deliveries.forEach((delivery, index) => {
    lines.push(`Entrega ${index + 1} — ${formatDate(delivery.date)}`);
    if (delivery.timeWindow) {
      lines.push(`Horário: ${delivery.timeWindow}`);
    }
    delivery.items.forEach((item) => {
      lines.push(
        `• ${item.quantity}x ${item.productName} — ${formatBRL(item.lineTotalCents)}`,
      );
      if (item.notes) {
        lines.push(`  Obs.: ${item.notes}`);
      }
    });
  });

  lines.push(
    "",
    "Resumo financeiro:",
    `Subtotal: ${formatBRL(order.subtotalCents)}`,
  );
  if (order.discountCents > 0) {
    lines.push(`Desconto: ${formatBRL(order.discountCents)}`);
  }
  lines.push(
    `Taxa de entrega: ${formatBRL(order.deliveryFeeCents)}`,
    `Total: ${formatBRL(order.totalCents)}`,
    "",
    `${settings.pixKeyType ? `Pix (${settings.pixKeyType})` : "Pix"}: ${settings.pixKey}`,
    `Favorecido: ${settings.pixRecipient}`,
  );
  if (settings.paymentInstructions) {
    lines.push(settings.paymentInstructions);
  }

  return lines.join("\n");
}

export function buildWhatsAppUrl(phone: string, summary: string): string {
  const normalizedPhone = normalizeBrazilianPhone(phone);
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(summary)}`;
}
