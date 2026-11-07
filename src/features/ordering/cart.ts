import { assertIntegerCents } from "./money";
import {
  OrderDomainError,
  type CatalogCombo,
  type CatalogSnapshot,
  type OrderDraft,
  type OrderPreview,
  type OrderPreviewDelivery,
} from "./types";

type ComboAccumulator = {
  combo: CatalogCombo;
  deliveryDayIds: Set<string>;
  subtotalCents: number;
};

function assertNonNegativeCents(cents: number): void {
  try {
    assertIntegerCents(cents);
  } catch {
    throw new OrderDomainError(
      "INVALID_MONEY",
      "O catálogo contém um valor monetário inválido.",
    );
  }

  if (cents < 0) {
    throw new OrderDomainError(
      "INVALID_MONEY",
      "O catálogo contém um valor monetário negativo.",
    );
  }
}

function addCents(left: number, right: number): number {
  const result = left + right;
  assertNonNegativeCents(result);
  return result;
}

function multiplyCents(cents: number, quantity: number): number {
  const result = cents * quantity;
  assertNonNegativeCents(result);
  return result;
}

function percentageDiscount(subtotalCents: number, percentage: number): number {
  if (!Number.isSafeInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new OrderDomainError(
      "INVALID_MONEY",
      "O percentual de desconto do combo é inválido.",
    );
  }

  return Number((BigInt(subtotalCents) * BigInt(percentage)) / 100n);
}

function comboDiscount(group: ComboAccumulator): number {
  const { combo, subtotalCents } = group;

  if (combo.discountType === "percentage") {
    return percentageDiscount(subtotalCents, combo.discountValue);
  }

  assertNonNegativeCents(combo.discountValue);
  return Math.min(combo.discountValue, subtotalCents);
}

export function previewOrder(
  input: OrderDraft,
  catalog: CatalogSnapshot,
): OrderPreview {
  if (input.deliveries.length === 0) {
    throw new OrderDomainError(
      "EMPTY_ORDER",
      "Escolha ao menos um dia de entrega.",
    );
  }

  assertNonNegativeCents(catalog.defaultDeliveryFeeCents);

  const productsById = new Map(
    catalog.products.map((product) => [product.id, product]),
  );
  const combosById = new Map(catalog.combos.map((combo) => [combo.id, combo]));
  const deliveryDaysById = new Map(
    catalog.deliveryDays.map((day) => [day.id, day]),
  );
  const selectedDeliveryDayIds = new Set<string>();
  const comboGroups = new Map<string, ComboAccumulator>();
  const deliveries: OrderPreviewDelivery[] = [];
  let subtotalCents = 0;
  let deliveryFeeCents = 0;

  for (const requestedDelivery of input.deliveries) {
    if (selectedDeliveryDayIds.has(requestedDelivery.deliveryDayId)) {
      throw new OrderDomainError(
        "DUPLICATE_DELIVERY_DAY",
        "Cada dia de entrega deve aparecer apenas uma vez.",
      );
    }
    selectedDeliveryDayIds.add(requestedDelivery.deliveryDayId);

    const deliveryDay = deliveryDaysById.get(requestedDelivery.deliveryDayId);
    if (!deliveryDay?.enabled) {
      throw new OrderDomainError(
        "DELIVERY_DAY_UNAVAILABLE",
        "Um dos dias selecionados não está mais disponível.",
      );
    }
    if (
      deliveryDay.capacity !== null &&
      deliveryDay.reservedQuantity >= deliveryDay.capacity
    ) {
      throw new OrderDomainError(
        "DELIVERY_DAY_FULL",
        "Um dos dias selecionados está lotado.",
      );
    }
    if (requestedDelivery.items.length === 0) {
      throw new OrderDomainError(
        "EMPTY_DELIVERY",
        "Cada entrega precisa ter ao menos um item.",
      );
    }

    const feeCents = deliveryDay.feeCents ?? catalog.defaultDeliveryFeeCents;
    assertNonNegativeCents(feeCents);

    let deliverySubtotalCents = 0;
    const items = requestedDelivery.items.map((requestedItem) => {
      if (
        !Number.isSafeInteger(requestedItem.quantity) ||
        requestedItem.quantity <= 0
      ) {
        throw new OrderDomainError(
          "INVALID_QUANTITY",
          "As quantidades precisam ser números inteiros positivos.",
        );
      }

      const product = productsById.get(requestedItem.productId);
      if (!product?.active || !product.available) {
        throw new OrderDomainError(
          "PRODUCT_UNAVAILABLE",
          "Um dos itens escolhidos não está mais disponível.",
        );
      }
      assertNonNegativeCents(product.priceCents);

      const lineTotalCents = multiplyCents(
        product.priceCents,
        requestedItem.quantity,
      );
      deliverySubtotalCents = addCents(deliverySubtotalCents, lineTotalCents);

      if (requestedItem.comboId) {
        const combo = combosById.get(requestedItem.comboId);
        if (!combo?.active) {
          throw new OrderDomainError(
            "COMBO_UNAVAILABLE",
            "Um dos combos escolhidos não está mais disponível.",
          );
        }
        if (!combo.eligibleProductIds.includes(product.id)) {
          throw new OrderDomainError(
            "COMBO_PRODUCT_NOT_ELIGIBLE",
            `${product.name} não faz parte do combo ${combo.name}.`,
          );
        }

        const group = comboGroups.get(combo.id) ?? {
          combo,
          deliveryDayIds: new Set<string>(),
          subtotalCents: 0,
        };
        group.deliveryDayIds.add(deliveryDay.id);
        group.subtotalCents = addCents(group.subtotalCents, lineTotalCents);
        comboGroups.set(combo.id, group);
      }

      return {
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity: requestedItem.quantity,
        lineTotalCents,
        ...(requestedItem.comboId ? { comboId: requestedItem.comboId } : {}),
        ...(requestedItem.notes ? { notes: requestedItem.notes } : {}),
      };
    });

    subtotalCents = addCents(subtotalCents, deliverySubtotalCents);
    deliveryFeeCents = addCents(deliveryFeeCents, feeCents);
    deliveries.push({
      deliveryDayId: deliveryDay.id,
      date: deliveryDay.date,
      timeWindow: deliveryDay.timeWindow,
      items,
      subtotalCents: deliverySubtotalCents,
      feeCents,
    });
  }

  let discountCents = 0;
  const discounts = [...comboGroups.values()].map((group) => {
    if (group.deliveryDayIds.size < group.combo.minimumDeliveryCount) {
      throw new OrderDomainError(
        "COMBO_MINIMUM_DELIVERIES",
        `${group.combo.name} exige pelo menos ${group.combo.minimumDeliveryCount} dias de entrega.`,
      );
    }

    const value = comboDiscount(group);
    discountCents = addCents(discountCents, value);
    return {
      comboId: group.combo.id,
      comboName: group.combo.name,
      discountCents: value,
    };
  });

  const totalCents = subtotalCents - discountCents + deliveryFeeCents;
  assertNonNegativeCents(totalCents);

  return {
    deliveries,
    discounts,
    subtotalCents,
    discountCents,
    deliveryFeeCents,
    totalCents,
  };
}
