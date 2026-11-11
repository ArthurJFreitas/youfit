"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Copy,
  CupSoda,
  Leaf,
  LoaderCircle,
  MapPin,
  Minus,
  Plus,
  Salad,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { YouFitLogo } from "@/components/brand/YouFitLogo";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import {
  buildNotes,
  missingGroups,
  parseCustomization,
  saladOptions,
  type Customization,
} from "@/features/ordering/customization";
import { previewOrder } from "@/features/ordering/cart";
import { formatBRL } from "@/features/ordering/money";
import { validateOrderDraft } from "@/features/ordering/validation";
import {
  buildWhatsAppSummary,
  buildWhatsAppUrl,
} from "@/features/ordering/whatsapp";
import type {
  OrderDraft,
  OrderDraftDelivery,
  OrderReceipt,
} from "@/features/ordering/types";
import { createDemoStorefrontData, type StorefrontData } from "@/lib/demo/data";
import { getStorefrontData } from "@/lib/supabase/catalog-repository";
import { createOrder } from "@/lib/supabase/order-repository";
import { OptionGroups, SaladBuilder, type SaladExtra } from "./SaladBuilder";

const weekdays = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

function dayName(date: string) {
  return weekdays[new Date(date + "T12:00:00Z").getUTCDay()];
}
function dateLabel(date: string) {
  return date.slice(8, 10) + "/" + date.slice(5, 7);
}
const emptyDraft: OrderDraft = {
  customer: { name: "", phone: "" },
  address: { street: "", number: "", neighborhood: "" },
  deliveries: [],
};

export function Storefront({
  initialData,
  submitOrder = createOrder,
}: {
  initialData?: StorefrontData;
  submitOrder?: typeof createOrder;
}) {
  const [data, setData] = useState<StorefrontData | undefined>(initialData);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<OrderDraft>(emptyDraft);
  const [activeDay, setActiveDay] = useState("");
  const [cep, setCep] = useState("");
  const [cutlery, setCutlery] = useState(true);
  const [comboId, setComboId] = useState("");
  const [category, setCategory] = useState("salad");
  const [builderId, setBuilderId] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<OrderReceipt>();
  const [copied, setCopied] = useState(false);
  const [acceptingOrders,setAcceptingOrders]=useState(Boolean(initialData));
  const idempotency = useRef("");
  const inFlight = useRef(false);

  async function load() {
    setError("");
    try {
      setData(await getStorefrontData());
      setAcceptingOrders(true);
    } catch (e) {
      setData(createDemoStorefrontData());
      setAcceptingOrders(false);
      setError('Nossa cozinha está se preparando. Confira o cardápio; os pedidos serão abertos em breve.');
    }
  }
  useEffect(() => {
    if (!initialData) void load();
  }, [initialData]);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("youfit-draft-v1") || "null",
      );
      if (saved?.draft && Array.isArray(saved.draft.deliveries)) {
        setDraft(saved.draft);
        setActiveDay(saved.draft.deliveries[0]?.deliveryDayId || "");
      }
      idempotency.current = saved?.key || crypto.randomUUID();
    } catch {
      idempotency.current = crypto.randomUUID();
    }
  }, []);
  useEffect(() => {
    if (idempotency.current && !receipt) {
      try {
        localStorage.setItem(
          "youfit-draft-v1",
          JSON.stringify({ draft, key: idempotency.current }),
        );
      } catch {
        /* private browser storage may be unavailable */
      }
    }
  }, [draft, receipt]);

  const deliveries = draft.deliveries;
  const selected = deliveries.find((d) => d.deliveryDayId === activeDay);
  const chosenCombo = data?.combos.find((c) => c.id === comboId);
  const openDayCount = (data?.deliveryDays ?? []).filter(
    (d) => d.enabled && (d.capacity === null || d.reservedQuantity < d.capacity),
  ).length;
  // A combo that needs more days than are open this week can never be completed.
  const offeredCombos = (data?.combos ?? []).filter(
    (c) => c.minimumDeliveryCount <= openDayCount,
  );
  let preview: ReturnType<typeof previewOrder> | undefined;
  let cartWarning = "";
  if (data && deliveries.length) {
    try {
      preview = previewOrder(draft, data);
    } catch (e) {
      cartWarning = (e as Error).message;
    }
  }
  const incompleteSalad = deliveries.some((d) =>
    d.items.some((i) => {
      const p = data?.products.find((x) => x.id === i.productId);
      return (
        p?.category === "salad" &&
        missingGroups(saladOptions(p.slug).groups, parseCustomization(i.notes)).length > 0
      );
    }),
  );
  if (preview && incompleteSalad)
    cartWarning = "Complete a montagem de cada salada: proteína, acompanhamentos e molho.";
  const count = deliveries.reduce(
    (sum, d) => sum + d.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );

  const dayIndex = (id: string) =>
    data?.deliveryDays.findIndex((d) => d.id === id) ?? 0;
  const chosenDays = [...deliveries].sort(
    (a, b) => dayIndex(a.deliveryDayId) - dayIndex(b.deliveryDayId),
  );
  const firstEmptyDay = chosenDays.find((d) => !d.items.length)?.deliveryDayId;

  function selectDay(id: string) {
    setCheckout(false);
    setError("");
    if (deliveries.some((d) => d.deliveryDayId === id)) {
      setActiveDay(id);
      return;
    }
    setDraft((prev) => ({
      ...prev,
      deliveries: [...prev.deliveries, { deliveryDayId: id, items: [] }],
    }));
    // Fill the week in order: keep building the earliest day still without a meal.
    setActiveDay(firstEmptyDay ?? id);
  }
  function removeDay(id: string) {
    const next = deliveries.filter((d) => d.deliveryDayId !== id);
    setDraft((prev) => ({ ...prev, deliveries: next }));
    if (id === activeDay) setActiveDay(next[0]?.deliveryDayId || "");
  }
  function changeItem(productId: string, delta: number) {
    if (!activeDay) {
      document
        .getElementById("delivery-days")
        ?.scrollIntoView({ behavior: "smooth" });
      setError("Escolha primeiro um dia de entrega.");
      return;
    }
    const product = data?.products.find((p) => p.id === productId);
    const onDay = selected?.items.some((i) => i.productId === productId);
    if (product?.category === "salad" && delta > 0 && !onDay) {
      setBuilderId(productId);
      return;
    }
    addItem(productId, delta);
  }
  function addItem(productId: string, delta: number, notes?: string) {
    const product = data?.products.find((p) => p.id === productId);
    const itemCombo = chosenCombo?.eligibleProductIds.includes(productId)
      ? comboId
      : undefined;
    setDraft((prev) => ({
      ...prev,
      deliveries: prev.deliveries.map((d) => {
        if (d.deliveryDayId !== activeDay) return d;
        const existing = d.items.find((i) => i.productId === productId);
        const quantity = Math.min(20, (existing?.quantity || 0) + delta);
        return {
          ...d,
          items:
            quantity <= 0
              ? d.items.filter((i) => i.productId !== productId)
              : existing
                ? d.items.map((i) =>
                    i.productId === productId ? { ...i, quantity } : i,
                  )
                : [
                    ...d.items,
                    {
                      productId,
                      quantity,
                      ...(product?.category === "salad" && itemCombo
                        ? { comboId: itemCombo }
                        : {}),
                      ...(notes ? { notes } : {}),
                    },
                  ],
        };
      }),
    }));
  }
  function buildSalad(notes: string, extras: SaladExtra[]) {
    addItem(builderId, 1, notes);
    for (const extra of extras) addItem(extra.productId, extra.quantity);
    setBuilderId("");
  }
  // shortcut: one customization per cart line, even with quantity > 1; split lines if customers ask.
  function customizeItem(dayId: string, productId: string, next: Customization) {
    setDraft((prev) => ({
      ...prev,
      deliveries: prev.deliveries.map((d) =>
        d.deliveryDayId !== dayId
          ? d
          : {
              ...d,
              items: d.items.map((i) =>
                i.productId === productId
                  ? { ...i, notes: buildNotes(next) }
                  : i,
              ),
            },
      ),
    }));
  }
  async function lookupCep(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    setCep(digits.replace(/^(\d{5})(\d)/, "$1-$2"));
    if (digits.length !== 8) return;
    try {
      const json = await (await fetch(`https://viacep.com.br/ws/${digits}/json/`)).json();
      if (json.erro) {
        setError("CEP não encontrado. Confira os números ou preencha o endereço à mão.");
        return;
      }
      setError("");
      setDraft((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          street: json.logradouro || prev.address.street,
          neighborhood: json.bairro || prev.address.neighborhood,
        },
      }));
      document.getElementById("number")?.focus();
    } catch {
      /* ViaCEP offline: the customer still types the address */
    }
  }
  function chooseCombo(id: string) {
    const nextId = comboId === id ? "" : id;
    const combo = data?.combos.find((c) => c.id === nextId);
    setComboId(nextId);
    // Picking a combo pre-selects the first available days it needs.
    const autoDays = (data?.deliveryDays ?? [])
      .filter(
        (day) =>
          day.enabled &&
          (day.capacity === null || day.reservedQuantity < day.capacity) &&
          !deliveries.some((d) => d.deliveryDayId === day.id),
      )
      .slice(0, Math.max(0, (combo?.minimumDeliveryCount ?? 0) - deliveries.length))
      .map((day) => ({ deliveryDayId: day.id, items: [] }));
    setDraft((prev) => ({
      ...prev,
      deliveries: [
        ...prev.deliveries.map((d) => ({
          ...d,
          items: d.items.map((i) => ({
            ...i,
            comboId: combo?.eligibleProductIds.includes(i.productId)
              ? nextId
              : undefined,
          })),
        })),
        ...autoDays,
      ],
    }));
    if (autoDays.length) setActiveDay(firstEmptyDay ?? autoDays[0].deliveryDayId);
    document
      .getElementById("delivery-days")
      ?.scrollIntoView({ behavior: "smooth" });
  }
  function repeatMeal() {
    if (!selected?.items.length) return;
    setDraft((prev) => ({
      ...prev,
      deliveries: prev.deliveries.map((d) => ({
        ...d,
        items: selected.items.map((i) => ({ ...i })),
      })),
    }));
  }
  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !data || !acceptingOrders || incompleteSalad) return;
    setError("");
    try {
      const valid = validateOrderDraft({
        ...draft,
        notes: [`Talher: ${cutlery ? "sim" : "não"}`, draft.notes]
          .filter(Boolean)
          .join(" | "),
      });
      previewOrder(valid, data);
      inFlight.current = true;
      setBusy(true);
      const order = await submitOrder(
        valid,
        idempotency.current || (idempotency.current = crypto.randomUUID()),
      );
      setReceipt(order);
      // keep who/where for the next order, drop the items
      localStorage.setItem(
        "youfit-draft-v1",
        JSON.stringify({ draft: { ...emptyDraft, customer: valid.customer, address: valid.address } }),
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (e instanceof Error && e.message.includes('indisponível') && !initialData) {
        try {
          const fresh = await getStorefrontData();
          setData(fresh);
          setDraft(prev => ({...prev, deliveries:prev.deliveries.filter(d=>fresh.deliveryDays.some(day=>day.id===d.deliveryDayId))}));
          setCheckout(false);
        } catch { /* keep the draft available for retry */ }
      }
      setError(
        e instanceof Error && e.name !== "ZodError"
          ? e.message
          : "Confira seu nome, WhatsApp e endereço antes de continuar.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError(
        "Não foi possível copiar automaticamente. Selecione o resumo abaixo.",
      );
    }
  }

  return (
    <>
      <div className="announcement">
        <Leaf size={13} aria-hidden="true" /> Feito com carinho. Entregue
        fresquinho. <span>Seu próximo almoço começa aqui.</span>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" aria-label="YouFit início">
            <YouFitLogo />
          </Link>
          <nav aria-label="Principal">
            <a href="#cardapio">Cardápio</a>
            <a href="#combos">Combos da semana</a>
            <a href="#como-funciona">Como funciona</a>
          </nav>
          <a
            className="header-bag"
            href="#pedido"
            onClick={(e) => {
              // empty cart on mobile lands on a dead end; send them to pick a day instead
              if (count) return;
              e.preventDefault();
              document.getElementById("cardapio")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <ShoppingBag size={19} />
            <span>Meu pedido</span>
            <b>{count}</b>
          </a>
        </div>
      </header>
      {receipt && data ? (
        <main className="container success-page">
          <div className="success-check">
            <CheckCheck size={40} />
          </div>
          <p className="eyebrow">Pedido recebido</p>
          <h1>Pronto. Agora é com a gente.</h1>
          <p>
            Seu pedido <strong>#{receipt.orderNumber}</strong> foi salvo e está
            aguardando o Pix. Envie o comprovante pelo WhatsApp para confirmar.
          </p>
          <div className="payment-card">
            <span>Total do pedido</span>
            <strong>{formatBRL(receipt.totalCents)}</strong>
            <small>Chave Pix · {data.settings.pixKeyType}</small>
            <code>{data.settings.pixKey}</code>
            <p>{data.settings.pixRecipient}</p>
            <Button
              variant="secondary"
              onClick={() => copy(data.settings.pixKey)}
            >
              <Copy size={16} />
              {copied ? "Copiado!" : "Copiar chave Pix"}
            </Button>
          </div>
          <a
            className="button button--primary"
            href={buildWhatsAppUrl(
              data.settings.whatsappNumber,
              buildWhatsAppSummary(receipt, data.settings),
            )}
            target="_blank"
            rel="noreferrer"
          >
            Enviar resumo no WhatsApp <ArrowRight size={18} />
          </a>
          <Button
            variant="ghost"
            onClick={() => copy(buildWhatsAppSummary(receipt, data.settings))}
          >
            Copiar resumo do pedido
          </Button>
          <details>
            <summary>Ver resumo completo</summary>
            <pre>{buildWhatsAppSummary(receipt, data.settings)}</pre>
          </details>
          {error && (
            <p role="alert" className="notice notice--error">
              {error}
            </p>
          )}
        </main>
      ) : (
        <main>
          <section className="hero">
            <div className="hero-image">
              <Image
                src="/images/youfit-salad-hero.webp"
                alt="Salada fresca com frango grelhado, ovo, milho e folhas verdes"
                fill
                priority
                sizes="100vw"
              />
            </div>
            <div className="container hero-inner">
              <div className="hero-copy">
                <div className="fresh-label">
                  <span /> Comida de verdade, todos os dias
                </div>
                <h1>
                  Mais leveza.
                  <br />
                  Mais sabor.
                  <br />
                  <em>Mais você.</em>
                </h1>
                <p>
                  Sua rotina merece uma pausa gostosa. Saladas completas,
                  ingredientes frescos e um almoço resolvido.
                </p>
                <a className="button button--primary hero-cta" href="#cardapio">
                  Montar meu pedido <ArrowRight size={18} />
                </a>
                <div className="hero-proof">
                  <div className="tiny-leaves">
                    <Leaf size={18} />
                  </div>
                  <span>
                    Preparado no dia.
                    <br />
                    <strong>Da nossa cozinha para sua casa.</strong>
                  </span>
                </div>
              </div>
              <div className="hero-sticker">
                <Salad size={26} />
                <span>
                  Fresquinho
                  <br />
                  <strong>de verdade.</strong>
                </span>
              </div>
            </div>
          </section>
          <section id="como-funciona" className="how-strip">
            <div className="container how-grid">
              <div>
                <span>01</span>
                <div>
                  <strong>Escolha seus dias</strong>
                  <p>Você decide quando receber.</p>
                </div>
              </div>
              <div>
                <span>02</span>
                <div>
                  <strong>Monte do seu jeito</strong>
                  <p>Saladas, extras e muito sabor.</p>
                </div>
              </div>
              <div>
                <span>03</span>
                <div>
                  <strong>Receba e aproveite</strong>
                  <p>Seu almoço chega até você.</p>
                </div>
              </div>
              <div className="how-delivery">
                <Truck size={23} />
                <strong>
                  100% entrega
                  <br />
                  em domicílio
                </strong>
              </div>
            </div>
          </section>
          <div className="container shop-layout" id="cardapio">
            <section className="menu-main">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Seu momento YouFit</p>
                  <h2>
                    O que vai de bom
                    <br />
                    <em>na sua semana?</em>
                  </h2>
                </div>
                <span className="small-tag">
                  <Leaf size={14} /> Fresco & feito à mão
                </span>
              </div>
              {error && (
                <div className="notice notice--error" role="alert">
                  {error}
                  {!data && (
                    <Button variant="ghost" onClick={load}>
                      Tentar novamente
                    </Button>
                  )}
                </div>
              )}
              {!data ? (
                <div className="menu-loading" role="status">
                  <LoaderCircle className="spin" /> Carregando o cardápio
                  fresquinho…
                </div>
              ) : (
                <>
                  <section className="day-section" id="delivery-days">
                    <div className="step-title">
                      <span>1</span>
                      <div>
                        <h3>Quando você quer receber?</h3>
                        <p>Selecione um ou mais dias da próxima semana.</p>
                      </div>
                    </div>
                    <div className="days-grid">
                      {data.deliveryDays.map((day) => {
                        const chosen = deliveries.some(
                          (d) => d.deliveryDayId === day.id,
                        );
                        return (
                          <button
                            key={day.id}
                            className={`day-button ${chosen ? "selected" : ""} ${activeDay === day.id ? "active" : ""}`}
                            aria-label={`${dayName(day.date)} ${day.date.slice(8, 10)} ${chosen ? "selecionado" : ""}`}
                            aria-pressed={chosen}
                            onClick={() => selectDay(day.id)}
                            disabled={
                              !day.enabled ||
                              (day.capacity !== null &&
                                day.reservedQuantity >= day.capacity)
                            }
                          >
                            <span>{dayName(day.date).slice(0, 3)}</span>
                            <strong>{day.date.slice(8, 10)}</strong>
                            <small>
                              {new Date(day.date + "T12:00:00Z")
                                .toLocaleDateString("pt-BR", {
                                  month: "short",
                                  timeZone: "UTC",
                                })
                                .replace(".", "")}
                            </small>
                            {chosen && <Check size={14} />}
                          </button>
                        );
                      })}
                    </div>
                    {!data.deliveryDays.length ? (
                      <p className="notice">
                        Ainda não abrimos as entregas da próxima semana. Volte
                        em breve!
                      </p>
                    ) : (
                      <p className="delivery-time">
                        <Clock3 size={14} /> Entregas das{" "}
                        {data.deliveryDays[0]?.timeWindow || "11h30 às 13h30"}{" "}
                        <span>
                          · Taxa a partir de{" "}
                          {formatBRL(data.defaultDeliveryFeeCents)}
                        </span>
                      </p>
                    )}
                  </section>
                  <section id="combos" className="combos-section">
                    <div className="combo-heading">
                      <Sparkles size={17} />
                      <h3>Uma semana mais leve. E mais em conta.</h3>
                    </div>
                    <div className="combo-grid">
                      {offeredCombos.map((combo, index) => (
                        <button
                          key={combo.id}
                          onClick={() => chooseCombo(combo.id)}
                          aria-pressed={comboId === combo.id}
                          className={`combo-card ${comboId === combo.id ? "selected" : ""} ${index === 1 ? "combo-card--dark" : ""}`}
                        >
                          <span>
                            {index === 1 ? "A SEMANA TODA" : "NA SUA ROTINA"}{" "}
                            <ChevronRight size={16} />
                          </span>
                          <strong>{combo.name}</strong>
                          <p>{combo.description}</p>
                          <b>
                            {combo.discountType === "percentage"
                              ? `${combo.discountValue}% OFF`
                              : `${formatBRL(combo.discountValue)} OFF`}
                          </b>
                          {comboId === combo.id && <Check size={18} />}
                        </button>
                      ))}
                    </div>
                    {chosenCombo && (
                      <p className="combo-hint">
                        Selecione pelo menos {chosenCombo.minimumDeliveryCount}{" "}
                        dias e adicione uma salada em cada dia para ativar seu
                        desconto.
                      </p>
                    )}
                  </section>
                  <section className="products-section">
                    <div className="step-title">
                      <span>2</span>
                      <div>
                        <h3>Agora, escolha seu sabor</h3>
                        <p>
                          {activeDay
                            ? `Montando a entrega de ${dayName(data.deliveryDays.find((d) => d.id === activeDay)?.date || "")}, ${dateLabel(data.deliveryDays.find((d) => d.id === activeDay)?.date || "")}`
                            : "Escolha um dia acima para começar seu pedido."}
                        </p>
                      </div>
                    </div>
                    {deliveries.length > 1 && (
                      <div
                        className="menu-tabs day-tabs"
                        role="group"
                        aria-label="Dia da entrega"
                      >
                        {chosenDays.map((d) => {
                          const day = data.deliveryDays.find(
                            (x) => x.id === d.deliveryDayId,
                          );
                          return (
                            <button
                              key={d.deliveryDayId}
                              className={activeDay === d.deliveryDayId ? "active" : ""}
                              aria-pressed={activeDay === d.deliveryDayId}
                              onClick={() => setActiveDay(d.deliveryDayId)}
                            >
                              {day ? `${dayName(day.date).slice(0, 3)} ${day.date.slice(8, 10)}` : "?"}
                              {d.items.length ? <Check size={12} /> : null}
                            </button>
                          );
                        })}
                        {selected?.items.length && firstEmptyDay ? (
                          <>
                            <button
                              className="day-tabs-next"
                              onClick={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  deliveries: prev.deliveries.map((d) =>
                                    d.items.length ? d : { ...d, items: selected.items },
                                  ),
                                }))
                              }
                            >
                              Repetir em todos os dias
                            </button>
                            <button
                              className="day-tabs-next"
                              onClick={() => setActiveDay(firstEmptyDay)}
                            >
                              Próximo dia <ChevronRight size={12} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    )}
                    <div
                      className="menu-tabs"
                      role="group"
                      aria-label="Categorias do cardápio"
                    >
                      {[
                        {
                          id: "salad",
                          name: "Nossas saladas",
                          icon: <Salad size={16} />,
                        },
                        {
                          id: "protein",
                          name: "Proteínas",
                          icon: <Plus size={16} />,
                        },
                        {
                          id: "extra",
                          name: "Extras & molhos",
                          icon: <Leaf size={16} />,
                        },
                        {
                          id: "drink",
                          name: "Bebidas",
                          icon: <CupSoda size={16} />,
                        },
                      ].map((c) => (
                        <button
                          key={c.id}
                          className={category === c.id ? "active" : ""}
                          onClick={() => setCategory(c.id)}
                        >
                          {c.icon}
                          {c.name}
                        </button>
                      ))}
                    </div>
                    <div className="product-grid">
                      {data.products
                        .filter((p) => (p.category === category || category === 'extra' && p.category === 'dressing') && p.active)
                        .map((p, index) => {
                          const qty =
                            selected?.items.find((i) => i.productId === p.id)
                              ?.quantity || 0;
                          return (
                            <article
                              className={`product-card product-card--${index % 4}`}
                              key={p.id}
                            >
                              {p.category === "salad" || p.imagePath ? (
                                <div className="product-photo">
                                  <Image
                                    src={
                                      p.imagePath ||
                                      "/images/youfit-salad-hero.webp"
                                    }
                                    alt={p.name}
                                    fill
                                    sizes="(max-width: 700px) 90vw, 30vw"
                                    className={`salad-photo salad-photo--${index % 4}`}
                                  />
                                  {index === 0 && p.category === "salad" && (
                                    <span className="product-badge">
                                      O queridinho
                                    </span>
                                  )}
                                  {p.category === "salad" && (
                                    <span className="product-weight">
                                      Refeição completa
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="extra-icon">
                                  <Leaf size={32} />
                                </div>
                              )}
                              <div className="product-body">
                                <div className="product-title">
                                  <h3>{p.name}</h3>
                                  {p.slug?.includes("veggie") && (
                                    <Leaf size={16} />
                                  )}
                                </div>
                                <p>{p.description}</p>
                                <div className="product-bottom">
                                  <strong>{formatBRL(p.priceCents)}</strong>
                                  {qty ? (
                                    <div className="quantity">
                                      <button
                                        aria-label={`Remover ${p.name}`}
                                        onClick={() => changeItem(p.id, -1)}
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <span>{qty}</span>
                                      <button
                                        aria-label={`Adicionar ${p.name}`}
                                        onClick={() => changeItem(p.id, 1)}
                                        disabled={qty >= 20}
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      className="add-button"
                                      aria-label={`Adicionar ${p.name}`}
                                      disabled={!p.available}
                                      onClick={() => changeItem(p.id, 1)}
                                    >
                                      <Plus size={18} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                    </div>
                  </section>
                </>
              )}
            </section>
            <aside className="cart-column" id="pedido">
              <div className="cart-card">
                <div className="cart-title">
                  <ShoppingBag size={21} />
                  <h2>Seu pedido</h2>
                  <span>{count}</span>
                </div>
                <p className="cart-subtitle">
                  Uma escolha boa para sua semana.
                </p>
                {!count && (
                  <div className="empty-cart">
                    <div>
                      <Salad size={34} />
                    </div>
                    <h3>Seu bowl está esperando</h3>
                    <p>Escolha um dia e adicione suas saladas favoritas.</p>
                    <ArrowDown size={19} />
                  </div>
                )}
                {data &&
                  deliveries.map((delivery) => {
                    const day = data.deliveryDays.find(
                      (d) => d.id === delivery.deliveryDayId,
                    );
                    return (
                      <div
                        className={`cart-day ${activeDay === delivery.deliveryDayId ? "active" : ""}`}
                        key={delivery.deliveryDayId}
                      >
                        <div className="cart-day-heading">
                          <button
                            onClick={() => setActiveDay(delivery.deliveryDayId)}
                          >
                            {day
                              ? `${dayName(day.date)} · ${dateLabel(day.date)}`
                              : "Dia indisponível"}
                            <span>
                              {activeDay === delivery.deliveryDayId
                                ? "Editando"
                                : "Editar"}
                            </span>
                          </button>
                          <button
                            aria-label="Remover dia"
                            onClick={() => removeDay(delivery.deliveryDayId)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {!delivery.items.length && (
                          <p className="cart-empty-day">
                            Adicione uma salada para esse dia.
                          </p>
                        )}
                        {delivery.items.map((item) => {
                          const product = data.products.find(
                            (p) => p.id === item.productId,
                          );
                          return (
                            <div className="cart-line" key={item.productId}>
                              <span>
                                <b>{item.quantity}×</b>{" "}
                                {product?.name || "Item indisponível"}
                              </span>
                              <strong>
                                {formatBRL(
                                  (product?.priceCents || 0) * item.quantity,
                                )}
                              </strong>
                              {product?.category === "salad" && (
                                <div className="customize">
                                  <details className="toppings">
                                    <summary>Ver / editar montagem</summary>
                                    <OptionGroups
                                      groups={saladOptions(product.slug).groups}
                                      value={parseCustomization(item.notes)}
                                      onChange={(next) =>
                                        customizeItem(delivery.deliveryDayId, item.productId, next)
                                      }
                                    />
                                  </details>
                                  {item.notes && <small>{item.notes}</small>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                {deliveries.length > 1 && selected?.items.length ? (
                  <button className="repeat-button" onClick={repeatMeal}>
                    <Copy size={13} /> Repetir estes itens nos outros dias
                  </button>
                ) : null}
                {preview && (
                  <div className="cart-totals">
                    <div>
                      <span>Saladas e extras</span>
                      <span>{formatBRL(preview.subtotalCents)}</span>
                    </div>
                    {preview.discountCents > 0 && (
                      <div className="discount">
                        <span>Economia do combo</span>
                        <span>− {formatBRL(preview.discountCents)}</span>
                      </div>
                    )}
                    <div>
                      <span>Entregas ({deliveries.length} dias)</span>
                      <span>{formatBRL(preview.deliveryFeeCents)}</span>
                    </div>
                    <div className="cart-grand-total">
                      <span>Total</span>
                      <strong>{formatBRL(preview.totalCents)}</strong>
                    </div>
                  </div>
                )}
                {cartWarning && <p className="cart-warning">{cartWarning}</p>}
                <Button
                  fullWidth
                  disabled={!preview || !count || !!cartWarning}
                  onClick={() => {
                    setCheckout(true);
                    setTimeout(
                      () =>
                        document
                          .getElementById("checkout")
                          ?.scrollIntoView({ behavior: "smooth" }),
                      50,
                    );
                  }}
                >
                  Continuar pedido <ArrowRight size={17} />
                </Button>
                <p className="cart-security">
                  <Check size={13} /> Confirmação e pagamento via Pix
                </p>
              </div>
              <div className="care-note">
                <Leaf size={20} />
                <p>
                  Pequenas escolhas.
                  <br />
                  <strong>Uma rotina muito melhor.</strong>
                </p>
              </div>
            </aside>
          </div>
          {checkout && preview && (
            <section className="container checkout-section" id="checkout">
              <div className="checkout-heading">
                <button
                  onClick={() => setCheckout(false)}
                  aria-label="Voltar ao cardápio"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <p className="eyebrow">Falta pouquinho</p>
                  <h2>Onde a gente te encontra?</h2>
                  <p>Preencha seus dados para receber em casa.</p>
                </div>
              </div>
              <form className="checkout-form" onSubmit={finish}>
                <div className="form-grid">
                  <Field htmlFor="name" label="Seu nome">
                    <input
                      id="name"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                      value={draft.customer.name}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          customer: { ...draft.customer, name: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field htmlFor="phone" label="WhatsApp">
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      placeholder="(11) 99999-9999"
                      value={draft.customer.phone}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          customer: {
                            ...draft.customer,
                            phone: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                  <Field htmlFor="cep" label="CEP" optional>
                    <input
                      id="cep"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="00000-000"
                      maxLength={9}
                      value={cep}
                      onChange={(e) => lookupCep(e.target.value)}
                    />
                  </Field>
                  {[
                    {
                      key: "street",
                      label: "Rua / avenida",
                      auto: "address-line1",
                    },
                    { key: "number", label: "Número", auto: "off" },
                    {
                      key: "neighborhood",
                      label: "Bairro",
                      auto: "address-level3",
                    },
                    {
                      key: "complement",
                      label: "Complemento",
                      auto: "address-line2",
                    },
                    {
                      key: "reference",
                      label: "Ponto de referência",
                      auto: "off",
                    },
                  ].map((f) => (
                    <Field
                      key={f.key}
                      htmlFor={f.key}
                      label={f.label}
                      optional={["complement", "reference"].includes(f.key)}
                    >
                      <input
                        id={f.key}
                        autoComplete={f.auto}
                        required={!["complement", "reference"].includes(f.key)}
                        maxLength={100}
                        value={
                          draft.address[f.key as keyof typeof draft.address] ||
                          ""
                        }
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            address: {
                              ...draft.address,
                              [f.key]: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                  ))}
                  <fieldset className="cutlery">
                    <legend>Precisa de talher?</legend>
                    <label>
                      <input
                        type="radio"
                        name="cutlery"
                        checked={cutlery}
                        onChange={() => setCutlery(true)}
                      />
                      Sim, por favor
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="cutlery"
                        checked={!cutlery}
                        onChange={() => setCutlery(false)}
                      />
                      Não precisa
                    </label>
                  </fieldset>
                  <Field htmlFor="notes" label="Alguma observação?" optional>
                    <textarea
                      id="notes"
                      maxLength={480}
                      placeholder="Alergias, orientações para entrega…"
                      value={draft.notes || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, notes: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="checkout-final">
                  <p>
                    Seu pedido será salvo como <strong>aguardando Pix</strong>.
                    Depois, envie o comprovante pelo WhatsApp.
                  </p>
                  <strong>{formatBRL(preview.totalCents)}</strong>
                  <Button type="submit" disabled={busy}>
                    {busy ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : (
                      <Check size={18} />
                    )}{" "}
                    {busy ? "Salvando seu pedido…" : "Finalizar pedido"}
                  </Button>
                </div>
                {error && (
                  <p className="notice notice--error" role="alert">
                    {error}
                  </p>
                )}
              </form>
            </section>
          )}
          <section className="closing-note container">
            <span>🥬</span>
            <h2>
              Comer bem pode ser simples.
              <br />
              <em>A gente cuida dessa parte.</em>
            </h2>
            <p>
              Ingredientes selecionados, preparo cuidadoso e o sabor de quem faz
              com carinho.
            </p>
          </section>
        </main>
      )}
      <footer className="site-footer">
        <div className="container footer-inner">
          <YouFitLogo />
          <span>Comida de verdade. Leveza para sua rotina.</span>
          <Link href="/admin/">
            Área administrativa <ArrowRight size={13} />
          </Link>
        </div>
        <div className="container footer-bottom">
          © {new Date().getFullYear()} YouFit · Feito com carinho.
        </div>
      </footer>
      {builderId && data && (
        <SaladBuilder
          product={data.products.find((p) => p.id === builderId)!}
          addOns={data.products.filter(
            (p) => p.available && ["protein", "extra", "dressing"].includes(p.category),
          )}
          onConfirm={buildSalad}
          onClose={() => setBuilderId("")}
        />
      )}
    </>
  );
}
