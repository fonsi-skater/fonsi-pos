# Fonsi POS — POS Screen Design System

Applies to: the checkout screen (`/pos`), the embeddable POS (`/embed/pos`),
and receipts. **Not** the back-office dashboard (products, inventory,
reports, settings, etc.) — that stays on the light, neutral shadcn theme
defined in `globals.css`'s `:root`, because those screens are read a lot,
scanned for data, and used at a desk, where clarity beats mood.

The POS screen has a different job: it's touch-first, used standing up,
operated hundreds of times a day, and glanced at rather than read. It
gets its own theme, scoped under the `.pos-theme` class so the two never
collide.

## Where this came from

Translated from a reference mood board: a marketing hero with a deep
violet-to-black ground, a warm peach glow in the corners, glassy dark
cards, pill-shaped black buttons, and a glowing circular focal point
(orbiting avatar nodes around a central stat). A literal marketing hero
doesn't fit a checkout screen — no scrolling, no reading, no orbiting
animation a cashier has to wait out — so the *material* carried over
(dark glass, violet glow, pills, a glowing circular focal point) while
the *form* changed to something built for speed.

## Token system

**Color** (defined as CSS custom properties under `.pos-theme` in
`src/app/globals.css`, referenced via the same `--color-*` Tailwind
tokens the rest of the app uses — `bg-primary`, `text-foreground`, etc.
still work, they just resolve to different values inside `.pos-theme`):

| Token | Value | Use |
|---|---|---|
| `--background` | deep violet-black (`oklch(0.16 0.03 296)`) | page ground |
| `--card` | translucent dark violet (`oklch(0.21 0.035 293 / 0.7)`) | glass panels — product tiles, cart |
| `--primary` | vivid violet (`oklch(0.62 0.23 296)`) | primary actions, the charge/checkout button, active states |
| `--pos-glow-violet` / `--pos-glow-peach` | soft violet + warm peach at low opacity | the two corner glows in `.pos-glow-bg` |
| `--success` / `--warning` / `--destructive` | shifted to sit comfortably on dark (brighter, slightly desaturated vs. the light theme's versions) | payment status, stock warnings inside POS only |

Two utility classes ship alongside the tokens:
- **`.pos-glow-bg`** — the ambient two-corner radial gradient (peach top-left, violet bottom-right) for the screen background.
- **`.pos-glass`** — the glass card treatment (translucent background + backdrop blur + hairline border) for product tiles, the cart panel, and modals within the POS.

**Type:**
- Body/UI text: system sans stack (`--font-sans`) — unchanged from the rest of the app, for legibility at speed.
- Numbers/totals/screen titles: `--font-display`, a rounded system stack (`ui-rounded`, `SF Pro Rounded`, `Nunito`) echoing the reference's bold rounded headline face. **TODO:** self-host or `next/font` a real rounded display face (candidates: General Sans, Cabinet Grotesk, Plus Jakarta Sans) once deploying somewhere with normal font-CDN access — this sandbox can't reach Google Fonts at build time, so the fallback stack is what's live for now.

**Layout concept** (for Phase 6 to build against):
```
┌─────────────────────────────────────────────────────────┐
│ pos-glow-bg                                              │
│ ┌───────────────────────────────┐  ┌──────────────────┐ │
│ │ Product grid (.pos-glass tiles)│  │ Cart (.pos-glass) │ │
│ │  [img] [img] [img] [img]       │  │ item              │ │
│ │  [img] [img] [img] [img]       │  │ item              │ │
│ │  search / barcode scan up top  │  │ ─────────────      │ │
│ │                                 │  │ Total (display font,│ │
│ │                                 │  │ glowing behind it) │ │
│ │                                 │  │ [ Charge  ⌾ ]       │ │
│ └───────────────────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Signature element:** a soft violet glow that blooms behind the
Charge/checkout total once the cart has items — the one animated,
attention-drawing moment on the screen, echoing the reference's glowing
central node. Everything else on the screen stays quiet and disciplined
around it (per the "spend your boldness in one place" principle) —
product tiles and cart rows are flat glass, no competing glow.

## Usage

Wrap the POS route's root layout element in `className="pos-theme
pos-glow-bg"`. Individual panels (product tiles, cart, modals within POS)
use `className="pos-glass rounded-2xl"` instead of the default `Card`
component's light styling. This lands with the actual POS build in
**Phase 6** — this document exists so the tokens are decided and
consistent before that code is written, not improvised mid-phase.
