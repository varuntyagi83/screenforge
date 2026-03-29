# ScreenForge — Complete Build Plan

> A fully automated Claude Code build plan for a Kommodo-style bot-free screen recorder.
> **One file. One command. No prompt pasting.**

---

## How To Use This File

```bash
# 1. Place this file + run-build.sh in an empty directory
# 2. Make the runner executable
chmod +x run-build.sh

# 3. Set your API keys
export ANTHROPIC_API_KEY="your-claude-code-key"

# 4. Run the full build
./run-build.sh
```

The `run-build.sh` script reads this file, splits it into phases, and feeds each phase to Claude Code sequentially. You don't touch anything.

---

## Architecture

- **Frontend:** Next.js 14 (App Router) + TypeScript (strict) + shadcn/ui + Tailwind CSS
- **Database:** PostgreSQL on Railway (connected via `DATABASE_URL` env var)
- **ORM:** Prisma
- **Video Storage:** Google Drive API (OAuth2, dedicated app folder)
- **AI Layer:** OpenAI GPT-4o (summaries, SOPs, action items) + OpenAI Whisper (transcription) — single `OPENAI_API_KEY`
- **Auth:** NextAuth.js v5 with Google OAuth (shared credentials for Drive access)
- **Testing:** Vitest + React Testing Library + Playwright (E2E)
- **Local-first:** IndexedDB for offline recording buffer before Drive sync

## Key Features

- **Bot-free recording** — only you see permission prompts, other call participants see nothing
- **Full control** — Start, Pause, Resume, Stop + keyboard shortcuts (`Ctrl+Shift+R`, `Ctrl+Shift+P`)
- **PiP mode** — Screen + circular webcam bubble overlay via Canvas compositing
- **Local-first** — Saves to IndexedDB instantly, uploads to Google Drive in background
- **AI pipeline** — Auto-transcription (Whisper) → summary → action items → SOP guide (GPT-4o)
- **Public sharing** — Toggle a link, anyone can view without login
- **Chrome Extension** — Manifest V3, record from any page

## Critical Design Decisions

1. **Bot-free recording** — All capture happens client-side via browser APIs. No bot joins any call. Only the recorder sees permission prompts.
2. **Local-first** — Recordings save to IndexedDB immediately. Drive upload happens in background. App works offline.
3. **Preference memory** — Last-used devices, recording mode, and audio settings persist in localStorage so repeat recordings start with one click.
4. **Self-exclusion** — Use `selfBrowserSurface: "exclude"` in getDisplayMedia options to prevent the recorder UI from appearing in the recording.
5. **Full recording control** — Start, Pause, Resume, Stop with keyboard shortcuts. Pause/Resume uses native MediaRecorder.pause()/resume().
6. **Chunked Drive upload** — Use Google Drive resumable upload protocol for files > 5MB.

## Project Structure Target

```
screenforge/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Auth pages (login, callback)
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── library/        # Recording library
│   │   │   ├── record/         # Recording page
│   │   │   └── share/[id]/     # Public share viewer
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # NextAuth routes
│   │   │   ├── recordings/     # CRUD + upload
│   │   │   ├── transcribe/     # Whisper transcription
│   │   │   └── ai/             # GPT-4o summarization + SOP
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── recorder/           # Recording UI components
│   │   │   ├── ControlBar.tsx  # Floating draggable control bar
│   │   │   ├── Countdown.tsx   # 3-2-1 countdown overlay
│   │   │   ├── DevicePicker.tsx# Audio/video device selector
│   │   │   ├── ModeSelector.tsx# Screen/Camera/PiP mode
│   │   │   ├── PiPCanvas.tsx   # Canvas compositor for PiP
│   │   │   └── RecordingEngine.tsx # Core recording logic
│   │   ├── library/            # Dashboard/library components
│   │   ├── player/             # Playback + transcript viewer
│   │   └── ui/                 # shadcn/ui components
│   ├── hooks/
│   │   ├── useMediaRecorder.ts # MediaRecorder state machine
│   │   ├── useScreenCapture.ts # getDisplayMedia wrapper
│   │   ├── useWebcam.ts        # getUserMedia wrapper
│   │   ├── usePiPCompositor.ts # Canvas compositing hook
│   │   └── useDriveUpload.ts   # Google Drive upload with progress
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── drive.ts            # Google Drive API helpers
│   │   ├── idb.ts              # IndexedDB helpers for local buffer
│   │   ├── ai.ts               # OpenAI client (GPT-4o summaries + Whisper transcription)
│   │   └── utils.ts            # Shared utilities
│   ├── types/
│   │   └── index.ts            # ALL TypeScript interfaces (contracts)
│   └── __tests__/              # Test files mirror src structure
├── prisma/
│   └── schema.prisma           # Database schema
├── e2e/                        # Playwright E2E tests
├── public/
├── .env.example
├── CLAUDE.md                   # Claude Code reads this for context
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── playwright.config.ts
```

## Environment Variables

```env
# Railway PostgreSQL
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth (same app for Auth + Drive)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# AI APIs (OpenAI handles BOTH transcription via Whisper AND summaries via GPT-4o)
OPENAI_API_KEY=""
```

---

# EXECUTION PROTOCOL

Execute all phases sequentially. Do NOT skip steps. Do NOT proceed to the next phase until the current phase's validation gate passes. After every verification checkpoint phase (07, 12, 17, 20), run the FULL test suite: `pnpm test && pnpm lint && pnpm typecheck`.

---

<!-- PHASE 01 -->
# Phase 01 — Project Scaffold

## OBJECTIVE
Set up the Next.js project with all tooling, dependencies, and configuration. Nothing functional yet — just a rock-solid foundation.

## INSTRUCTIONS

### 1. Initialize Project
```bash
pnpm create next-app@latest screenforge --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd screenforge
```

### 2. Install Core Dependencies
```bash
# UI
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast class-variance-authority clsx tailwind-merge lucide-react

# shadcn/ui setup
pnpm dlx shadcn-ui@latest init
# Select: New York style, Zinc color, CSS variables: yes

# Database
pnpm add prisma @prisma/client
pnpm add -D prisma

# Auth
pnpm add next-auth@beta @auth/prisma-adapter

# Google Drive
pnpm add googleapis google-auth-library

# AI (OpenAI for both Whisper transcription AND GPT-4o summaries)
pnpm add openai

# Utilities
pnpm add idb zustand nanoid date-fns
```

### 3. Install Dev Dependencies
```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D @playwright/test
pnpm add -D @types/node
```

### 4. Configure TypeScript Strict Mode
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": false
  }
}
```

### 5. Configure Vitest
Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `src/__tests__/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

### 6. Configure Playwright
Create `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

### 7. Add Package Scripts
Add to `package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  }
}
```

### 8. Create .env.example
```env
# Railway PostgreSQL
DATABASE_URL="postgresql://user:pass@host:5432/screenforge"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET=""

# Google OAuth + Drive
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# AI APIs (OpenAI handles BOTH Whisper transcription AND GPT-4o summaries)
OPENAI_API_KEY=""
```

### 9. Create Global Error Boundary
Create `src/components/ErrorBoundary.tsx` — a React error boundary that catches render errors and shows a fallback UI with a "Try Again" button. This pattern must be used in ALL subsequent components.

### 10. Create Toast Provider
Set up shadcn/ui toast provider in the root layout for user-facing error/success notifications. ALL async operations in the app must show toast on error.

## VALIDATION GATE
```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

---

<!-- PHASE 02 -->
# Phase 02 — Type Contracts & Prisma Schema

## OBJECTIVE
Define ALL TypeScript interfaces and the complete Prisma schema BEFORE any implementation. This is the contract that every subsequent phase implements against. No implementation code in this phase — only types and schema.

## INSTRUCTIONS

### 1. Prisma Schema
Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String      @id @default(cuid())
  name          String?
  email         String      @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  recordings    Recording[]
  preferences   UserPreferences?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model UserPreferences {
  id                  String  @id @default(cuid())
  userId              String  @unique
  user                User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  defaultMode         String  @default("screen")
  defaultAudioDevice  String?
  defaultVideoDevice  String?
  includeSystemAudio  Boolean @default(true)
  countdownSeconds    Int     @default(3)
  shortcutToggle      String  @default("Ctrl+Shift+R")
  shortcutPause       String  @default("Ctrl+Shift+P")
}

model Recording {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title           String    @default("Untitled Recording")
  description     String?
  durationSeconds Int       @default(0)
  mode            String
  mimeType        String    @default("video/webm")
  fileSize        Int       @default(0)
  driveFileId     String?
  driveWebLink    String?
  thumbnailDriveId String?
  transcript      String?   @db.Text
  summary         String?   @db.Text
  actionItems     String?   @db.Text
  sopGuide        String?   @db.Text
  aiStatus        String    @default("pending")
  isPublic        Boolean   @default(false)
  shareToken      String?   @unique
  localIdbKey     String?
  uploadStatus    String    @default("local")
  uploadProgress  Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId, createdAt(sort: Desc)])
  @@index([shareToken])
}
```

### 2. TypeScript Interfaces
Create `src/types/index.ts` with ALL types:

```typescript
// ============================================================
// RECORDING ENGINE TYPES
// ============================================================

export type RecordingMode = 'screen' | 'camera' | 'pip'
export type RecordingState = 'idle' | 'countdown' | 'recording' | 'paused' | 'stopped' | 'error'

export interface RecordingConfig {
  mode: RecordingMode
  audioDeviceId?: string
  videoDeviceId?: string
  includeSystemAudio: boolean
  maxWidth?: number
  maxHeight?: number
  frameRate?: number
  mimeType: string
}

export interface RecordingSession {
  state: RecordingState
  startedAt: Date | null
  duration: number
  pausedDuration: number
  chunks: Blob[]
  config: RecordingConfig
  error?: string
}

export interface MediaDeviceInfo {
  deviceId: string
  label: string
  kind: 'audioinput' | 'videoinput' | 'audiooutput'
}

// ============================================================
// CONTROL BAR TYPES
// ============================================================

export interface ControlBarProps {
  state: RecordingState
  duration: number
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onDiscard: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: 'toggle' | 'pause' | 'stop' | 'discard'
}

// ============================================================
// PIP COMPOSITOR TYPES
// ============================================================

export interface PiPConfig {
  screenStream: MediaStream
  cameraStream: MediaStream
  canvasWidth: number
  canvasHeight: number
  cameraSize: number
  cameraPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  cameraOffsetX: number
  cameraOffsetY: number
  targetFps: number
}

export interface PiPCompositorResult {
  canvasRef: React.RefObject<HTMLCanvasElement>
  compositeStream: MediaStream | null
  isCompositing: boolean
  error?: string
}

// ============================================================
// GOOGLE DRIVE TYPES
// ============================================================

export interface DriveUploadOptions {
  fileName: string
  mimeType: string
  folderId?: string
  onProgress?: (percent: number) => void
}

export interface DriveUploadResult {
  fileId: string
  webViewLink: string
  webContentLink: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: string
  webViewLink: string
  webContentLink: string
  createdTime: string
}

// ============================================================
// INDEXEDDB LOCAL BUFFER TYPES
// ============================================================

export interface LocalRecording {
  id: string
  blob: Blob
  thumbnailBlob?: Blob
  config: RecordingConfig
  duration: number
  createdAt: Date
  uploaded: boolean
}

// ============================================================
// API ROUTE TYPES
// ============================================================

export interface CreateRecordingRequest {
  title?: string
  mode: RecordingMode
  durationSeconds: number
  mimeType: string
  fileSize: number
  localIdbKey: string
}

export interface CreateRecordingResponse {
  id: string
  uploadUrl?: string
}

export interface UpdateRecordingRequest {
  title?: string
  description?: string
  isPublic?: boolean
  driveFileId?: string
  driveWebLink?: string
  thumbnailDriveId?: string
  uploadStatus?: string
  uploadProgress?: number
}

export interface TranscribeRequest {
  recordingId: string
}

export interface TranscribeResponse {
  transcript: string
  language: string
  durationSeconds: number
}

export interface AISummaryRequest {
  recordingId: string
}

export interface AISummaryResponse {
  summary: string
  actionItems: string[]
  sopGuide: string
}

export interface RecordingListItem {
  id: string
  title: string
  description: string | null
  durationSeconds: number
  mode: RecordingMode
  thumbnailUrl: string | null
  aiStatus: string
  uploadStatus: string
  isPublic: boolean
  shareToken: string | null
  createdAt: string
}

export interface RecordingDetail extends RecordingListItem {
  driveWebLink: string | null
  transcript: string | null
  summary: string | null
  actionItems: string[] | null
  sopGuide: string | null
}

// ============================================================
// SHARE TYPES
// ============================================================

export interface ShareConfig {
  isPublic: boolean
  shareToken: string | null
  shareUrl: string | null
}

// ============================================================
// USER PREFERENCES TYPES
// ============================================================

export interface UserPreferencesData {
  defaultMode: RecordingMode
  defaultAudioDevice: string | null
  defaultVideoDevice: string | null
  includeSystemAudio: boolean
  countdownSeconds: number
  shortcutToggle: string
  shortcutPause: string
}

// ============================================================
// COMPONENT PROP TYPES
// ============================================================

export interface CountdownProps {
  seconds: number
  onComplete: () => void
}

export interface DevicePickerProps {
  audioDevices: MediaDeviceInfo[]
  videoDevices: MediaDeviceInfo[]
  selectedAudio: string | null
  selectedVideo: string | null
  onAudioChange: (deviceId: string) => void
  onVideoChange: (deviceId: string) => void
}

export interface ModeSelectorProps {
  selected: RecordingMode
  onChange: (mode: RecordingMode) => void
}

export interface RecordingCardProps {
  recording: RecordingListItem
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onShare: (id: string) => void
}

export interface VideoPlayerProps {
  src: string
  transcript?: TranscriptSegment[]
  onTimeUpdate?: (time: number) => void
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptViewerProps {
  segments: TranscriptSegment[]
  currentTime: number
  onSegmentClick: (time: number) => void
}
```

### 3. Create Prisma Client Singleton
Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 4. Write Contract Tests
Create `src/__tests__/types.test.ts` — a test file that imports every type and interface from `src/types/index.ts` and validates that they compile. Create mock objects conforming to each interface.

### 5. Generate Prisma Client
```bash
pnpm prisma generate
```

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
pnpm prisma generate
pnpm prisma validate
```

---

<!-- PHASE 03 -->
# Phase 03 — Screen Recording Core

## OBJECTIVE
Build the core screen capture hook using `getDisplayMedia`. Screen-only recording that produces a downloadable WebM file.

## INSTRUCTIONS

### 1. Create `useScreenCapture` Hook (`src/hooks/useScreenCapture.ts`)

Wraps `navigator.mediaDevices.getDisplayMedia()` with:
- **Self-exclusion:** Use `selfBrowserSurface: "exclude"` to prevent the recorder's own tab from appearing in the picker (Chrome 112+). Fall back gracefully if unsupported.
- **System audio capture:** Pass `audio: true` in getDisplayMedia constraints for tab audio.
- **Preference memory:** On successful capture, save the selected `displaySurface` type to localStorage.
- **Stream lifecycle:** Handle `track.onended` event (fires when user clicks browser's "Stop sharing") — trigger recording stop.
- **Cleanup:** `stopCapture()` must call `track.stop()` on ALL tracks.

Returns: `{ screenStream, isCapturing, error, startCapture, stopCapture }`

### 2. Create `useMediaRecorder` Hook (`src/hooks/useMediaRecorder.ts`)

Recording state machine with full Start/Pause/Resume/Stop control.

**State machine:** `idle → countdown → recording → paused → recording → stopped` (and `→ error` from any state)

- **Codec selection:** Try `video/webm;codecs=vp9,opus` first, fall back to `vp8,opus`, then `video/webm`. Check with `MediaRecorder.isTypeSupported()`.
- **Chunk collection:** Use `ondataavailable` with `timeslice: 1000` (1-second chunks).
- **Pause/Resume:** Call `mediaRecorder.pause()` and `mediaRecorder.resume()` directly. Track paused duration separately.
- **Duration tracking:** `requestAnimationFrame` loop that increments only when state is `recording`. Store `startedAt`, `pausedAt`, `totalPausedMs`.
- **Stop:** Call `mediaRecorder.stop()`, wait for final `ondataavailable` + `onstop`, assemble blob.
- **Error handling:** Wrap every operation in try-catch.

Returns: `{ state, duration, blob, error, startRecording, pauseRecording, resumeRecording, stopRecording, discardRecording }`

### 3. Create Recording Page (`src/app/(dashboard)/record/page.tsx`)

Minimal page: "Start Screen Recording" button → `startCapture()` → countdown → `startRecording(stream)` → shows elapsed time → Pause/Resume/Stop → after stop shows `<video>` preview + "Download WebM" button.

### 4. Write Tests
- `src/__tests__/hooks/useMediaRecorder.test.ts` — mock MediaRecorder, test state transitions, chunk accumulation, discard reset, error state
- `src/__tests__/hooks/useScreenCapture.test.ts` — mock getDisplayMedia, test capture/cleanup/permission denial

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
# Manual: Record 10 seconds, stop, preview plays, download WebM plays in VLC
```

---

<!-- PHASE 04 -->
# Phase 04 — Webcam, Microphone & Device Selection

## OBJECTIVE
Add webcam capture, microphone selection, and a device picker. All three modes selectable but PiP compositing comes in Phase 05.

## INSTRUCTIONS

### 1. Create `useWebcam` Hook (`src/hooks/useWebcam.ts`)
- Device enumeration via `enumerateDevices()`, filter for `audioinput`/`videoinput`, re-enumerate on `devicechange`
- Apply selected device IDs as exact constraints. Default to first available.
- Camera resolution: `{ width: { ideal: 1280 }, height: { ideal: 720 } }`
- Detect `NotAllowedError` and `NotFoundError` separately with user-friendly messages
- Returns: `{ webcamStream, audioDevices, videoDevices, selectedAudioDevice, selectedVideoDevice, setAudioDevice, setVideoDevice, isActive, error, startWebcam, stopWebcam, refreshDevices }`

### 2. Create `DevicePicker` Component (`src/components/recorder/DevicePicker.tsx`)
- Dropdowns for audio input and video input devices (shadcn/ui Select)
- Small live preview of selected camera
- Saves selections to localStorage

### 3. Create `ModeSelector` Component (`src/components/recorder/ModeSelector.tsx`)
- Three toggle buttons: Screen Only (Monitor icon), Camera Only (Camera icon), Screen + Camera PiP (combined icon)
- Saves last-used mode to localStorage

### 4. Update Recording Page
- Show ModeSelector and DevicePicker before recording
- Screen Only → useScreenCapture; Camera Only → useWebcam + useMediaRecorder; PiP → acquire both streams but record screen only for now

### 5. Write Tests
- `useWebcam.test.ts` — device enumeration, selection, permission errors
- `DevicePicker.test.tsx` — renders dropdowns, selection changes, empty device list
- `ModeSelector.test.tsx` — all modes render, selection fires onChange

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
# Manual: All 3 modes produce a recording. No webcam → graceful error.
```

---

<!-- PHASE 05 -->
# Phase 05 — PiP Canvas Compositing

## OBJECTIVE
Composite screen + webcam into a single stream using Canvas, with webcam as a circular bubble overlay.

## INSTRUCTIONS

### 1. Create `usePiPCompositor` Hook (`src/hooks/usePiPCompositor.ts`)

Takes two MediaStreams, composites onto canvas, outputs single MediaStream:
- Canvas dimensions match screen stream's `track.getSettings().width/height`
- `requestAnimationFrame` loop: draw screen full-frame → draw camera as circular clip in corner → border ring
- Camera position: configurable (bottom-right default), size: 180px diameter default
- Target 30 FPS with frame skipping if running too fast
- **Audio mixing:** `AudioContext` → `MediaStreamSource` for both streams → `MediaStreamAudioDestinationNode` → merged audio track on composite stream
- `canvas.captureStream(30)` for output
- Cleanup: cancel animation frame, close AudioContext, stop canvas stream

Returns: `{ compositeStream, canvasRef, isCompositing, fps, error, startCompositing, stopCompositing, updateCameraPosition }`

### 2. Update Recording Page for PiP Mode
Start screen → get screenStream → start webcam → get cameraStream → start compositor → get compositeStream → feed to MediaRecorder → on stop: cleanup all

### 3. Performance Guard
Track frame render time; if below 15fps for 5 seconds, reduce canvas resolution by 50%

### 4. Write Tests
- `usePiPCompositor.test.ts` — mock canvas/captureStream, test start/stop/cleanup, position update

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
# Manual: PiP record 30s — screen fills frame, webcam circle in corner, both audio tracks captured, 25+ FPS
```

---

<!-- PHASE 06 -->
# Phase 06 — Floating Control Bar & Keyboard Shortcuts

## OBJECTIVE
Draggable, always-visible, collapsible floating control bar with keyboard shortcuts.

## INSTRUCTIONS

### 1. Create `ControlBar` Component (`src/components/recorder/ControlBar.tsx`)

React Portal (appended to `document.body`):
- **Expanded (recording):** `🔴 00:04:32 | ⏸ Pause | ⏹ Stop | ─`
- **Expanded (paused):** `⏸ 00:04:32 | ▶ Resume | ⏹ Stop | 🗑 | ─`
- **Collapsed:** `🔴 00:04:32`
- Draggable via pointer events, constrained to viewport. `z-index: 2147483647`, `position: fixed`.
- Pulsing red dot when recording, static yellow when paused. Timer `HH:MM:SS` pauses when paused.
- Discard button (paused only) with confirmation dialog.
- Semi-transparent dark background, backdrop blur, pill shape.

### 2. Create `Countdown` Component (`src/components/recorder/Countdown.tsx`)
- Full-screen overlay: 3... 2... 1... with scale-in CSS animation
- Calls `onComplete` after countdown. Cancel button available.

### 3. Create `useKeyboardShortcuts` Hook (`src/hooks/useKeyboardShortcuts.ts`)
- `Ctrl+Shift+R` — toggle recording (start if idle, stop if recording/paused)
- `Ctrl+Shift+P` — toggle pause/resume
- Read custom shortcuts from localStorage/preferences
- Only active on recording page. Unregister on unmount.

### 4. Integrate Flow
Mode/device selection → "Start Recording" or `Ctrl+Shift+R` → countdown → recording starts → control bar appears → stop → control bar disappears → preview

### 5. Write Tests
- `ControlBar.test.tsx` — button states, collapse/expand, timer formatting, discard dialog
- `Countdown.test.tsx` — countdown fires onComplete, cancel stops it
- `useKeyboardShortcuts.test.ts` — shortcut fires action, cleanup removes listener

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
# Manual: Countdown 3-2-1, control bar draggable, timer pauses on pause, keyboard shortcuts work, collapse/expand works
```

---

<!-- PHASE 07 -->
# Phase 07 — Verification Checkpoint #1 (Recording Core)

## OBJECTIVE
Full audit and bug sweep of phases 01-06. This is a quality gate, NOT a feature phase.

## INSTRUCTIONS

### 1. Static Analysis
```bash
pnpm typecheck
pnpm lint --fix
```

### 2. Full Test Suite
```bash
pnpm test
```

### 3. Code Review Checklist
Review ALL files from phases 01-06:
- [ ] No hardcoded values — all config from constants or user config
- [ ] Every `async` function has try-catch, every error surfaces via toast
- [ ] Every `useEffect` that creates a resource returns cleanup
- [ ] No `any` types, no `@ts-ignore`, no unnecessary `as` assertions
- [ ] No streams left open after stop, no listeners after unmount, no running intervals
- [ ] Control bar buttons have `aria-label`
- [ ] No `console.log` in production code
- [ ] No unused imports, no circular dependencies

### 4. Edge Case Testing
- [ ] Permission denied → returns to idle with error message
- [ ] Browser "Stop sharing" → recording stops gracefully with valid file
- [ ] Pause at 0 seconds → timer shows 00:00:00, resume works
- [ ] Long pause (60s+) → timer resumes correctly, doesn't jump
- [ ] Rapid start/stop (<1s) → produces valid short WebM
- [ ] No microphone → screen-only still works without audio
- [ ] Tab switch during recording → recording continues
- [ ] Click "Start" 3x rapidly → only one recording starts
- [ ] Browser back during recording → warns or stops, no orphan streams

### 5. Performance
- PiP compositing maintains 25+ FPS
- Memory doesn't grow unbounded during 5-minute recording
- WebM file size: ~1-2 MB/min screen, ~3-5 MB/min PiP

## VALIDATION GATE
```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# ALL edge case tests pass
```

---

<!-- PHASE 08 -->
# Phase 08 — Authentication (NextAuth + Google OAuth)

## OBJECTIVE
NextAuth.js v5 with Google OAuth. Same Google account grants auth AND Drive access.

## INSTRUCTIONS

### 1. Configure NextAuth (`src/lib/auth.ts`)
- Provider: Google OAuth with scopes: `openid email profile https://www.googleapis.com/auth/drive.file`
- Adapter: PrismaAdapter
- Session strategy: `jwt`
- Callbacks: persist `access_token`, `refresh_token`, `expires_at` in JWT. Expose `user.id` in session. Auto-refresh expired tokens.
- On `signIn` event: create `UserPreferences` row with defaults if missing

### 2. Auth API Route
`src/app/api/auth/[...nextauth]/route.ts`

### 3. Middleware (`src/middleware.ts`)
- Protect `/(dashboard)/*` routes → redirect to `/login` if unauthenticated
- Allow: `/login`, `/share/[id]`, `/api/auth/*`, `/`

### 4. Login Page (`src/app/(auth)/login/page.tsx`)
- Centered card with "Sign in with Google" button. Redirects to `/library` on success.

### 5. Auth Hook (`src/hooks/useAuth.ts`)
- Wraps `useSession()`, returns typed user, loading state, sign-in/sign-out

### 6. Root Layout
- Wrap with `SessionProvider`
- Navigation header when authenticated: Logo, Library, Record, Settings, user avatar + Sign Out

### 7. Write Tests
- `middleware.test.ts` — protected redirect, public access, share links accessible
- `auth.test.ts` — session includes user.id, token refresh logic

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
pnpm build
# Manual: /library redirects to /login. Google OAuth → /library. DB rows created. Sign out works. /share/x accessible without auth.
```

---

<!-- PHASE 09 -->
# Phase 09 — Google Drive Integration

## OBJECTIVE
Upload recordings to Google Drive with resumable uploads, folder management, and progress tracking.

## INSTRUCTIONS

### 1. Drive Service (`src/lib/drive.ts`)
- `createAppFolder(accessToken)` — find/create "ScreenForge Recordings" folder, cache folder ID
- `uploadFile(options)` — simple upload (<5MB) or resumable (≥5MB) with 5MB chunks and progress tracking. Set metadata and parents.
- `getFileStream(accessToken, fileId)` — fetch file content for playback proxy
- `deleteFile(accessToken, fileId)` — delete from Drive
- `updateFilePermission(accessToken, fileId, isPublic)` — add/remove "anyone with link" permission

### 2. `useDriveUpload` Hook (`src/hooks/useDriveUpload.ts`)
- Uploads via `/api/recordings/upload` (token stays server-side)
- Progress via `XMLHttpRequest` (fetch doesn't support upload progress)
- Returns: `{ upload, progress, isUploading, error }`

### 3. Upload API Route (`src/app/api/recordings/upload/route.ts`)
- Receives multipart (video blob + metadata), gets user's token from JWT, uploads to Drive, creates/updates Recording row
- Size limit: 500MB

### 4. Video Proxy Route (`src/app/api/recordings/[id]/stream/route.ts`)
- Streams Drive content with `Content-Type` and `Content-Range` headers for seekable playback
- Supports range requests

### 5. IndexedDB Buffer (`src/lib/idb.ts`)
- Save recording locally immediately after stop
- Background sync to Drive, mark as uploaded on success
- Offline resilience: keep in IDB if upload fails, retry on reconnect
- Cap local storage at ~2GB

### 6. Update Recording Flow
Stop → save to IDB (instant) → preview with local blob → background Drive upload with progress → "Saved to Drive" ✓

### 7. Write Tests
- `drive.test.ts` — mock googleapis, test folder creation, resumable upload, deletion, permissions
- `useDriveUpload.test.ts` — upload triggers API, progress updates, error handling
- `idb.test.ts` — mock IndexedDB, test save/retrieve/upload status

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
# Manual: Record → saves to IDB instantly → upload progress → Drive folder has file → Postgres row has driveFileId → disconnect network → "Upload pending" → reconnect → upload completes → 100MB+ file uses resumable upload
```

---

<!-- PHASE 10 -->
# Phase 10 — Post-Recording Flow & Local-First Preview

## OBJECTIVE
Complete post-recording experience: instant preview from IndexedDB, background upload, save confirmation.

## INSTRUCTIONS

### 1. Preview Page (`src/app/(dashboard)/record/preview/page.tsx`)
- Video plays from IDB blob URL (instant)
- Editable title, duration/mode display
- Upload progress bar
- Buttons: Save to Library, Download, Discard (with confirmation)

### 2. Recordings CRUD API Routes
- `POST /api/recordings` — create metadata row
- `GET /api/recordings` — list user's recordings, paginated `?page=1&limit=20`
- `GET /api/recordings/[id]` — detail (public share access if valid token)
- `PATCH /api/recordings/[id]` — partial update
- `DELETE /api/recordings/[id]` — delete from Postgres + Drive + IDB

### 3. Zustand Store (`src/lib/stores/recording-store.ts`)
- Global state: config, state, blob, localId, uploadProgress, driveFileId
- Actions: setConfig, setBlob, startUpload, updateProgress, completeUpload, reset
- Persist preferences via zustand `persist` middleware

### 4. Write Tests
- `api/recordings.test.ts` — CRUD, auth, pagination, delete cascades
- `pages/preview.test.tsx` — video renders, title editing, progress display, discard

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
# Manual: Record → preview loads instantly → edit title → save → appears in library → download works → discard removes from IDB
```

---

<!-- PHASE 11 -->
# Phase 11 — Dashboard & Recording Library

## OBJECTIVE
Main dashboard with recording grid, thumbnails, metadata, search, sort, and detail page.

## INSTRUCTIONS

### 1. Library Page (`src/app/(dashboard)/library/page.tsx`)
- Grid of RecordingCards with search (debounced) and sort (Newest, Oldest, Longest, Shortest, Name A-Z)
- Empty state: "No recordings yet" + "Start Recording" button
- Pending uploads banner with "Sync Now"

### 2. RecordingCard Component (`src/components/library/RecordingCard.tsx`)
- Thumbnail (or placeholder gradient), title (editable on double-click), duration, relative time
- Status badges: upload status + AI status
- Context menu (⋯): Rename, Share, Download, Process with AI, Delete
- Click → `/library/[id]`

### 3. Recording Detail Page (`src/app/(dashboard)/library/[id]/page.tsx`)
- Large video player, editable title/description, metadata
- AI section placeholder (tabs: Info, Transcript, Summary, SOP + action items panel)
- "Generate AI Summary" button, share toggle, delete

### 4. Write Tests
- `RecordingCard.test.tsx` — metadata rendering, rename, context menu, status badges
- `library.test.tsx` — grid renders, search, sort, empty state, pagination

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
# Manual: Library shows cards, search/sort work, inline rename, delete removes card + Drive file, detail page loads with player
```

---

<!-- PHASE 12 -->
# Phase 12 — Verification Checkpoint #2 (Cloud + Library)

## OBJECTIVE
Full audit of phases 08-11.

## INSTRUCTIONS

### 1. Static Analysis + Tests
```bash
pnpm typecheck && pnpm lint && pnpm test
```

### 2. Auth Edge Cases
- [ ] Token expiry → auto-refresh without user error
- [ ] Refresh token revoked → forces re-login with clear message
- [ ] Multiple tabs → library updates on refresh
- [ ] Session expiry → redirects to login

### 3. Drive Upload Edge Cases
- [ ] Network disconnect mid-upload → graceful fail, stays in IDB, retry works
- [ ] Drive storage full → "Drive storage full" error (not generic)
- [ ] 500MB+ file → resumable upload with progress
- [ ] Concurrent uploads → both succeed, no race conditions
- [ ] Drive folder deleted → app recreates it

### 4. Library Edge Cases
- [ ] 100+ recordings → loads < 2s, pagination works
- [ ] 200-char title → truncates with ellipsis
- [ ] Deleted Drive file → "File not found" error (not blank)
- [ ] Delete + navigate away → delete still completes server-side

### 5. Video Playback
- [ ] Seeking via range requests works
- [ ] Both IDB blob and Drive proxy play correctly
- [ ] Mobile viewport responsive

### 6. Security
- [ ] All API routes check session auth
- [ ] Users can only access own recordings (userId check)
- [ ] Share tokens use `nanoid(21)` (cryptographically random)
- [ ] No sensitive data in client logs
- [ ] Drive tokens never sent to client

## VALIDATION GATE
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
# ALL edge cases pass
```

---

<!-- PHASE 13 -->
# Phase 13 — Thumbnail Generation

## OBJECTIVE
Auto-generate video thumbnails client-side from recording frames.

## INSTRUCTIONS

### 1. Thumbnail Generator (`src/lib/thumbnail.ts`)
- `generateThumbnail(blob, timeSeconds=2)` — hidden `<video>`, seek to 2s, draw frame on 480x270 canvas, export as JPEG 0.8 quality
- Handle short videos (<2s): capture at 0s
- Handle no video track: return placeholder with waveform icon

### 2. Integration
- Generate thumbnail after recording stops, save to IDB alongside recording
- Upload to Drive alongside recording, store `thumbnailDriveId` in DB

### 3. Thumbnail API Route (`src/app/api/recordings/[id]/thumbnail/route.ts`)
- Proxy from Drive with `Cache-Control: public, max-age=86400`
- No thumbnail → 302 to placeholder SVG

### 4. Update RecordingCard
- Show thumbnail from API, `next/image` with lazy loading, play icon overlay on hover

### 5. Write Tests
- `thumbnail.test.ts` — mock video/canvas, test JPEG output, short videos, cleanup

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
# Manual: Record → thumbnail on preview → thumbnails in library → stored in Drive
```

---

<!-- PHASE 14 -->
# Phase 14 — Audio Transcription

## OBJECTIVE
Transcribe recordings using OpenAI Whisper API with timestamped segments.

## INSTRUCTIONS

### 1. Audio Extraction (`src/lib/audio.ts`)
- `extractAudioFromVideo(videoBlob)` — ffmpeg if available (`ffmpeg -i input.webm -vn -acodec libopus -f ogg output.ogg`), otherwise send full WebM to Whisper (it accepts video files)

### 2. Transcription Service (`src/lib/transcription.ts`)

**OpenAI Whisper API:**
```typescript
import OpenAI from 'openai'
const openai = new OpenAI()  // reads OPENAI_API_KEY from env
```
- `openai.audio.transcriptions.create()` with model `whisper-1`
- `response_format: "verbose_json"`, `timestamp_granularities: ["segment"]`
- Parse into `TranscriptSegment[]`: `{ start, end, text }`
- Files > 25MB: split into 20-min chunks, transcribe each, merge with offset timestamps
- No speech → empty array, transcript = "(No speech detected)"
- Rate limited → retry with exponential backoff (3 attempts)

### 3. Transcription API Route (`src/app/api/recordings/[id]/transcribe/route.ts`)
- POST triggers transcription. Flow: verify ownership → set `aiStatus: "processing"` → fetch from Drive → extract audio → transcribe → store transcript JSON → set `aiStatus: "transcribed"` → return segments
- Async: return `202 Accepted`, process in background
- Status endpoint: `GET /api/recordings/[id]/transcribe/status`

### 4. Polling Hook (`src/hooks/useTranscriptionStatus.ts`)
- Polls every 3s while processing. Returns: `{ status, transcript, error, triggerTranscription }`

### 5. Write Tests
- `transcription.test.ts` — mock OpenAI Whisper response, segment parsing, no-speech handling, retry, large file chunking
- `api/transcribe.test.ts` — route creates transcript, auth check, 202 response

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
# Manual: Record 2 min with talking → trigger transcription → transcript with timestamps appears → silent recording → "(No speech detected)"
```

---

<!-- PHASE 15 -->
# Phase 15 — AI Summary, Action Items & SOP Generation

## OBJECTIVE
Send transcripts to OpenAI GPT-4o for structured summaries, action items, and SOP guides.

## INSTRUCTIONS

### 1. AI Service (`src/lib/ai.ts`)

Using the `openai` SDK (same package as Whisper):
```typescript
import OpenAI from 'openai'
const openai = new OpenAI()
```

#### `generateSummary(transcript, recordingTitle)`

**System prompt:**
```
You are an expert at analyzing screen recordings and meetings. You receive a transcript and produce three outputs:

1. SUMMARY: 2-4 paragraph summary of what happened. Focus on decisions, topics, key info. Past tense.

2. ACTION ITEMS: JSON array with "task", "assignee" (or "Unassigned"), "priority" (high/medium/low). Only genuine action items.

3. SOP GUIDE: Markdown step-by-step guide. Numbered steps, prerequisites at top. If meeting (not process/demo): "Not applicable - this is a meeting, not a process demonstration."

Respond in this exact JSON format:
{"summary": "...", "actionItems": [{"task": "...", "assignee": "...", "priority": "..."}], "sopGuide": "..."}
```

**Implementation:**
- `openai.chat.completions.create()` with model `gpt-4o`, `response_format: { type: "json_object" }`, max_tokens 4096, temperature 0.3
- Transcript > 100K tokens: chunk with overlap, summarize each, final pass
- Retry on 429 with backoff

### 2. AI Processing Route (`src/app/api/recordings/[id]/ai/route.ts`)
- POST triggers full pipeline: check transcript (trigger transcription if missing) → set processing → call generateSummary → store summary/actionItems/sopGuide in DB → set completed → return 202

### 3. AI Status Hook (`src/hooks/useAIStatus.ts`)
- Polls for transcription AND summary status
- States: `idle → transcribing → summarizing → completed | failed`

### 4. Update Recording Detail Page
- Tabs: Info, Transcript, Summary, SOP Guide
- Action Items panel below tabs with checkboxes, priority indicators, assignee badges
- "Generate AI Summary" button → spinner with status → "Regenerate" when complete

### 5. Write Tests
- `ai.test.ts` — mock OpenAI chat completions, JSON parsing, chunking, retry, malformed response
- `api/ai.test.ts` — pipeline sequence, auth, 202 response

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
# Manual: Open recording with transcript → Generate AI Summary → summary + action items + SOP appear → Regenerate works
```

---

<!-- PHASE 16 -->
# Phase 16 — Transcript Viewer with Timestamp Sync

## OBJECTIVE
Interactive transcript viewer synced with video player. Click sentence → video jumps. Current sentence highlights during playback.

## INSTRUCTIONS

### 1. TranscriptViewer Component (`src/components/player/TranscriptViewer.tsx`)
- Each segment: timestamp (`MM:SS`) + text
- Active segment highlighted (background color), auto-scrolls with `scroll-into-view` smooth
- Click segment → `onSegmentClick(segment.start)` → video seeks
- Hover: subtle background + play icon
- Copy button: copies full plain-text transcript to clipboard
- Optional search: highlight matching text with `<mark>` tags

### 2. VideoPlayer Component (`src/components/player/VideoPlayer.tsx`)
- Wraps `<video>` with standard controls
- `seekTo` prop → sets `video.currentTime`
- Fires `onTimeUpdate(currentTime)` throttled to 250ms
- Accepts blob URL or API proxy URL
- Space = play/pause, arrows = ±5s

### 3. Wire Up
```typescript
const [currentTime, setCurrentTime] = useState(0)
const [seekTo, setSeekTo] = useState<number | undefined>()
<VideoPlayer src={url} onTimeUpdate={setCurrentTime} seekTo={seekTo} />
<TranscriptViewer segments={transcript} currentTime={currentTime} onSegmentClick={setSeekTo} />
```

Side-by-side on desktop (≥1024px), stacked on mobile.

### 4. Write Tests
- `TranscriptViewer.test.tsx` — renders segments, highlights active, click seeks, copy works
- `VideoPlayer.test.tsx` — renders video, seekTo updates, onTimeUpdate fires

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
# Manual: Play video → transcript highlights and scrolls → click segment → video jumps → responsive layout
```

---

<!-- PHASE 17 -->
# Phase 17 — Verification Checkpoint #3 (AI Features)

## OBJECTIVE
Full audit of phases 13-16.

## INSTRUCTIONS

### 1. Static Analysis + Tests
```bash
pnpm typecheck && pnpm lint && pnpm test
```

### 2. AI Pipeline Edge Cases
- [ ] Silent recording → "(No speech detected)", summary handles gracefully
- [ ] < 5 second recording → transcription works or returns empty cleanly
- [ ] 30+ minute recording → Whisper chunking for 25MB limit, GPT-4o prompt chunking
- [ ] Non-English speech (German) → Whisper auto-detects and transcribes
- [ ] Background noise → transcription doesn't crash
- [ ] `OPENAI_API_KEY` missing → clear error, not crash
- [ ] API rate limit (429) → retry with backoff
- [ ] Malformed GPT-4o response → "AI processing failed, please retry"
- [ ] Concurrent AI requests on two recordings → both complete

### 3. Thumbnail Edge Cases
- [ ] No video track → placeholder shown
- [ ] < 2 second video → captures at 0s
- [ ] Large video → thumbnail generation doesn't OOM

### 4. Transcript Viewer Edge Cases
- [ ] Empty transcript → "No transcript available"
- [ ] 1000+ segments → efficient rendering (virtualize or paginate)
- [ ] Rapid seeking → highlight keeps up without jank

### 5. Performance
- Thumbnail generation < 3s
- 2-min transcription < 30s
- AI summary < 15s
- Video playback starts within 2s
- 500+ segments scroll smoothly

## VALIDATION GATE
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
# ALL edge cases pass
```

---

<!-- PHASE 18 -->
# Phase 18 — Public Sharing

## OBJECTIVE
Public sharing via unique URLs. Anyone with link views video, transcript, summary — no login.

## INSTRUCTIONS

### 1. Share Token Logic
- Toggle public: generate `nanoid(21)` share token, set `isPublic: true`, add "anyone with link" Drive permission
- Toggle private: set `isPublic: false`, remove Drive permission, keep token for re-enable

### 2. Share API Routes
- `POST /api/recordings/[id]/share` — `{ isPublic: boolean }`, toggles, returns share URL. Owner only.
- `GET /api/share/[token]` — public, returns RecordingDetail if public, 404 otherwise
- `GET /api/share/[token]/stream` — public video streaming. Use Drive `webContentLink` (public files accessible without auth). Range request support.

### 3. Public Viewer Page (`src/app/share/[token]/page.tsx`)
- No nav header. Video player, title, date, duration.
- Tabs: Transcript, Summary, SOP, Action Items (read-only)
- Footer: "Recorded with ScreenForge · Try it free"
- `<meta>` OG tags for link previews (title, thumbnail, summary excerpt)
- Responsive

### 4. Share Dialog (`src/components/library/ShareDialog.tsx`)
- Modal: visibility toggle (Private/Public), share link input + Copy button, explanation text
- Copy → toast "Link copied!"

### 5. Write Tests
- `api/share.test.ts` — toggle creates token + Drive permission, public returns data, private returns 404, stream serves video
- `pages/share.test.tsx` — renders video/tabs, no edit controls, meta tags
- `ShareDialog.test.tsx` — toggle, copy, link visibility

## VALIDATION GATE
```bash
pnpm typecheck
pnpm test
# Manual: Toggle public → copy URL → incognito plays video with transcript/summary → toggle private → incognito 404 → OG preview in Slack
```

---

<!-- PHASE 19 -->
# Phase 19 — Chrome Extension (Manifest V3)

## OBJECTIVE
Chrome Extension to record from any page. Injects floating record button, same engine, uploads to ScreenForge backend.

## INSTRUCTIONS

### 1. Extension Structure (`extension/` at project root)
```
extension/
├── manifest.json
├── src/
│   ├── background.ts          # Service worker
│   ├── content.ts             # Content script
│   ├── popup/popup.tsx        # React popup
│   ├── offscreen/offscreen.ts # MediaRecorder runs here (MV3 constraint)
│   ├── components/
│   │   ├── FloatingButton.tsx
│   │   └── MiniControlBar.tsx
│   └── lib/
│       ├── recorder.ts        # Core recording logic
│       ├── auth.ts            # Token management
│       └── upload.ts          # Upload to API
├── vite.config.ts
└── package.json
```

### 2. Manifest
Permissions: `storage`, `activeTab`, `offscreen`, `tabCapture`, `identity`. Host permissions for API domain.

### 3. Popup
Mode selector, audio device, Start/Stop, status, link to web library.

### 4. Auth
`chrome.identity.launchWebAuthFlow()` for Google OAuth. Store tokens in `chrome.storage.local`. Auto-refresh.

### 5. Recording Flow
Popup Start → background creates offscreen document → `chrome.tabCapture.getMediaStreamId()` → offscreen runs MediaRecorder → content script injects MiniControlBar (Shadow DOM, draggable) → control via `chrome.runtime.sendMessage()` → stop → blob to background → upload to API

### 6. MiniControlBar
Shadow DOM (isolated CSS). Same as web control bar: `🔴 00:04:32 | ⏸ | ⏹ | ─`. Draggable, collapsible.

### 7. Build
Vite bundled. Output: `extension/dist/`. Sideload via `chrome://extensions` → Load unpacked.

### 8. Write Tests
- `recorder.test.ts` — offscreen messaging, chunk collection
- `auth.test.ts` — token storage, refresh
- `upload.test.ts` — API upload, progress

## VALIDATION GATE
```bash
cd extension && pnpm typecheck && pnpm test && pnpm build
# Manual: Sideload → sign in → navigate to any site → record → control bar on page → pause/resume/stop → recording in web library
```

---

<!-- PHASE 20 -->
# Phase 20 — Final Verification & E2E Tests

## OBJECTIVE
Complete E2E testing, polish, production readiness.

## INSTRUCTIONS

### 1. Static Analysis
```bash
pnpm typecheck && pnpm lint && pnpm build
```

### 2. Playwright E2E Tests (`e2e/`)
- `auth.spec.ts` — redirect flow, sign in/out
- `recording.spec.ts` — mode selection, countdown, control bar, pause/resume, stop, preview, download, save
- `library.spec.ts` — grid, search, sort, rename, delete
- `ai-pipeline.spec.ts` — generate summary, transcript click → seek
- `sharing.spec.ts` — toggle public → share URL works unauthenticated → toggle private → 404
- `responsive.spec.ts` — mobile (375x667), tablet (768x1024), desktop (1440x900)

### 3. Run E2E
```bash
pnpm test:e2e
```

### 4. Lighthouse
- Performance > 85, Accessibility > 90, Best Practices > 90, SEO > 80

### 5. Bundle Size
- First Load JS < 200kB
- `googleapis` NOT in client bundle (server-only)

### 6. Security Final
- [ ] All API routes validate session + resource ownership
- [ ] No secrets in client code
- [ ] CORS for extension origin
- [ ] Rate limiting on upload + AI endpoints
- [ ] Input sanitization (no XSS)
- [ ] Share tokens cryptographically random
- [ ] Drive tokens encrypted at rest

### 7. Documentation
- `README.md` — overview, setup, dev commands, extension sideloading, deployment
- `DEPLOYMENT.md` — Vercel config, Railway setup, Google Cloud Console, env checklist

### 8. Production Config
- `next.config.js`: `images.remotePatterns`, security headers (CSP, HSTS, X-Frame-Options)

### 9. Final Manual Walkthrough
1. Fresh sign up → 2. Record 3 min with audio → 3. Preview + save → 4. Upload to Drive → 5. Generate AI summary → 6. Read transcript, click timestamps → 7. Share publicly, verify in incognito → 8. Unshare → 9. Delete, verify Drive cleanup → 10. Chrome Extension record from random site → 11. Verify in library

## VALIDATION GATE
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build
# Lighthouse meets targets. Security checklist complete. Full walkthrough passes.
```

## 🎉 DONE — Deploy with `vercel --prod`
