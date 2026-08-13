# Fonsi POS

A modern, multi-tenant Point of Sale & business operations platform for
small and medium-sized businesses — built to start in Kenya and scale
globally.

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full system
architecture, ERD, RBAC design, and roadmap.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase
(Postgres + Auth + RLS) · Zustand · React Hook Form + Zod · TanStack Table
· Recharts · Dexie.js (offline) · ZXing (barcode) · jsPDF/React-PDF
(receipts) · Sonner (notifications)

## Getting started

\`\`\`bash
npm install
cp .env.example .env.local   # fill in your Supabase project + M-Pesa creds
npm run dev
\`\`\`

Open http://localhost:3000

## Scripts

\`\`\`bash
npm run dev       # start the dev server
npm run build     # production build
npm run start     # run the production build
npm run lint      # eslint
npm run test      # vitest (unit/integration)
\`\`\`

## Project status

Currently at **Phase 1 — Project Setup** of the roadmap in
\`docs/ARCHITECTURE.md\`. The full module tree is scaffolded with
placeholder pages; business logic, database schema/RLS, and real
authentication land in the phases that follow.

## Environment variables

See [\`.env.example\`](./.env.example). Never commit \`.env.local\` or any
file containing real secrets.
