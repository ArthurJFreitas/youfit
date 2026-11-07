# YouFit Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a polished mobile-first YouFit salad ordering site and a protected operational admin using Next.js and Supabase.

**Architecture:** A statically exportable Next.js App Router application uses Supabase Auth and Postgres as its backend. Public catalog/date reads are protected by RLS, order creation is an atomic security-definer RPC that recalculates every price, and authenticated admin users manage the same data through focused repository interfaces.

**Tech Stack:** Next.js, React, TypeScript, Supabase JS, PostgreSQL/RLS/RPC, Zod, date-fns, Lucide React, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-07-youfit-ordering-design.md`

## Global Constraints

- Use integer centavos for all money and `America/Sao_Paulo` for business dates.
- Configure `output: 'export'`, `trailingSlash: true`, and unoptimized/static images; all live Supabase calls run in Client Components.
- Do not use Server Actions, request-time Route Handlers, middleware, cookies, ISR, or other features unsupported by static export.
- Never expose a Supabase service-role key; only the public publishable key may enter client bundles.
- Recalculate and persist authoritative totals inside PostgreSQL, not from client-provided totals.
- Public visitors may read only active catalog rows and enabled future delivery days.
- New orders start as `awaiting_pix`; WhatsApp opening is a post-order convenience, not the persistence mechanism.
- Weekly combos require at least two selected available delivery dates.
- The order RPC, not the browser clock, enforces future/next-week delivery rules in `America/Sao_Paulo`.
- The app exposes no public signup; admin authorization comes from a protected profile role and RLS, never editable user metadata.
- The UI is mobile-first, keyboard accessible, and readable without relying on color alone.
- Keep `.env.local` untracked and expose only placeholders in `.env.example`.

## Review Focus

- A delivery day becomes full between page load and checkout: reject the stale selection without creating a partial order.
- A browser tampers with product prices or combo discounts: ignore submitted totals and use current database values.
- A customer retries after a network timeout: reuse the idempotency key and return the original order instead of duplicating it.
- WhatsApp is unavailable or blocked: retain the success screen and provide a copyable payment summary.
- An authenticated non-admin user navigates to `/admin`: deny data access and render a safe unauthorized state.

---

## File map

- `src/app/`: route entry points and route-specific composition only.
- `src/features/storefront/`: menu, date selector, cart, checkout, and success experience.
- `src/features/admin/`: protected admin shell and operational modules.
- `src/features/ordering/`: pure cart, pricing-preview, validation, and WhatsApp summary logic.
- `src/lib/supabase/`: browser client, typed database contract, and repository adapters.
- `src/components/ui/`: focused reusable presentation controls.
- `src/styles/`: tokens and global responsive styling.
- `supabase/migrations/`: schema, RLS, RPC, triggers, and seed migration.
- `tests/`: unit, component, database-contract, and browser coverage.

### Task 1: Application foundation and brand shell

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`
- Create: `.gitignore`, `.env.example`, `.env.local`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/components/brand/YouFitLogo.tsx`, `src/components/ui/Button.tsx`
- Create: `src/test/setup.ts`, `src/components/brand/YouFitLogo.test.tsx`

**Interfaces:**
- Produces: `YouFitLogo({ compact?: boolean })`, shared CSS tokens, test/build scripts, and a statically exportable application shell.

- [ ] Write `YouFitLogo.test.tsx` asserting accessible brand naming, SVG rendering, and compact/full variants.
- [ ] Run `npm test -- YouFitLogo.test.tsx` and verify the unimplemented component fails.
- [ ] Scaffold dependencies/configuration, add the untracked supplied Supabase environment values, and implement the layout, logo, button, and placeholder home route.
- [ ] Run `npm test -- YouFitLogo.test.tsx`, `npm run typecheck`, and `npm run build`; expect all to pass and `out/index.html` to exist.
- [ ] Commit the foundation.

### Task 2: Ordering domain and WhatsApp summary

**Files:**
- Create: `src/features/ordering/types.ts`
- Create: `src/features/ordering/money.ts`
- Create: `src/features/ordering/cart.ts`
- Create: `src/features/ordering/validation.ts`
- Create: `src/features/ordering/whatsapp.ts`
- Test: `src/features/ordering/*.test.ts`

**Interfaces:**
- Produces: `formatBRL(cents: number): string`, `previewOrder(input: OrderDraft, catalog: CatalogSnapshot): OrderPreview`, `validateOrderDraft(input: unknown): OrderDraft`, `buildWhatsAppSummary(order: OrderReceipt, settings: BusinessSettings): string`, and `buildWhatsAppUrl(phone: string, summary: string): string`.

- [ ] Write failing tests for integer-cent pricing, date-specific fees, combo minimum dates, inactive products, Brazilian phone normalization, review-focus price tampering, and copyable WhatsApp output.
- [ ] Run the focused Vitest files and verify failures identify the missing exports.
- [ ] Implement the smallest pure domain functions and Zod schemas that satisfy those cases.
- [ ] Run focused tests and the full unit suite; expect all to pass.
- [ ] Commit the ordering domain.

### Task 3: Supabase schema, RLS, atomic order RPC, and seed data

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202611070001_initial_schema.sql`
- Create: `supabase/migrations/202611070002_create_order_rpc.sql`
- Create: `supabase/migrations/202611070003_seed_catalog.sql`
- Create: `supabase/tests/ordering_contract.sql`
- Create: `src/lib/supabase/database.types.ts`
- Create: `scripts/verify-sql-contract.mjs`

**Interfaces:**
- Produces: public views for active catalog/delivery days; admin CRUD policies; `create_order(payload jsonb, idempotency_key uuid) returns jsonb`; seeded salads, extras, combos, settings, and next-week delivery-day examples.

- [ ] Write SQL contract assertions for price authority, disabled/full dates, idempotency, combo minimums, public read restrictions, and non-admin denial.
- [ ] Run the local SQL contract when Supabase CLI/Docker is available; otherwise run `npm run verify:sql` and record that remote execution remains pending.
- [ ] Implement normalized tables, constraints, indexes, timestamps, admin helper, RLS policies, capacity locking, per-phone submission throttling, and transactional RPC with an empty `search_path` and schema-qualified objects.
- [ ] Add deterministic seed rows for the agreed common salad catalog and weekly combos.
- [ ] Regenerate or hand-maintain matching TypeScript database types, then rerun SQL/static contract checks.
- [ ] Commit the database contract.

### Task 4: Supabase repositories and resilient cart persistence

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/config.ts`
- Create: `src/lib/supabase/catalog-repository.ts`
- Create: `src/lib/supabase/order-repository.ts`
- Create: `src/lib/supabase/admin-repository.ts`
- Create: `src/features/storefront/usePersistedOrder.ts`
- Test: `src/lib/supabase/*.test.ts`, `src/features/storefront/usePersistedOrder.test.tsx`

**Interfaces:**
- Produces: `getStorefrontData(): Promise<StorefrontData>`, `createOrder(draft: OrderDraft, idempotencyKey: string): Promise<OrderReceipt>`, typed admin repository methods, and `usePersistedOrder()` with versioned local storage.

- [ ] Write failing adapter tests with a fake Supabase client for mapped catalog data, RPC errors, duplicate-id receipts, missing environment configuration, and non-admin errors.
- [ ] Write failing persistence tests proving a refresh retains valid draft fields and corrupt/old payloads are discarded safely.
- [ ] Implement the typed singleton client, repository mapping/error normalization, and persisted order hook.
- [ ] Run the focused tests, full unit suite, and typecheck; expect all to pass.
- [ ] Commit the data adapters.

### Task 5: Mobile-first storefront and cart

**Files:**
- Modify: `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/features/storefront/Storefront.tsx`
- Create: `src/features/storefront/DeliveryDayPicker.tsx`
- Create: `src/features/storefront/ProductCard.tsx`
- Create: `src/features/storefront/MenuSection.tsx`
- Create: `src/features/storefront/CartPanel.tsx`
- Create: `src/features/storefront/StorefrontSkeleton.tsx`
- Test: `src/features/storefront/*.test.tsx`
- Create: `public/images/youfit-salad-hero.webp`

**Interfaces:**
- Consumes: `getStorefrontData`, `usePersistedOrder`, ordering-domain preview functions, `YouFitLogo`.
- Produces: `Storefront()` with selected delivery days, per-day items, responsive cart, loading/empty/error states, and an accessible checkout handoff.

- [ ] Write component tests for enabled-only dates, multiple selections, per-day assignment, combo minimum feedback, quantity changes, full-day refresh, and keyboard-visible cart controls.
- [ ] Generate and save the project-bound hero salad asset with no text/logos/watermarks.
- [ ] Implement the storefront composition and responsive styling with real seeded copy and ingredient content.
- [ ] Run component tests, accessibility assertions, and typecheck; expect all to pass.
- [ ] Commit the storefront.

### Task 6: Checkout, atomic submission, and Pix/WhatsApp success

**Files:**
- Create: `src/features/storefront/CheckoutForm.tsx`
- Create: `src/features/storefront/OrderReview.tsx`
- Create: `src/features/storefront/OrderSuccess.tsx`
- Create: `src/components/ui/CopyButton.tsx`
- Test: `src/features/storefront/CheckoutForm.test.tsx`, `src/features/storefront/OrderSuccess.test.tsx`

**Interfaces:**
- Consumes: `validateOrderDraft`, `createOrder`, `buildWhatsAppSummary`, and `buildWhatsAppUrl`.
- Produces: validated customer/address collection, single-flight submit with persistent idempotency key, order receipt view, WhatsApp launch, and clipboard fallback.

- [ ] Write failing tests for required delivery fields, normalized phone, duplicate-click suppression, stale date/server rejection, retained form after network failure, successful order receipt, and blocked WhatsApp fallback.
- [ ] Implement checkout, final review, request state machine, error mapping, success view, and copy button.
- [ ] Run the focused component tests and full unit suite; expect all to pass.
- [ ] Commit the checkout flow.

### Task 7: Protected admin shell and order operations

**Files:**
- Create: `src/app/admin/page.tsx`, `src/app/admin/login/page.tsx`
- Create: `src/features/admin/AdminApp.tsx`, `AdminLogin.tsx`, `AdminShell.tsx`
- Create: `src/features/admin/OverviewPanel.tsx`, `OrdersPanel.tsx`, `OrderDetail.tsx`
- Test: `src/features/admin/auth.test.tsx`, `src/features/admin/orders.test.tsx`

**Interfaces:**
- Consumes: Supabase auth session and admin repository order methods.
- Produces: protected admin routing, overview metrics, filterable order list, order detail, status transitions, payment marking, and copyable contact/payment summary.

- [ ] Write failing tests for unauthenticated login, authenticated non-admin denial, admin overview, filters, allowed status transitions, and mutation error feedback.
- [ ] Implement the auth/session gate, admin navigation, overview, orders table/cards, detail drawer, and status actions.
- [ ] Run admin tests, unit suite, and typecheck; expect all to pass.
- [ ] Commit admin order operations.

### Task 8: Admin calendar, catalog, combos, and settings

**Files:**
- Create: `src/features/admin/CalendarPanel.tsx`
- Create: `src/features/admin/ProductsPanel.tsx`
- Create: `src/features/admin/CombosPanel.tsx`
- Create: `src/features/admin/SettingsPanel.tsx`
- Create: `src/components/ui/Dialog.tsx`, `Field.tsx`, `Toast.tsx`
- Test: `src/features/admin/calendar.test.tsx`, `catalog.test.tsx`, `settings.test.tsx`

**Interfaces:**
- Consumes: typed admin repository CRUD methods.
- Produces: date enable/close/capacity/fee controls; product and combo CRUD; WhatsApp, Pix, fee, cutoff, and storefront-message settings.

- [ ] Write failing tests for enabling a date, blocking capacity below reservations, deactivating products without deleting history, combo validation, cent-safe prices, and settings normalization.
- [ ] Implement calendar and CRUD forms with optimistic affordances but authoritative refresh after mutation.
- [ ] Run focused admin tests, the full suite, and typecheck; expect all to pass.
- [ ] Commit the remaining admin tools.

### Task 9: End-to-end validation, setup documentation, and release build

**Files:**
- Create: `tests/e2e/customer-order.spec.ts`, `tests/e2e/admin-operations.spec.ts`
- Create: `README.md`, `docs/supabase-setup.md`
- Modify: any files needed for verified defects only.

**Interfaces:**
- Consumes: the complete public and admin application.
- Produces: reproducible setup, migration/admin bootstrap instructions, browser evidence, and a deployable `out/` build.

- [ ] Write browser tests for multi-day customer order, WhatsApp fallback, admin login/order status, calendar closure reflected in storefront, and mobile viewport overflow.
- [ ] Run tests against a local Supabase stack or the connected project if migrations can be safely applied; document any external credential blocker precisely.
- [ ] Run `npm test`, `npm run typecheck`, `npm run build`, and Playwright flows; fix only observed defects and rerun affected checks.
- [ ] Inspect the responsive UI in a real browser at mobile and desktop sizes, including checkout and each admin panel.
- [ ] Document Supabase migration, first-admin creation, environment variables, local commands, and deployment.
- [ ] Commit the verified MVP and record exact passing evidence.
