import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createDemoStorefrontData } from "@/lib/demo/data";
import { Storefront } from "./Storefront";

describe("customer ordering", () => {
  it("keeps checkout blocked until a date and meal are selected", async () => {
    const user = userEvent.setup();
    const data = createDemoStorefrontData(new Date("2026-11-07T12:00:00Z"));
    render(<Storefront initialData={data} submitOrder={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /continuar pedido/i }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /segunda.*09/i }));
    await user.click(
      screen.getByRole("button", { name: /adicionar frango mediterrâneo/i }),
    );
    expect(
      screen.getByRole("button", { name: /continuar pedido/i }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /continuar pedido/i }));
    expect(screen.getByLabelText("Seu nome")).toBeVisible();
    expect(screen.getByLabelText("WhatsApp")).toBeVisible();
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
    await user.click(
      screen.getByRole("button", { name: /adicionar frango mediterrâneo/i }),
    );
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
    await user.click(screen.getAllByRole("button", { name: /frango mediterrâneo/i })[0]);
    await user.click(screen.getByRole("button", { name: /repetir em todos os dias/i }));
    expect(screen.queryByRole("button", { name: /próximo dia/i })).toBeNull();
    expect(document.querySelectorAll(".day-tabs button svg").length).toBe(5);
  });
});
