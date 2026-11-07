# YouFit Ordering — Product and Technical Design

**Date:** 2026-11-07
**Status:** Approved for implementation
**Stack:** Next.js, TypeScript, Supabase

## 1. Goal

Build a professional, mobile-first ordering site for YouFit salads. A customer must be able to choose salads or weekly combos, select only delivery dates enabled by the business, enter delivery details, place an order, and continue to WhatsApp with a Pix-ready summary.

The owner must be able to operate the business from a small protected admin area: manage orders, delivery dates, menu items, combos, Pix/WhatsApp settings, and order statuses.

## 2. Product principles

- One fast ordering flow instead of a multi-page marketplace.
- Mobile usability first; desktop remains polished and efficient.
- The database, not the browser, is authoritative for prices and available dates.
- Payment is manual by Pix. The application tracks payment status but does not process money.
- Business rules that may change are editable in the admin rather than hard-coded.
- The first release favors dependable operations over speculative features.

## 3. User experience

### 3.1 Customer storefront (`/`)

The storefront is a single responsive page with these sections:

1. Header with the YouFit logo and a short delivery message.
2. Compact hero that emphasizes fresh salads and next-week home delivery.
3. Delivery-day selector showing only enabled, future dates with remaining capacity.
4. Menu grouped into salads, extras, proteins, and weekly combos.
5. Product cards with image or ingredient illustration, description, price, availability, and quantity control.
6. Sticky cart summary on mobile and a persistent side cart on wide screens.
7. Checkout form for name, WhatsApp phone, street address, number, neighborhood, complement, reference, and notes.
8. Final review with selected dates, items per delivery, fees, and total.
9. Success state with the order number, Pix information, copyable summary, and a button to open WhatsApp.

The visual direction uses deep leafy green, warm cream, and a restrained coral accent. Typography is friendly and editorial rather than gym-neon. The logo is a crisp vector mark combining a bowl and leaf with a YouFit wordmark.

### 3.2 Delivery selection

- The customer may select one or multiple enabled delivery dates.
- Weekly combos require at least two selected dates.
- The customer can assign a menu item to each selected date.
- Disabled, past, full, or administratively closed dates cannot be selected.
- Availability is checked again when the order is committed.

### 3.3 Payment and WhatsApp

New orders start as `awaiting_pix`.

After creation, the success state shows:

- order number;
- customer and delivery details;
- deliveries grouped by date;
- subtotal, delivery fee, discount, and total;
- Pix key and recipient label;
- a concise payment instruction;
- a prefilled WhatsApp link for the configured business number.

Opening WhatsApp is not required for the order to exist. If the app cannot open WhatsApp, the customer can copy the same summary.

### 3.4 Admin (`/admin`)

The admin uses Supabase email/password authentication and contains:

- **Overview:** counts for awaiting payment, paid, preparing, out for delivery, and today's deliveries.
- **Orders:** filterable list, order details, payment marking, status changes, notes, and copyable customer/WhatsApp summary.
- **Calendar:** month/week view for enabling or closing delivery dates and setting capacity, time window, and optional date-specific fee.
- **Items:** create, edit, activate/deactivate, price, category, ingredients, image, sort order, and availability.
- **Combos:** create, edit, activate/deactivate, eligible items, minimum delivery count, and discount.
- **Settings:** business name, WhatsApp number, Pix key/type/recipient, default delivery fee, delivery notice, and order cutoff.

Order statuses are:

1. `awaiting_pix`
2. `paid`
3. `preparing`
4. `out_for_delivery`
5. `delivered`
6. `cancelled`

## 4. Architecture

### 4.1 Application

- Next.js App Router with TypeScript.
- The public ordering experience and admin live in the same application.
- Supabase JS provides authentication and data access.
- Public reads use the anon role and row-level security.
- Order creation uses one PostgreSQL RPC transaction so the server validates current prices, combos, dates, capacity, and totals atomically.
- Admin writes require an authenticated user whose profile role is `admin`.
- The app can be statically exported because business persistence and authentication are provided by Supabase.

### 4.2 Modules

- `storefront`: menu browsing, date selection, cart, checkout, and success state.
- `ordering`: pure pricing, eligibility, date assignment, and summary formatting.
- `supabase`: typed client, generated database types, query adapters, and auth session handling.
- `admin`: protected shell plus order, calendar, catalog, combo, and settings screens.
- `ui`: reusable accessible controls, feedback, layout, logo, and formatting utilities.

Business calculations remain in pure functions for fast deterministic tests. The PostgreSQL RPC repeats authoritative validations before writing.

## 5. Data model

### `profiles`

- `id` references `auth.users`
- `role` (`admin` for the owner)
- timestamps

### `products`

- name, slug, description, category
- ingredients
- price in integer cents
- image path
- active and available flags
- sort order
- timestamps

### `combos`

- name, description
- minimum delivery count
- discount type and value
- active flag
- sort order
- timestamps

### `combo_products`

- combo and product references
- eligibility and optional quantity constraints

### `delivery_days`

- local delivery date
- enabled flag
- capacity and reserved quantity
- delivery time window
- optional fee override in cents
- cutoff timestamp
- admin note

### `orders`

- human-readable order number
- customer name and normalized phone
- structured address fields
- customer notes and admin notes
- status
- subtotal, discount, delivery fee, and total in cents
- immutable Pix/WhatsApp summary snapshot
- timestamps

### `order_deliveries`

- order and delivery-day references
- delivery date
- status
- fee snapshot
- timestamps

### `order_items`

- order-delivery reference
- product reference where available
- product name and unit-price snapshots
- quantity and line total
- combo reference where applicable
- customer notes

### `business_settings`

- singleton business identity
- WhatsApp and Pix configuration
- default delivery fee
- order cutoff defaults
- storefront notices
- timestamps

Money is always stored as integer centavos. Product and price snapshots preserve historical order accuracy after catalog edits.

## 6. Security and integrity

- Only active catalog items and enabled delivery dates are publicly readable.
- Anonymous users cannot update or delete business data.
- Anonymous order creation occurs through a narrowly scoped RPC, not direct table inserts.
- The RPC recalculates totals from database prices and rejects unknown or inactive products.
- The RPC locks selected delivery-day rows while checking and incrementing capacity.
- Admin policies require an authenticated `admin` profile.
- No Supabase service-role key is shipped to the browser.
- Authentication errors do not reveal whether a particular admin account exists.
- Form inputs are length-limited and normalized before persistence.

## 7. Failure handling

- An unavailable item or date produces a clear correction message and refreshes the affected data.
- Submission disables while pending and carries a client idempotency key to prevent duplicate orders.
- Network failures preserve the customer cart and form locally so the user can retry.
- WhatsApp failure never rolls back an already-created order.
- Empty, loading, and error states are designed for both storefront and admin.
- Admin mutations show explicit success or failure feedback and refresh authoritative data.

## 8. Initial content

The seed catalog includes familiar fit-salad ingredients and combinations:

- grilled chicken salad;
- egg and corn salad;
- tuna salad;
- vegetarian garden salad;
- lettuce, arugula, tomato, carrot, cucumber, beetroot, corn, egg, grilled chicken, tuna, chickpeas, and sauces as extras;
- three- and five-delivery weekly combos.

All seeded content is editable or removable from the admin.

## 9. Validation

### Automated

- Unit tests for pricing, discounts, delivery fees, combo eligibility, date assignment, and WhatsApp formatting.
- Database tests for RPC price authority, disabled dates, capacity, duplicate idempotency keys, and admin policies.
- Component tests for cart and checkout validation.
- Browser tests for a complete public order and the core admin workflow.
- Type checking and production build.

### Manual

- Mobile viewport order from menu to WhatsApp.
- Multiple delivery dates with different items.
- Admin closes a day and the storefront stops offering it.
- Admin marks Pix paid and advances the order through delivery.
- Refresh and retry behavior during simulated network failure.

## 10. Deployment and configuration

The repository includes:

- a documented environment template for the Supabase URL and anon key;
- SQL migrations and seed data;
- setup instructions for creating the first admin user;
- build and test commands;
- a static production build suitable for compatible hosting.

The implementation can be fully built and tested with local/demo configuration. Connecting a production Supabase project and real WhatsApp/Pix values remains an environment/setup step because credentials and account ownership must come from the owner.

## 11. Non-goals

- Card or Pix API payment processing.
- Customer accounts or order history login.
- Courier tracking or route optimization.
- Inventory purchasing and kitchen production planning.
- Multiple stores, franchises, or admin roles.
- Marketplace, coupons, loyalty points, subscriptions, or push notifications.

## 12. Acceptance criteria

The MVP is acceptable when:

- a customer can place a valid order using only enabled delivery dates;
- database-calculated totals cannot be altered from the browser;
- an order remains saved even if WhatsApp does not open;
- the generated summary contains everything needed to request Pix payment;
- the owner can manage orders, statuses, delivery dates, items, combos, and business settings after authenticated login;
- the core flow is usable on a modern mobile browser and passes the defined automated checks.
