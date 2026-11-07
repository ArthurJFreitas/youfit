import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  }),
}));
import { AdminApp } from "./AdminApp";
describe("admin access", () => {
  it("requires an email and password before exposing order data", async () => {
    render(<AdminApp />);
    expect(await screen.findByLabelText("E-mail")).toBeVisible();
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    expect(
      screen.queryByRole("heading", { name: "Pedidos" }),
    ).not.toBeInTheDocument();
  });
});
