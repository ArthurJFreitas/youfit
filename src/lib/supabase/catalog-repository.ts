import type { StorefrontData } from "@/lib/demo/data";
import { getSupabase } from "./client";

export async function getStorefrontData(): Promise<StorefrontData> {
  const db = getSupabase();
  const results = await Promise.all([
    db.from("products").select("*").eq("active", true).order("sort_order"),
    db
      .from("combos")
      .select("*, combo_products(product_id)")
      .eq("active", true)
      .order("sort_order"),
    db
      .from("delivery_days")
      .select(
        "id,delivery_date,enabled,capacity,reserved_quantity,fee_override_cents,delivery_window_start,delivery_window_end,cutoff_at",
      )
      .eq("enabled", true)
      .order("delivery_date"),
    db.from("business_settings").select("*").eq("id", 1).single(),
  ]);
  for (const result of results)
    if (result.error)
      throw new Error(
        "O cardápio ainda não está disponível. Tente novamente em instantes.",
      );
  const [products, combos, days, settings] = results;
  const s = settings.data as Record<string, any>;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const anchor = new Date(today + "T12:00:00Z");
  // lists from today through the end of next week; the cutoff check below keeps same-day orders to 2h before the window
  anchor.setUTCDate(anchor.getUTCDate() + (15 - (anchor.getUTCDay() || 7)));
  const afterWeek = anchor.toISOString().slice(0, 10);
  return {
    products: (products.data as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      ingredients: p.ingredients,
      category: p.category,
      priceCents: p.price_cents,
      active: p.active,
      available: p.available,
      imagePath: p.image_path,
      sortOrder: p.sort_order,
    })),
    combos: (combos.data as any[]).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      minimumDeliveryCount: c.minimum_delivery_count,
      discountType: c.discount_type,
      discountValue: c.discount_value,
      active: c.active,
      eligibleProductIds: c.combo_products.map((p: any) => p.product_id),
    })),
    deliveryDays: (days.data as any[])
      .filter(
        (d) =>
          d.delivery_date >= today &&
          d.delivery_date < afterWeek &&
          d.reserved_quantity < d.capacity &&
          new Date(d.cutoff_at || new Date(new Date(`${d.delivery_date}T${d.delivery_window_start}-03:00`).getTime() - s.default_cutoff_hours * 3600000).toISOString()) > new Date(),
      )
      .map((d) => ({
        id: d.id,
        date: d.delivery_date,
        enabled: d.enabled,
        capacity: d.capacity,
        reservedQuantity: d.reserved_quantity,
        feeCents: d.fee_override_cents,
        timeWindow: `${d.delivery_window_start.slice(0, 5)}–${d.delivery_window_end.slice(0, 5)}`,
        cutoffAt: d.cutoff_at,
      })),
    defaultDeliveryFeeCents: s.default_delivery_fee_cents,
    storefrontMessage: s.delivery_notice,
    settings: {
      businessName: s.business_name,
      whatsappNumber: s.whatsapp_phone,
      pixKey: s.pix_key,
      pixKeyType: s.pix_key_type,
      pixRecipient: s.pix_recipient,
      paymentInstructions: s.payment_instructions,
    },
  };
}
