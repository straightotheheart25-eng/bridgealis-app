# Bridgealis App — Starter scaffold

This branch contains a starter Next.js + TypeScript scaffold for the Bridgealis job marketplace.

Included features in this scaffold:
- Prisma schema with core models (User, Profile, Company, Job, Application, Resume)
- API endpoints for resume availability and generation (server-side PDF using pdf-lib)
- Client component to trigger resume generation (gated after 2 applications)
- Pricing page that computes 10% below a configurable baseline price

How to run locally:
1. cp .env.example .env.local and fill values (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_BASELINE_POST_PRICE)
2. pnpm install or npm install
3. npx prisma migrate dev --name init
4. npm run dev

Notes:
- This scaffold uses pdf-lib (server-side) for PDF generation to keep runtime serverless-friendly. For higher-fidelity HTML->PDF, consider a worker using Puppeteer.
- Auth wiring (NextAuth providers) is scaffolded minimally; configure providers as needed.
