# Fonsi POS — System Architecture

This document is the "First Deliverable" required before implementation:
system architecture, ERD, folder structure, and the auth/tenancy/RBAC/API/
plugin/payment/offline/security design that every phase builds on.

## 1. High-level architecture

```text
┌───────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                          │
│  Next.js App Router (RSC + Client Components) · Zustand · Dexie   │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ HTTPS
┌───────────────────────────────▼───────────────────────────────────┐
│                    Next.js Server (Vercel-compatible)             │
│  Route Handlers (/api/*) · Server Actions · Proxy (auth refresh)  │
│  src/server/services  →  src/server/repositories  →  Supabase     │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ Postgres wire protocol / REST
┌───────────────────────────────▼───────────────────────────────────┐
│                          Supabase (Postgres)                      │
│   RLS-enforced tables · Auth · Storage (product images/logos)     │
└─────────────────────────────────────────────────────────────────────┘
                                 ▲
                                 │ verified server-to-server callback
┌───────────────────────────────┴───────────────────────────────────┐
│                   Safaricom Daraja (M-Pesa) API                   │
└─────────────────────────────────────────────────────────────────────┘
```

Layering rule: UI components never call Supabase directly for writes that
matter financially. They call a Server Action or `/api/*` route, which
calls a `server/services` function (business logic + authorization), which
calls a `server/repositories` function (the only place that talks to
Supabase). This keeps authorization and financial calculation server-side
and out of components, per spec rule "never trust frontend calculations."

## 2. Multi-tenancy

Every tenant-scoped table carries `business_id` (and `branch_id` where
applicable). Tenant isolation is enforced twice, independently:

1. **RLS policies** (Phase 3) — every table's policies filter rows to
   `business_id`s the requesting user is a member of, via a
   `business_members` lookup. This is the real security boundary.
2. **Server-side scoping** — services always filter/insert with the
   caller's resolved `business_id` from their session, as defense in depth
   and to fail closed if a query is ever written wrong.

The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS entirely
and is therefore only used in `src/lib/supabase/admin.ts`, guarded by
`import "server-only"`, for a short, explicit allow-list of cross-tenant
operations (Super Admin platform queries, M-Pesa callback verification).

## 3. RBAC

Four roles: `super_admin`, `business_owner`, `manager`, `cashier`.
`src/lib/permissions/index.ts` is the single source of truth mapping roles
→ permissions (see spec §4). It's used to:
- Filter the sidebar (`src/config/navigation.ts`)
- Gate UI actions (disable/hide buttons)
- Gate Server Actions / API routes (`hasPermission(role, PERMISSIONS.X)`
  before any mutation)

The permission matrix is UX; RLS + server checks are the actual gate —
never rely on the client-hidden button alone.

## 4. Database ERD (conceptual)

```text
businesses ──< branches
businesses ──< business_members >── users
businesses ──< categories ──< products ──< product_variants
products ──< inventory ──< inventory_movements
businesses ──< sales ──< sale_items >── products/product_variants
sales ──< payments ──< payment_transactions
sales ──< refunds
businesses ──< customers ──< customer_transactions
businesses ──< suppliers ──< purchases ──< purchase_items
businesses ──< expenses >── expense_categories
businesses ──< employees >── users
businesses ──< discounts
businesses ──< taxes
sales ──< receipts
businesses ──< notifications
businesses ──< audit_logs >── users
businesses ──< subscriptions
businesses ──< plugin_installations
```

Full column-level schema + RLS policies + indexes ship as SQL migrations
in `supabase/migrations/` during **Phase 3**. Conventions decided now:

- UUID primary keys (`gen_random_uuid()`).
- `created_at`, `updated_at` (trigger-maintained), `created_by`,
  `updated_by` on every table.
- Soft delete (`deleted_at timestamptz null`) on financial/record-of-truth
  tables (products, sales, payments, customers, employees) — financial
  history is never hard-deleted (spec §6/§28).
- Money stored as `numeric(12,2)`, never float.

## 5. Folder structure

```text
Fonsi_POS/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login, register/          — public auth pages
│  │  ├─ (dashboard)/                     — sidebar shell + all modules
│  │  │  dashboard, pos, products, categories, inventory, sales,
│  │  │  customers, suppliers, purchases, expenses, employees,
│  │  │  branches, payments, reports, notifications, settings,
│  │  │  audit-logs, plugins
│  │  ├─ (super-admin)/                   — platform-owner only
│  │  │  businesses, subscriptions, platform-analytics
│  │  ├─ embed/pos/                       — iframe-safe POS, no admin UI
│  │  └─ api/                             — route handlers, one folder per resource
│  ├─ components/
│  │  ├─ ui/                              — shadcn/ui primitives
│  │  ├─ layout/                          — sidebar, topbar
│  │  └─ <module>/                        — feature components per module
│  ├─ lib/
│  │  ├─ supabase/                        — client.ts, server.ts, admin.ts, middleware.ts
│  │  ├─ permissions/                     — RBAC matrix
│  │  ├─ payments/                        — provider interface + providers/
│  │  ├─ validations/                     — Zod schemas (shared client+server)
│  │  ├─ offline/                         — Dexie schema + sync engine (Phase 10)
│  │  ├─ plugins/                         — plugin registry (Phase 11)
│  │  └─ api/                             — response helpers
│  ├─ server/
│  │  ├─ actions/                         — Server Actions (mutations from forms)
│  │  ├─ services/                        — business logic + authorization
│  │  └─ repositories/                    — the only layer that queries Supabase
│  ├─ stores/                             — Zustand stores (cart, etc.)
│  ├─ hooks/                              — shared React hooks
│  ├─ types/                              — domain types + generated Database type
│  └─ config/                             — navigation, plugin registry config
├─ supabase/
│  ├─ migrations/                         — SQL migrations (Phase 3+)
│  └─ seed/                               — seed data (Phase 3)
├─ tests/
│  ├─ unit/ · integration/ · e2e/
├─ docs/
│  └─ ARCHITECTURE.md                     — this file
├─ .env.example
└─ components.json                        — shadcn/ui config
```

## 6. API design

REST-ish route handlers under `/api/<resource>`, plus Server Actions for
form-driven mutations inside the dashboard. Every route:
- Validates input with the matching Zod schema from `src/lib/validations`.
- Resolves the caller's session + role, checks `hasPermission(...)`.
- Delegates to a `server/services` function — never queries Supabase inline.
- Returns the standard envelope from `src/lib/api/response.ts`
  (`{ success, data }` or `{ success: false, error: { message, details } }`),
  never a raw database error.

## 7. Payment architecture

`src/lib/payments/index.ts` exposes `getPaymentProvider(method)`, backed by
`PaymentProvider` implementations (`cash.ts` done; `mpesa.ts` scaffolded,
full Daraja STK Push + callback verification in Phase 7; card/bank/credit
follow the same interface later). No payment branching logic lives outside
this module. M-Pesa payments are only ever marked `success` by the server
after verifying Daraja's callback — never by trusting the client.

## 8. Offline architecture

Phase 10 will add `src/lib/offline/` with a Dexie schema mirroring the
sales/sale_items tables, a local write queue, a sync engine that runs on
reconnect, retry with backoff, and idempotency keys so a synced sale is
never double-recorded. The POS UI shows one of `ONLINE / OFFLINE / SYNCING
/ SYNC ERROR` at all times (`SyncStatus` type already defined in
`src/types/index.ts`).

## 9. Plugin architecture

Phase 11 will add a `plugin_installations` table + `src/lib/plugins/`
registry describing each plugin's name, version, config schema, required
permissions, and enabled state per business. Core modules (POS, receipts,
M-Pesa, barcode, etc.) are being built as if they were plugins from day
one — enable/disable toggles come later without a rewrite.

## 10. Security architecture

- RLS on every tenant table (Phase 3).
- RBAC via `src/lib/permissions`, re-checked server-side on every mutation.
- Zod validation shared between form and API.
- `SUPABASE_SERVICE_ROLE_KEY` and M-Pesa secrets are server-only env vars,
  never referenced from a Client Component.
- `src/lib/supabase/admin.ts` is hard-guarded with `import "server-only"`.
- Errors are logged server-side and returned to the client as generic,
  actionable messages (`src/lib/api/response.ts`) — no stack traces, no
  SQL, no secrets ever reach the browser.
- Payment idempotency keys on every `PaymentResult`.
- `src/proxy.ts` refreshes the Supabase session and redirects
  unauthenticated users away from protected routes on every request.

## 11. Roadmap (per spec §32)

Phase 1 (this deliverable) → Auth → Database/RLS → Products → Inventory →
POS → Payments → Receipts → Reports → Offline → Plugins → Production
hardening. Each phase ends with a summary of what was built, files
touched, new env vars, run/test instructions, and known issues, then
waits for confirmation before continuing — per the development workflow
rules in the original brief.
