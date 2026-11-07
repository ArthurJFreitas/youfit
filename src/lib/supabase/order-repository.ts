import type { OrderDraft, OrderReceipt } from "@/features/ordering/types";
import { getSupabase } from "./client";

export async function createOrder(
  draft: OrderDraft,
  key: string,
): Promise<OrderReceipt> {
  const payload = {
    customer: draft.customer,
    address: draft.address,
    notes: draft.notes,
    deliveries: draft.deliveries.map((d) => ({
      delivery_day_id: d.deliveryDayId,
      items: d.items.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
        combo_id: i.comboId,
        notes: i.notes,
      })),
    })),
  };
  const { data, error } = await getSupabase().rpc("create_order", {
    payload,
    idempotency_key: key,
  });
  if (error) {
    const message = error.message.toLowerCase();
    throw new Error(
      message.includes("combo")
        ? "Confira os dias e itens do seu combo."
        : message.includes("delivery")
          ? "Um dia selecionado ficou indisponível. Atualize o calendário."
          : "Não conseguimos salvar seu pedido. Confira os dados e tente novamente.",
    );
  }
  return {
    id: data.order_id,
    orderNumber: data.order_number,
    status: data.status,
    customer: data.customer,
    address: data.address,
    customerNotes: data.customer_notes,
    subtotalCents: data.subtotal_cents,
    discountCents: data.discount_cents,
    deliveryFeeCents: data.delivery_fee_cents,
    totalCents: data.total_cents,
    createdAt: data.created_at,
    deliveries: data.deliveries.map((d: any) => ({
      date: d.delivery_date,
      feeCents: d.fee_cents,
      items: d.items.map((i: any) => ({
        productName: i.product_name,
        unitPriceCents: i.unit_price_cents,
        quantity: i.quantity,
        lineTotalCents: i.line_total_cents,
        notes: i.notes,
      })),
    })),
  };
}
