import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// jsdom has no layout; the storefront scrolls to the day picker after picking a combo.
Element.prototype.scrollIntoView = () => {};
afterEach(() => localStorage.clear());
