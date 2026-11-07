import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { YouFitLogo } from "./YouFitLogo";

describe("YouFitLogo", () => {
  it("exposes the brand name and full wordmark to assistive technology", () => {
    const { container } = render(<YouFitLogo />);

    expect(screen.getByRole("img", { name: "YouFit" })).toBeInTheDocument();
    expect(container).toHaveTextContent("YouFit");
  });

  it("keeps the accessible name but hides the wordmark in compact mode", () => {
    const { container } = render(<YouFitLogo compact />);

    expect(screen.getByRole("img", { name: "YouFit" })).toBeInTheDocument();
    expect(container).not.toHaveTextContent("YouFit");
  });
});
