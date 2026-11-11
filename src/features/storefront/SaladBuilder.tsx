"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  buildNotes,
  missingGroups,
  pick,
  saladOptions,
  type Customization,
  type OptionGroup,
} from "@/features/ordering/customization";
import { formatBRL } from "@/features/ordering/money";
import type { CatalogProduct } from "@/features/ordering/types";

export type SaladExtra = { productId: string; quantity: number };

export function OptionGroups({
  groups,
  value,
  onChange,
}: {
  groups: OptionGroup[];
  value: Customization;
  onChange: (next: Customization) => void;
}) {
  return (
    <>
      {groups.map((group) => {
        const chosen = value[group.key] ?? [];
        return (
          <fieldset className="option-group" key={group.key}>
            <legend>
              {group.title}
              <small>
                {group.min ? "Obrigatório" : "Opcional"} ·{" "}
                {group.max === 1 ? "escolha 1" : `até ${group.max}`}
              </small>
            </legend>
            <div className="chips" role="group" aria-label={group.title}>
              {group.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={chosen.includes(choice)}
                  className={chosen.includes(choice) ? "active" : ""}
                  onClick={() =>
                    onChange({ ...value, [group.key]: pick(group, chosen, choice) })
                  }
                >
                  {choice}
                </button>
              ))}
            </div>
          </fieldset>
        );
      })}
    </>
  );
}

export function SaladBuilder({
  product,
  addOns,
  onConfirm,
  onClose,
}: {
  product: CatalogProduct;
  addOns: CatalogProduct[];
  onConfirm: (notes: string, extras: SaladExtra[]) => void;
  onClose: () => void;
}) {
  const { groups, saladCount } = saladOptions(product.slug);
  const [value, setValue] = useState<Customization>(() =>
    Object.fromEntries(groups.map((g) => [g.key, []])),
  );
  const [extras, setExtras] = useState<Record<string, number>>({});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const missing = missingGroups(groups, value);
  const extrasCents = addOns.reduce(
    (sum, p) => sum + p.priceCents * (extras[p.id] ?? 0) * saladCount,
    0,
  );
  const changeExtra = (id: string, delta: number) =>
    setExtras((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="builder-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="builder-title">{product.name}</h2>
            <p>{product.description}</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} autoFocus>
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">
          <OptionGroups groups={groups} value={value} onChange={setValue} />
          <fieldset className="option-group">
            <legend>
              Adicionais pagos
              <small>{saladCount === 2 ? "Valor para as 2 saladas" : "Opcional"}</small>
            </legend>
            {addOns.map((p) => {
              const qty = extras[p.id] ?? 0;
              return (
                <div className="add-on" key={p.id}>
                  <span>{p.name}</span>
                  <strong>+ {formatBRL(p.priceCents * saladCount)}</strong>
                  {qty ? (
                    <div className="quantity">
                      <button
                        type="button"
                        aria-label={`Remover ${p.name}`}
                        onClick={() => changeExtra(p.id, -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{qty}</span>
                      <button
                        type="button"
                        aria-label={`Adicionar ${p.name}`}
                        onClick={() => changeExtra(p.id, 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="add-button"
                      aria-label={`Adicionar ${p.name}`}
                      onClick={() => changeExtra(p.id, 1)}
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </fieldset>
        </div>
        <footer className="modal-footer">
          {missing.length > 0 && (
            <p>Falta escolher: {missing.map((g) => g.title.toLowerCase()).join(", ")}.</p>
          )}
          <Button
            fullWidth
            disabled={missing.length > 0}
            onClick={() =>
              onConfirm(
                buildNotes(value),
                Object.entries(extras)
                  .filter(([, qty]) => qty > 0)
                  .map(([productId, qty]) => ({ productId, quantity: qty * saladCount })),
              )
            }
          >
            Adicionar · {formatBRL(product.priceCents + extrasCents)}
          </Button>
        </footer>
      </div>
    </div>
  );
}
