type Row = Record<string, any>;

// What the kitchen must make for one delivery date: quantities grouped by product + montagem.
export function productionLines(orders: Row[], deliveryDate: string) {
  const totals = new Map<string, { name: string; notes: string; quantity: number }>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    for (const d of o.order_deliveries ?? []) {
      if (d.delivery_date !== deliveryDate) continue;
      for (const i of d.order_items ?? []) {
        const key = `${i.product_name}|${i.customer_notes ?? ""}`;
        const line = totals.get(key) ?? { name: i.product_name, notes: i.customer_notes ?? "", quantity: 0 };
        totals.set(key, { ...line, quantity: line.quantity + i.quantity });
      }
    }
  }
  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name) || a.notes.localeCompare(b.notes));
}
