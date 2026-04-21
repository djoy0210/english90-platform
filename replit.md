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
- Payments use a manual Khan Bank flow: learner submits transfer proof (`POST /payments/requests`), admin approves/rejects (`POST /admin/payment-requests/:id/decide`), and approval auto-creates the matching `content_unlocks` row so lessons unlock immediately. Bank: Khan Bank, IBAN `05 0005 00 5224574340`, holder Давхарбаяр Алтангэрэл. Pricing: per-level 29,000 MNT, full course 79,000 MNT. Legacy QPay endpoints remain for fallback only.
- Auth: Clerk session is required for every `/api` route in production (returns 401 otherwise). Admins are determined by the `ADMIN_EMAILS` env (comma-separated, case-insensitive). In development, an unauthenticated request maps to a `demo-user` admin account for local testing.
- Final tests use the per-test `passing_score` column (default 80) for grading; lesson quizzes default to 80% as well. UI copy and grading are aligned.
- Lessons support a reusable 3-page JSON template (`lessonContent`) plus optional `pdfUrl` and `audioUrl` (rendered as an `<audio>` player on Page 3 alongside the TTS button): Page 1 vocabulary/grammar, Page 2 reading/speaking, Page 3 listening/homework.
- Admin lesson editor: structured row-based editors for vocabulary/quiz/key-phrases/role-play/listening-questions/matching, plus a "JSON ачаалах" button that accepts a single JSON blob (titles, objectives, vocabulary[], quiz[], lessonContent.{page1,page2,page3}) to load an entire lesson at once. Per-page merge preserves untouched pages. A "Загвар хуулах" button copies the canonical template shape.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
