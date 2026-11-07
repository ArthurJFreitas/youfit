import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field } from "./Field";

describe("Field", () => {
  it("connects its label and error to the controlled input", () => {
    render(
      <Field error="Informe seu nome" htmlFor="customer-name" label="Seu nome">
        <input id="customer-name" name="customerName" />
      </Field>,
    );

    const input = screen.getByRole("textbox", { name: "Seu nome" });
    expect(input).toHaveAttribute("aria-describedby", "customer-name-error");
    expect(screen.getByText("Informe seu nome")).toHaveAttribute(
      "id",
      "customer-name-error",
    );
  });

  it("renders an optional hint without marking the input invalid", () => {
    render(
      <Field hint="Usaremos para confirmar o Pix" htmlFor="phone" label="WhatsApp">
        <input id="phone" name="phone" />
      </Field>,
    );

    expect(screen.getByRole("textbox", { name: "WhatsApp" })).toHaveAttribute(
      "aria-describedby",
      "phone-hint",
    );
    expect(screen.getByText("Usaremos para confirmar o Pix")).toBeVisible();
  });
});
