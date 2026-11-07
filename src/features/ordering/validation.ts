import { z } from "zod";

import type { OrderDraft } from "./types";

function optionalTrimmedString(maxLength: number) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(maxLength).optional(),
  );
}

export function normalizeBrazilianPhone(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  const nationalNumber = digits.startsWith("55") ? digits.slice(2) : "";
  const isMobile = /^[1-9]\d9\d{8}$/.test(nationalNumber);
  const isLandline = /^[1-9]\d[2-5]\d{7}$/.test(nationalNumber);

  if (!isMobile && !isLandline) {
    throw new Error("Informe um telefone brasileiro válido.");
  }

  return digits;
}

const phoneSchema = z
  .string()
  .trim()
  .superRefine((value, context) => {
    try {
      normalizeBrazilianPhone(value);
    } catch {
      context.addIssue({
        code: "custom",
        message: "Informe um telefone brasileiro válido.",
      });
    }
  })
  .transform(normalizeBrazilianPhone);

const customerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: phoneSchema,
});

const addressSchema = z
  .object({
    street: z.string().trim().min(2).max(140),
    number: z.string().trim().min(1).max(20),
    neighborhood: z.string().trim().min(2).max(80),
    complement: optionalTrimmedString(100),
    reference: optionalTrimmedString(140),
  })
  .transform(({ complement, reference, ...required }) => ({
    ...required,
    ...(complement ? { complement } : {}),
    ...(reference ? { reference } : {}),
  }));

const itemSchema = z
  .object({
    productId: z.string().trim().min(1).max(100),
    quantity: z.number().int().min(1).max(99),
    comboId: optionalTrimmedString(100),
    notes: optionalTrimmedString(240),
  })
  .transform(({ comboId, notes, ...required }) => ({
    ...required,
    ...(comboId ? { comboId } : {}),
    ...(notes ? { notes } : {}),
  }));

const deliverySchema = z.object({
  deliveryDayId: z.string().trim().min(1).max(100),
  items: z.array(itemSchema).min(1).max(50),
});

const orderDraftSchema = z
  .object({
    customer: customerSchema,
    address: addressSchema,
    deliveries: z.array(deliverySchema).min(1).max(7),
    notes: optionalTrimmedString(500),
  })
  .transform(({ notes, ...required }) => ({
    ...required,
    ...(notes ? { notes } : {}),
  }));

export function validateOrderDraft(input: unknown): OrderDraft {
  return orderDraftSchema.parse(input);
}
