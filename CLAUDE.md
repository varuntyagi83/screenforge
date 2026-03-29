# CLAUDE.md — ScreenForge Project Context

This is a Claude Code project. Read `PLAN.md` for the complete build specification.

## What This Is

ScreenForge — a Kommodo-style bot-free screen recorder with AI transcription, summaries, and SOP generation.

## Architecture

- **Frontend:** Next.js 14 (App Router) + TypeScript (strict) + shadcn/ui + Tailwind CSS
- **Database:** PostgreSQL on Railway via Prisma ORM
- **Video Storage:** Google Drive API (OAuth2, resumable uploads, dedicated app folder)
- **AI Layer:** OpenAI GPT-4o (summaries, SOPs, action items) + OpenAI Whisper (transcription) — single `OPENAI_API_KEY`
- **Auth:** NextAuth.js v5 with Google OAuth (shared credentials for Auth + Drive)
- **Testing:** Vitest + React Testing Library + Playwright (E2E)
- **Local-first:** IndexedDB buffer → background sync to Drive

## Critical Design Rules

1. **Bot-free** — all capture is client-side via browser APIs. No bot joins calls. Only the recorder sees permission prompts.
2. **Local-first** — save to IndexedDB immediately, upload to Drive in background. App works offline.
3. **Self-exclusion** — use `selfBrowserSurface: "exclude"` in getDisplayMedia to keep recorder UI out of the recording.
4. **Full control** — Start, Pause, Resume, Stop via floating control bar + keyboard shortcuts (`Ctrl+Shift+R`, `Ctrl+Shift+P`).
5. **Preference memory** — persist device selections, recording mode, audio settings in localStorage.
6. **Contract-first** — ALL TypeScript interfaces defined in `src/types/index.ts` before implementation.
7. **Error handling** — every async function has try-catch, every error surfaces via toast notification, every useEffect returns cleanup.
8. **No `any` types** — strict TypeScript throughout, no `@ts-ignore`, no unnecessary `as` assertions.

## Commands

```bash
pnpm dev          # Dev server
pnpm build        # Production build
pnpm typecheck    # TypeScript check (must pass before every commit)
pnpm lint         # ESLint
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright E2E tests
pnpm db:push      # Push Prisma schema to Railway
pnpm db:generate  # Regenerate Prisma client
```

## Environment Variables

```env
DATABASE_URL=""           # Railway PostgreSQL
NEXTAUTH_URL=""           # http://localhost:3000
NEXTAUTH_SECRET=""        # openssl rand -base64 32
GOOGLE_CLIENT_ID=""       # Google Cloud Console OAuth 2.0
GOOGLE_CLIENT_SECRET=""   # Google Cloud Console OAuth 2.0
OPENAI_API_KEY=""         # Powers BOTH Whisper transcription AND GPT-4o summaries
```

## Build Plan

The full 20-phase build specification is in `PLAN.md`. The `run-build.sh` script reads it and executes phases sequentially. Each phase has a validation gate that must pass before proceeding.
