const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function assertIntegerCents(cents: number): void {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(
      "Valores monetários devem usar centavos inteiros e seguros.",
    );
  }
}

export function formatBRL(cents: number): string {
  assertIntegerCents(cents);

  return brlFormatter.format(cents / 100).replace(/[\u00a0\u202f]/g, " ");
}
