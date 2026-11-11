"use client";
import { useEffect, useState, type FormEvent } from "react";
import { productionLines } from "./production";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Leaf,
  LoaderCircle,
  LogOut,
  Plus,
  Salad,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { YouFitLogo } from "@/components/brand/YouFitLogo";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { getSupabase } from "@/lib/supabase/client";
import { formatBRL } from "@/features/ordering/money";
import { normalizeBrazilianPhone } from "@/features/ordering/validation";
import { editableFields } from './mutations';

type Row = Record<string, any>;
const statuses: Record<string, string> = {
  awaiting_pix: "Aguardando Pix",
  paid: "Pago",
  preparing: "Em preparo",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};
const tabs = [
  { id: "orders", label: "Pedidos", icon: ClipboardList },
  { id: "calendar", label: "Calendário", icon: CalendarDays },
  { id: "products", label: "Cardápio", icon: Salad },
  { id: "combos", label: "Combos", icon: Sparkles },
  { id: "settings", label: "Configurações", icon: Settings },
];

export function AdminApp() {
  const [auth, setAuth] = useState<"loading" | "login" | "denied" | "admin">(
    "loading",
  );
  const [tab, setTab] = useState("orders");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<Row[]>([]);
  const [days, setDays] = useState<Row[]>([]);
  const [products, setProducts] = useState<Row[]>([]);
  const [combos, setCombos] = useState<Row[]>([]);
  const [settings, setSettings] = useState<Row>();
  const [detail, setDetail] = useState<Row>();
  const [editing, setEditing] = useState<{ table: string; row: Row }>();
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const db = getSupabase();

  async function checkSession(session: any) {
    if (!session) {
      setAuth("login");
      return;
    }
    const { data, error } = await db
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    setAuth(!error && data?.role === "admin" ? "admin" : "denied");
  }
  useEffect(() => {
    void db.auth.getSession().then(({ data }) => checkSession(data.session));
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => void checkSession(session), 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const result = await Promise.all([
        db
          .from("orders")
          .select("*,order_deliveries(*,order_items(*))")
          .order("created_at", { ascending: false })
          .limit(200),
        db.from("delivery_days").select("*").order("delivery_date"),
        db.from("products").select("*").order("sort_order"),
        db
          .from("combos")
          .select("*,combo_products(product_id)")
          .order("sort_order"),
        db.from("business_settings").select("*").eq("id", 1).single(),
      ]);
      result.forEach((r) => {
        if (r.error) throw r.error;
      });
      setOrders(result[0].data as Row[]);
      setDays(result[1].data as Row[]);
      setProducts(result[2].data as Row[]);
      setCombos(result[3].data as Row[]);
      setSettings(result[4].data as Row);
    } catch {
      setError(
        "Não conseguimos carregar os dados. Verifique a configuração do banco e tente atualizar.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (auth === "admin") void refresh();
  }, [auth]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const { error } = await db.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) setError("Não foi possível entrar. Confira o e-mail e a senha.");
    setBusy(false);
  }
  async function save(table: string, row: Row) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { id } = row;
      const fields = editableFields(row);
      const { error } = id
        ? await db.from(table).update(fields).eq("id", id)
        : await db.from(table).insert(fields);
      if (error) throw error;
      setEditing(undefined);
      setMessage("Alterações salvas.");
      await refresh();
    } catch {
      setError("Não foi possível salvar. Confira os campos e tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(table: string, row: Row) {
    if (!window.confirm(`Excluir "${row.name}"? Isso não pode ser desfeito.`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    const { error } = await db.from(table).delete().eq("id", row.id);
    if (error) setError("Não foi possível excluir. Tente novamente.");
    else {
      setMessage("Item excluído.");
      await refresh();
    }
    setBusy(false);
  }
  async function updateStatus(order: Row, status: string) {
    setBusy(true);
    setError("");
    const { error } = await db.rpc("admin_set_order_status", {
      target_order_id: order.id,
      new_status: status,
    });
    if (error) setError("Não foi possível atualizar o pedido.");
    else {
      setDetail(undefined);
      setMessage("Status atualizado.");
      await refresh();
    }
    setBusy(false);
  }
  if (auth === "loading")
    return (
      <main className="admin-loading">
        <LoaderCircle className="spin" /> Abrindo a cozinha…
      </main>
    );
  if (auth === "login" || auth === "denied")
    return (
      <main className="admin-login">
        <div className="login-brand">
          <YouFitLogo />
          <span>Da sua cozinha, para uma rotina mais leve.</span>
          <Salad size={150} strokeWidth={0.6} />
        </div>
        <div className="login-panel">
          <Link href="/">← Voltar à loja</Link>
          <p className="eyebrow">Área administrativa</p>
          <h1>
            Bem-vinda
            <br />à sua cozinha.
          </h1>
          <p>Seu cardápio, entregas e pedidos. Tudo em um lugar.</p>
          {auth === "denied" ? (
            <div className="notice notice--error">
              Esse usuário não tem acesso administrativo.
              <Button onClick={() => db.auth.signOut()} variant="ghost">
                Sair
              </Button>
            </div>
          ) : (
            <form onSubmit={login}>
              <Field htmlFor="email" label="E-mail">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                />
              </Field>
              <Field htmlFor="password" label="Senha">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              {error && (
                <p role="alert" className="notice notice--error">
                  {error}
                </p>
              )}
              <Button type="submit" fullWidth disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={17} /> : null}
                Entrar no painel
              </Button>
            </form>
          )}
          <small>Acesso exclusivo para a equipe YouFit.</small>
        </div>
      </main>
    );

  const visibleOrders = orders.filter(
    (o) =>
      (!filter || o.status === filter) &&
      (!dayFilter || o.order_deliveries?.some((d: Row) => d.delivery_date === dayFilter)) &&
      `${o.order_number} ${o.customer_name} ${o.customer_phone}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const firstWeekday = (month.getDay() + 6) % 7;
  const monthLength = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <YouFitLogo />
        <span className="admin-eyebrow">Sua cozinha, organizada.</span>
        <nav aria-label="Administração">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => {
                setTab(t.id);
                setError("");
                setMessage("");
              }}
            >
              <t.icon size={18} />
              {t.label}
              {t.id === "orders" && (
                <b>
                  {orders.filter((o) => o.status === "awaiting_pix").length}
                </b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" target="_blank">
            Ver minha loja <ExternalLink size={14} />
          </Link>
          <button onClick={() => db.auth.signOut()}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <span>
            <span className="online-dot" /> Painel YouFit
          </span>
          <Button variant="ghost" onClick={refresh} disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={14} /> : null}Atualizar
          </Button>
        </header>
        <div className="admin-content">
          <div className="admin-page-title">
            <div>
              <p className="eyebrow">Um bom dia começa com organização</p>
              <h1>{tabs.find((t) => t.id === tab)?.label}</h1>
              <p>
                {tab === "orders"
                  ? "Acompanhe cada pedido, do Pix até a entrega."
                  : tab === "calendar"
                    ? "Você escolhe os dias. Seus clientes escolhem entre eles."
                    : tab === "products"
                      ? "Ingredientes frescos e um cardápio com a sua cara."
                      : tab === "combos"
                        ? "Mais praticidade para seus clientes. Mais pedidos para você."
                        : "Os detalhes que fazem tudo funcionar."}
              </p>
            </div>
            {["products", "combos"].includes(tab) && (
              <Button
                onClick={() =>
                  setEditing({
                    table: tab,
                    row:
                      tab === "products"
                        ? {
                            name: "",
                            slug: "",
                            description: "",
                            category: "salad",
                            price_cents: 0,
                            active: true,
                            available: true,
                            sort_order: 0,
                            ingredients: [],
                          }
                        : {
                            name: "",
                            slug: "",
                            description: "",
                            minimum_delivery_count: 3,
                            discount_type: "percentage",
                            discount_value: 5,
                            active: true,
                            sort_order: 0,
                          },
                  })
                }
              >
                <Plus size={16} />
                Adicionar {tab === "products" ? "item" : "combo"}
              </Button>
            )}
          </div>
          {error && (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="notice" role="status">
              <Check size={15} /> {message}
            </p>
          )}
          {tab === "orders" && (
            <>
              <div className="stats-grid">
                {[
                  {
                    label: "Aguardando Pix",
                    value: orders.filter((o) => o.status === "awaiting_pix")
                      .length,
                  },
                  {
                    label: "Confirmados",
                    value: orders.filter((o) =>
                      ["paid", "preparing"].includes(o.status),
                    ).length,
                  },
                  {
                    label: "Em entrega",
                    value: orders.filter((o) => o.status === "out_for_delivery")
                      .length,
                  },
                  {
                    label: "Recebido",
                    value: formatBRL(
                      orders
                        .filter(
                          (o) =>
                            !["cancelled", "awaiting_pix"].includes(o.status),
                        )
                        .reduce((s, o) => s + o.total_cents, 0),
                    ),
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <span>{s.label}</span>
                    <strong>{s.value}</strong>
                  </div>
                ))}
              </div>
              <div className="admin-card">
                <div className="admin-filters">
                  <input
                    aria-label="Buscar pedidos"
                    placeholder="Buscar nome, telefone ou pedido…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select
                    aria-label="Filtrar status"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="">Todos os status</option>
                    {Object.entries(statuses).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    aria-label="Filtrar dia de entrega"
                    value={dayFilter}
                    onChange={(e) => setDayFilter(e.target.value)}
                  />
                </div>
                {dayFilter && (
                  <div className="production-list">
                    <h3>Para produzir em {new Date(dayFilter + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</h3>
                    {productionLines(visibleOrders, dayFilter).map((l) => (
                      <p key={l.name + l.notes}>
                        <b>{l.quantity}×</b> {l.name}
                        {l.notes && <small>{l.notes}</small>}
                      </p>
                    ))}
                    {!productionLines(visibleOrders, dayFilter).length && <p>Nada para produzir nesse dia.</p>}
                  </div>
                )}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Pedido / cliente</th>
                        <th>Entregas</th>
                        <th>Status</th>
                        <th>Total</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleOrders.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <strong>{o.customer_name}</strong>
                            <small>
                              #{o.order_number} ·{" "}
                              {new Date(o.created_at).toLocaleDateString(
                                "pt-BR",
                              )}
                            </small>
                          </td>
                          <td>
                            {o.order_deliveries
                              ?.map((d: Row) => new Date(d.delivery_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }))
                              .join(", ") || "—"}
                          </td>
                          <td>
                            <span className={`status-badge status-${o.status}`}>
                              {statuses[o.status]}
                            </span>
                          </td>
                          <td>
                            <strong>{formatBRL(o.total_cents)}</strong>
                          </td>
                          <td>
                            <button
                              className="table-action"
                              onClick={() => setDetail(o)}
                            >
                              Ver pedido <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!visibleOrders.length && (
                  <div className="admin-empty">
                    <ClipboardList size={32} />
                    <h3>Nenhum pedido por aqui ainda</h3>
                    <p>Quando um cliente finalizar, o pedido aparece aqui.</p>
                  </div>
                )}
              </div>
            </>
          )}
          {tab === "calendar" && (
            <div className="admin-card calendar-panel">
              <div className="calendar-toolbar">
                <h2>
                  {month.toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <div>
                  <button
                    aria-label="Mês anterior"
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() - 1, 1),
                      )
                    }
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    aria-label="Próximo mês"
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() + 1, 1),
                      )
                    }
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="calendar-grid">
                {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((d) => (
                  <span className="calendar-weekday" key={d}>
                    {d}
                  </span>
                ))}
                {Array.from({ length: firstWeekday }, (_, i) => (
                  <div key={"empty" + i} />
                ))}
                {Array.from({ length: monthLength }, (_, i) => {
                  const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                  const d = days.find((d) => d.delivery_date === date);
                  return (
                    <button
                      className={`calendar-day ${d?.enabled ? "open" : ""}`}
                      key={date}
                      onClick={() =>
                        setEditing({
                          table: "delivery_days",
                          row: d || {
                            delivery_date: date,
                            enabled: true,
                            capacity: 24,
                            delivery_window_start: "11:30",
                            delivery_window_end: "13:30",
                            fee_override_cents: null,
                            reserved_quantity: 0,
                          },
                        })
                      }
                    >
                      <strong>{i + 1}</strong>
                      {d?.enabled ? (
                        <>
                          <span>Entregas abertas</span>
                          <small>
                            {d.reserved_quantity}/{d.capacity} reservados
                          </small>
                        </>
                      ) : (
                        <span>Fechado</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="muted">
                Clique em um dia para abrir entregas, ajustar vagas, horário e
                taxa. A loja mostra os dias disponíveis da próxima semana.
              </p>
            </div>
          )}
          {["products", "combos"].includes(tab) && (
            <div className="admin-catalog-grid">
              {(tab === "products" ? products : combos).map((p) => (
                <div className="admin-card catalog-admin-card" key={p.id}>
                  <div className="catalog-admin-icon">
                    {tab === "products" ? <Salad /> : <Sparkles />}
                    <span
                      className={`status-badge ${p.active ? "status-paid" : "status-cancelled"}`}
                    >
                      {p.active ? "Ativo" : "Pausado"}
                    </span>
                  </div>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <strong>
                    {tab === "products"
                      ? formatBRL(p.price_cents)
                      : `${p.minimum_delivery_count} dias · ${p.discount_type === "percentage" ? p.discount_value + "%" : formatBRL(p.discount_value)} de desconto`}
                  </strong>
                  <div>
                    <Button
                      variant="ghost"
                      onClick={() => setEditing({ table: tab, row: p })}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => save(tab, { id: p.id, active: !p.active })}
                    >
                      {p.active ? "Pausar" : "Ativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => remove(tab, p)}
                    >
                      <Trash2 size={16} /> Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "settings" && settings && (
            <SettingsForm
              settings={settings}
              busy={busy}
              onSave={(row) => save("business_settings", row)}
            />
          )}
        </div>
      </main>
      {editing && (
        <Editor
          editing={editing}
          products={products}
          busy={busy}
          onClose={() => setEditing(undefined)}
          onSave={save}
          db={db}
          setError={setError}
        />
      )}
      {detail && (
        <div className="modal-backdrop">
          <section
            className="admin-modal order-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Detalhes do pedido"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">#{detail.order_number}</p>
                <h2>{detail.customer_name}</h2>
              </div>
              <button aria-label="Fechar" onClick={() => setDetail(undefined)}>
                <X />
              </button>
            </div>
            <p>{detail.customer_phone}</p>
            <p>
              {detail.address_street}, {detail.address_number} —{" "}
              {detail.address_neighborhood}
              <br />
              {detail.address_complement} {detail.address_reference}
            </p>
            {detail.customer_notes && (
              <p className="notice">{detail.customer_notes}</p>
            )}
            {detail.order_deliveries?.map((d: Row) => (
              <div className="order-delivery" key={d.id}>
                <h3>
                  {new Date(d.delivery_date + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                    { weekday: "long", day: "numeric", month: "long" },
                  )}
                </h3>
                {d.order_items.map((i: Row) => (
                  <p key={i.id}>
                    <span>
                      {i.quantity}× {i.product_name}
                      {i.customer_notes ? ` · ${i.customer_notes}` : ""}
                    </span>
                    <strong>{formatBRL(i.line_total_cents)}</strong>
                  </p>
                ))}
              </div>
            ))}
            <div className="order-detail-total">
              <span>Total</span>
              <strong>{formatBRL(detail.total_cents)}</strong>
            </div>
            <Field htmlFor="order-status" label="Status do pedido">
              <select
                id="order-status"
                value={detail.status}
                disabled={busy}
                onChange={(e) => void updateStatus(detail, e.target.value)}
              >
                {Object.entries(statuses).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <a
              className="button button--primary"
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${detail.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(detail.payment_summary_snapshot)}`}
            >
              Enviar resumo e Pix no WhatsApp
            </a>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    detail.payment_summary_snapshot,
                  );
                  setMessage("Resumo copiado.");
                } catch {
                  setError("Não foi possível copiar.");
                }
              }}
            >
              Copiar resumo
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}

function SettingsForm({
  settings,
  busy,
  onSave,
}: {
  settings: Row;
  busy: boolean;
  onSave: (row: Row) => void;
}) {
  const [row, setRow] = useState(settings);
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      onSave({
        ...row,
        whatsapp_phone: "+" + normalizeBrazilianPhone(row.whatsapp_phone),
      });
    } catch {
      alert("Informe um WhatsApp brasileiro válido.");
    }
  }
  return (
    <form className="admin-card settings-form" onSubmit={submit}>
      <h2>Informações do negócio</h2>
      <div className="form-grid">
        {[
          { key: "business_name", label: "Nome do negócio" },
          { key: "whatsapp_phone", label: "WhatsApp da loja" },
          { key: "pix_key", label: "Chave Pix" },
          { key: "pix_recipient", label: "Nome do favorecido" },
        ].map((f) => (
          <Field key={f.key} htmlFor={f.key} label={f.label}>
            <input
              id={f.key}
              required
              value={row[f.key]}
              onChange={(e) => setRow({ ...row, [f.key]: e.target.value })}
            />
          </Field>
        ))}
        <Field htmlFor="pix_key_type" label="Tipo de chave Pix">
          <select
            id="pix_key_type"
            value={row.pix_key_type}
            onChange={(e) => setRow({ ...row, pix_key_type: e.target.value })}
          >
            {[
              ["cpf", "CPF"],
              ["cnpj", "CNPJ"],
              ["email", "E-mail"],
              ["phone", "Telefone"],
              ["random", "Aleatória"],
            ].map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor="fee" label="Taxa padrão de entrega (R$)">
          <input
            id="fee"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={row.default_delivery_fee_cents / 100}
            onChange={(e) =>
              setRow({
                ...row,
                default_delivery_fee_cents: Math.round(
                  Number(e.target.value) * 100,
                ),
              })
            }
          />
        </Field>
        <Field htmlFor="cutoff" label="Antecedência mínima (horas)">
          <input
            id="cutoff"
            type="number"
            min="1"
            max="168"
            required
            value={row.default_cutoff_hours}
            onChange={(e) =>
              setRow({ ...row, default_cutoff_hours: Number(e.target.value) })
            }
          />
        </Field>
        <Field htmlFor="delivery_notice" label="Aviso de entregas">
          <textarea
            id="delivery_notice"
            maxLength={500}
            value={row.delivery_notice}
            onChange={(e) =>
              setRow({ ...row, delivery_notice: e.target.value })
            }
          />
        </Field>
        <Field htmlFor="payment_instructions" label="Instruções do Pix">
          <textarea
            id="payment_instructions"
            maxLength={1000}
            value={row.payment_instructions}
            onChange={(e) =>
              setRow({ ...row, payment_instructions: e.target.value })
            }
          />
        </Field>
      </div>
      <Button type="submit" disabled={busy}>
        Salvar configurações
      </Button>
    </form>
  );
}

function Editor({
  editing,
  products,
  busy,
  onClose,
  onSave,
  db,
  setError,
}: {
  editing: { table: string; row: Row };
  products: Row[];
  busy: boolean;
  onClose: () => void;
  onSave: (table: string, row: Row) => Promise<void>;
  db: ReturnType<typeof getSupabase>;
  setError: (value: string) => void;
}) {
  const [row, setRow] = useState<Row>(() => {
    const { combo_products, ...rest } = editing.row;
    return rest;
  });
  const [eligible, setEligible] = useState<string[]>(
    editing.row.combo_products?.map((p: Row) => p.product_id) ||
      products.filter((p) => p.category === "salad").map((p) => p.id),
  );
  const [saving, setSaving] = useState(false);
  const set = (key: string, value: unknown) =>
    setRow((r) => ({ ...r, [key]: value }));
  const isDay = editing.table === "delivery_days",
    isProduct = editing.table === "products";
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing.table === "combos") {
        const id = row.id || crypto.randomUUID();
        const { error } = await db.rpc("admin_save_combo", {
          combo_data: { ...row, id },
          product_ids: eligible,
        });
        if (error) throw error;
        await onSave("combos", { id, active: row.active });
      } else await onSave(editing.table, row);
    } catch {
      setError("Não foi possível salvar o combo. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <form
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Editar item"
        onSubmit={submit}
      >
        <div className="modal-heading">
          <h2>
            {isDay
              ? "Dia de entrega"
              : isProduct
                ? "Item do cardápio"
                : "Combo da semana"}
          </h2>
          <button type="button" aria-label="Fechar" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="editor-fields">
          {isDay ? (
            <>
              <Field htmlFor="date" label="Data">
                <input
                  id="date"
                  type="date"
                  required
                  value={row.delivery_date}
                  onChange={(e) => set("delivery_date", e.target.value)}
                />
              </Field>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => set("enabled", e.target.checked)}
                />{" "}
                Disponível para pedidos
              </label>
              <Field
                htmlFor="capacity"
                label={`Vagas (${row.reserved_quantity || 0} já reservadas)`}
              >
                <input
                  id="capacity"
                  type="number"
                  min={Math.max(1, row.reserved_quantity || 0)}
                  required
                  value={row.capacity}
                  onChange={(e) => set("capacity", Number(e.target.value))}
                />
              </Field>
              <div className="form-grid">
                {[
                  ["delivery_window_start", "Das"],
                  ["delivery_window_end", "Até"],
                ].map(([k, l]) => (
                  <Field key={k} htmlFor={k} label={l}>
                    <input
                      id={k}
                      type="time"
                      required
                      value={row[k]}
                      onChange={(e) => set(k, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
              <Field
                htmlFor="fee-day"
                label="Taxa desse dia (R$) — vazio usa padrão"
                optional
              >
                <input
                  id="fee-day"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    row.fee_override_cents === null
                      ? ""
                      : row.fee_override_cents / 100
                  }
                  onChange={(e) =>
                    set(
                      "fee_override_cents",
                      e.target.value === ""
                        ? null
                        : Math.round(Number(e.target.value) * 100),
                    )
                  }
                />
              </Field>
            </>
          ) : (
            <>
              <Field htmlFor="item-name" label="Nome">
                <input
                  id="item-name"
                  required
                  minLength={2}
                  maxLength={120}
                  value={row.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRow((r) => ({
                      ...r,
                      name: value,
                      ...(!editing.row.id
                        ? {
                            slug: value
                              .toLowerCase()
                              .normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-|-$/g, ""),
                          }
                        : {}),
                    }));
                  }}
                />
              </Field>
              <Field htmlFor="description" label="Descrição">
                <textarea
                  id="description"
                  maxLength={1000}
                  value={row.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              {isProduct ? (
                <>
                  <Field htmlFor="category" label="Categoria">
                    <select
                      id="category"
                      value={row.category}
                      onChange={(e) => set("category", e.target.value)}
                    >
                      {[
                        ["salad", "Salada"],
                        ["protein", "Proteína"],
                        ["extra", "Extra"],
                        ["dressing", "Molho"],
                        ["drink", "Bebida"],
                      ].map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field htmlFor="price" label="Preço (R$)">
                    <input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      defaultValue={row.price_cents / 100}
                      onChange={(e) =>
                        set(
                          "price_cents",
                          Math.round(Number(e.target.value) * 100),
                        )
                      }
                    />
                  </Field>
                  <Field
                    htmlFor="ingredients"
                    label="Ingredientes (separados por vírgula)"
                  >
                    <input
                      id="ingredients"
                      value={(row.ingredients || []).join(", ")}
                      onChange={(e) =>
                        set(
                          "ingredients",
                          e.target.value.split(",").map((s) => s.trim()),
                        )
                      }
                    />
                  </Field>
                  <Field htmlFor="image" label="URL da imagem" optional>
                    <input
                      id="image"
                      type="url"
                      value={row.image_path || ""}
                      onChange={(e) =>
                        set("image_path", e.target.value || null)
                      }
                    />
                  </Field>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={row.available}
                      onChange={(e) => set("available", e.target.checked)}
                    />{" "}
                    Disponível hoje
                  </label>
                </>
              ) : (
                <>
                  <Field htmlFor="min-days" label="Quantidade mínima de dias">
                    <input
                      id="min-days"
                      type="number"
                      min="2"
                      max="7"
                      required
                      value={row.minimum_delivery_count}
                      onChange={(e) =>
                        set("minimum_delivery_count", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field htmlFor="discount-type" label="Tipo de desconto">
                    <select
                      id="discount-type"
                      value={row.discount_type}
                      onChange={(e) => set("discount_type", e.target.value)}
                    >
                      <option value="percentage">Percentual (%)</option>
                      <option value="fixed">Valor em centavos</option>
                    </select>
                  </Field>
                  <Field
                    htmlFor="discount"
                    label={
                      row.discount_type === "percentage"
                        ? "Desconto (%)"
                        : "Desconto (centavos)"
                    }
                  >
                    <input
                      id="discount"
                      type="number"
                      min="1"
                      max={row.discount_type === "percentage" ? 100 : 100000}
                      required
                      value={row.discount_value}
                      onChange={(e) =>
                        set("discount_value", Number(e.target.value))
                      }
                    />
                  </Field>
                  <fieldset>
                    <legend>Saladas incluídas</legend>
                    {products
                      .filter((p) => p.category === "salad")
                      .map((p) => (
                        <label className="check-label" key={p.id}>
                          <input
                            type="checkbox"
                            checked={eligible.includes(p.id)}
                            onChange={(e) =>
                              setEligible(
                                e.target.checked
                                  ? [...eligible, p.id]
                                  : eligible.filter((id) => id !== p.id),
                              )
                            }
                          />
                          {p.name}
                        </label>
                      ))}
                  </fieldset>
                </>
              )}
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={row.active}
                  onChange={(e) => set("active", e.target.checked)}
                />{" "}
                Visível no cardápio
              </label>
            </>
          )}
        </div>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy || saving}>
            {busy || saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
