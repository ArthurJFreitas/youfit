import { describe, expect, it } from "vitest";
import { productionLines } from "./production";

const item = (product_name: string, quantity: number, customer_notes = "") => ({ product_name, quantity, customer_notes });
const orders = [
  { status: "paid", order_deliveries: [
    { delivery_date: "2026-11-12", order_items: [item("Salada Fit", 1, "Proteína: Frango"), item("Limão", 2)] },
    { delivery_date: "2026-11-13", order_items: [item("Salada Fit", 1, "Proteína: Carne")] },
  ] },
  { status: "preparing", order_deliveries: [
    { delivery_date: "2026-11-12", order_items: [item("Salada Fit", 2, "Proteína: Frango"), item("Salada Fit", 1, "Proteína: Carne")] },
  ] },
  { status: "cancelled", order_deliveries: [
    { delivery_date: "2026-11-12", order_items: [item("Salada Fit", 9, "Proteína: Frango")] },
  ] },
];

describe("productionLines", () => {
  it("sums one date across orders, grouped by product and montagem, skipping cancelled", () => {
    expect(productionLines(orders, "2026-11-12")).toEqual([
      { name: "Limão", notes: "", quantity: 2 },
      { name: "Salada Fit", notes: "Proteína: Carne", quantity: 1 },
      { name: "Salada Fit", notes: "Proteína: Frango", quantity: 3 },
    ]);
  });
  it("returns nothing for a date without deliveries", () => {
    expect(productionLines(orders, "2026-11-20")).toEqual([]);
  });
});
