import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createDemoStorefrontData } from "@/lib/demo/data";
import { Storefront } from "./Storefront";

async function addSaladFit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /adicionar salada fit$/i }));
  const dialog = screen.getByRole("dialog");
  for (const name of ["Frango Grelhado", "Tomate Cereja", "Molho de Ervas Fit"])
    await user.click(within(dialog).getByRole("button", { name }));
  await user.click(within(dialog).getByRole("button", { name: /adicionar · r\$ 24,90/i }));
}

describe("customer ordering", () => {
  it("keeps checkout blocked until a date and meal are selected", async () => {
    const user = userEvent.setup();
    const data = createDemoStorefrontData(new Date("2026-11-07T12:00:00Z"));
    render(<Storefront initialData={data} submitOrder={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /continuar pedido/i }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /segunda.*09/i }));
    await addSaladFit(user);
    expect(
      screen.getByRole("button", { name: /continuar pedido/i }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /continuar pedido/i }));
    expect(screen.getByLabelText("Seu nome")).toBeVisible();
    expect(screen.getByLabelText("WhatsApp")).toBeVisible();
  });
});

describe("delivery days", () => {
  it("deselects a chosen day when it is clicked again", async () => {
    const user = userEvent.setup();
    const data = createDemoStorefrontData(new Date("2026-11-07T12:00:00Z"));
    render(<Storefront initialData={data} submitOrder={vi.fn()} />);
    // the day chip comes before the day stepper in the DOM
    const monday = () =>
      screen.getAllByRole("button", { name: /segunda.*09/i })[0];
    await user.click(monday());
    expect(monday()).toHaveAttribute("aria-pressed", "true");
    await user.click(monday());
    expect(monday()).toHaveAttribute("aria-pressed", "false");
  });
});

describe("weekly combos", () => {
  it("pre-selects the combo days and walks them in order with Próximo dia", async () => {
    const user = userEvent.setup();
    const data = createDemoStorefrontData(new Date("2026-11-07T12:00:00Z"));
    render(<Storefront initialData={data} submitOrder={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /semana youfit/i }));
    const chosen = screen
      .getAllByRole("button", { pressed: true })
      .filter((b) => b.classList.contains("day-button"));
    expect(chosen).toHaveLength(5);
    expect(screen.getByText(/montando a entrega de segunda/i)).toBeVisible();
    await addSaladFit(user);
    await user.click(screen.getByRole("button", { name: /próximo dia/i }));
    expect(screen.getByText(/montando a entrega de terça/i)).toBeVisible();
  });
});

describe("repeat salad across days", () => {
  it("copies the selected day's items to every empty day", async () => {
    const user = userEvent.setup();
    const data = createDemoStorefrontData(new Date("2026-11-07T12:00:00Z"));
    render(<Storefront initialData={data} submitOrder={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /semana youfit/i }));
    await addSaladFit(user);
    await user.click(screen.getByRole("button", { name: /repetir em todos os dias/i }));
    expect(screen.queryByRole("button", { name: /próximo dia/i })).toBeNull();
    expect(document.querySelectorAll(".day-tabs button svg").length).toBe(5);
  });
});

describe("combos vs open days", () => {
  it("hides a combo that needs more delivery days than are open", () => {
    const data = createDemoStorefrontData(new Date("2026-11-07T12:00:00Z"));
    const threeDays = { ...data, deliveryDays: data.deliveryDays.slice(0, 3) };
    render(<Storefront initialData={threeDays} submitOrder={vi.fn()} />);
    expect(screen.getByRole("button", { name: /trio da semana/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: /semana youfit/i })).toBeNull();
  });
});

describe("salad builder popup", () => {
  it("requires protein, sides and dressing, and adds paid extras as cart lines", async () => {
    const user = userEvent.setup();
    const data = createDemoStorefrontData(new Date("2026-11-07T12:00:00Z"));
    render(<Storefront initialData={data} submitOrder={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /segunda.*09/i }));
    await user.click(screen.getByRole("button", { name: /adicionar salada fit$/i }));
    const dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: /^adicionar · /i });
    expect(confirm).toBeDisabled();
    for (const name of ["Frango Grelhado", "Tomate Cereja", "Molho de Ervas Fit"])
      await user.click(within(dialog).getByRole("button", { name }));
    expect(confirm).toBeEnabled();
    await user.click(within(dialog).getByRole("button", { name: /adicionar queijo mussarela/i }));
    expect(within(dialog).getByRole("button", { name: /adicionar · r\$ 27,90/i })).toBeEnabled();
    await user.click(within(dialog).getByRole("button", { name: /adicionar · r\$ 27,90/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/proteína: frango grelhado/i)).toBeVisible();
    const lines = document.querySelectorAll(".cart-line span");
    expect([...lines].some((l) => /1×\s*queijo mussarela/i.test(l.textContent ?? ""))).toBe(true);
  });
});
