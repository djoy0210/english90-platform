# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Clerk-managed authentication

## Product Notes

- Building a 90-day bilingual Mongolian/English self-study web app with lessons, quizzes, final tests, progress tracking, admin lesson editing, and premium access.
- Daily lessons are intended to be about 60 minutes with 20 vocabulary words, clickable browser pronunciation, reading/listening/speaking practice, quiz questions, and homework. Day 1 is based on the user's provided Greetings & Introductions lesson PDF.
- New learners take a placement test after signup; the result sets their recommended level and starting day (Level 1 Day 1, Level 2 Day 31, or Level 3 Day 61).
- Payments use QPay invoice/QR flow for Mongolia. Required environment variables: `QPAY_MERCHANT_USERNAME`, `QPAY_MERCHANT_PASSWORD`, optional `QPAY_MERCHANT_TOKEN`, `QPAY_API_URL`, and `QPAY_WEBHOOK_TOKEN`. When credentials are missing, invoice endpoints return a configuration warning instead of faking success.
- Lessons support a reusable 3-page JSON template (`lessonContent`) plus optional `pdfUrl`: Page 1 vocabulary/grammar, Page 2 reading/speaking, Page 3 listening/homework.
- Admin lesson editor: structured row-based editors for vocabulary/quiz/key-phrases/role-play/listening-questions/matching, plus a "JSON ачаалах" button that accepts a single JSON blob (titles, objectives, vocabulary[], quiz[], lessonContent.{page1,page2,page3}) to load an entire lesson at once. Per-page merge preserves untouched pages. A "Загвар хуулах" button copies the canonical template shape.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
