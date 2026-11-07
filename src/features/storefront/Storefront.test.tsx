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
