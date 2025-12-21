# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

InBrowserVideoComposer is a 100% client-side Next.js app for creating looping slideshow videos with custom frames and transitions. All video rendering happens in the browser using Canvas API and MediaRecorder - no server-side processing.

## Commands

### Development
```bash
npm run dev          # Start development server (auto-finds port 7777-7800)
npm run dev:simple   # Start on port 7777 only (no auto-detection)
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check (no emit)
```

**Port Configuration:**
- Default: Auto-detects available port in range 7777-7800
- The server will use the first available port starting from 7777
- Useful when running multiple projects simultaneously

### Environment Setup
```bash
cp .env.example .env.local
```

Required environment variables:
- `MONGODB_URI` - MongoDB Atlas connection string for project persistence
- `IMGBB_API_KEY` - imgbb API key for image uploads (server-side)
- `NEXT_PUBLIC_IMGBB_API_KEY` - imgbb API key (client-side, optional)

## Architecture

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (strict mode)
- **Rendering**: HTMLCanvasElement + CanvasRenderingContext2D
- **Video Export**: MediaRecorder API (WebM primary), ffmpeg.wasm 0.12.15 (MP4/MOV)
- **Database**: MongoDB Atlas with native MongoDB driver
- **Image Storage**: imgbb API
- **Styling**: Tailwind CSS

### Two-Stage Rendering Pipeline

The app uses a unique two-stage rendering approach with a composite image pattern:

**Stage 1 (Slideshow Canvas)**
- Dimensions defined by Frame #1 PNG overlay
- For each frame, creates composite images (cover-fit image + Frame #1 overlay)
- Transitions applied between composite images (not raw images)
- **Important**: Frame #1 is baked into each composite before transitions
- Supports wipe/push/pull/swipe transitions with 4 directions each

**Stage 2 (Final Composition)** (Optional)
- Dimensions defined by Frame #2 PNG overlay (typical: 1920x1080)
- Stage-1 canvas drawn with user transform (x, y, scale)
- Frame #2 overlay drawn on top (with alpha transparency)
- This canvas is captured via MediaRecorder for video export
- If Frame #2 not provided, exports Stage-1 directly

### Key Algorithms

**Cover Fit** (`src/canvas/fit.ts`)
Scales images to fill canvas while maintaining aspect ratio:
```typescript
const scale = Math.max(canvasW / imgW, canvasH / imgH)
drawW = imgW * scale
drawH = imgH * scale
drawX = (canvasW - drawW) / 2
drawY = (canvasH - drawH) / 2
```

**Transitions** (`src/canvas/transitions.ts`)
Four transition types, each with 4 directions (left/right/up/down):
- **Wipe**: Next image reveals through moving clip rectangle
- **Push**: Next image pushes current image out
- **Pull**: Current image moves away revealing next
- **Swipe**: Alias for push

**Timeline Logic** (`src/canvas/renderFrame.ts`)
- Loop images to fill total duration (default 30s @ 30fps)
- Calculate current/next image indices and transition progress
- Transition progress: `(cycleTime - holdTime) / transitionTime` normalized to [0,1]

### Directory Structure

```
app/
├── page.tsx              # Project list homepage
├── editor/page.tsx       # Main editor interface (client component)
├── types.ts              # TypeScript interfaces for Project, Transition, etc.
└── api/
    ├── project/route.ts  # All CRUD operations (GET, POST, PUT, DELETE)
    └── imgbb/route.ts    # Proxy for imgbb uploads

src/
├── canvas/
│   ├── fit.ts            # Cover-fit algorithm
│   ├── transitions.ts    # Transition implementations
│   └── renderFrame.ts    # Frame rendering logic with timeline
├── media/
│   ├── recordWebM.ts     # MediaRecorder wrapper for WebM export
│   └── transcodeMp4.ts   # ffmpeg.wasm 0.12.15 for MP4/MOV transcoding
└── lib/
    ├── projectApi.ts     # Client API for project CRUD
    ├── imgbbApi.ts       # Image upload utilities
    └── featureDetect.ts  # Browser capability detection

lib/
└── mongodb.ts            # MongoDB connection singleton

models/
└── Project.ts            # Mongoose schema for Project
```

### Path Aliases

TypeScript path aliases are configured in `tsconfig.json`:
- `@/*` → `./src/*`
- `@/app/*` → `./app/*`

### Data Model

The core `Project` interface (`app/types.ts`) includes:
- `images[]` - Array of uploaded images with order, dimensions, URLs
- `frame1Url`, `frame1W`, `frame1H` - Stage-1 frame overlay
- `frame2Url`, `frame2W`, `frame2H` - Stage-2 frame overlay
- `transition` - Type (wipe/push/pull/swipe), direction, durationMs
- `transform` - Stage-1 position in Stage-2 (x, y, scale)
- `export` - durationSeconds (default 30), fps (default 30)

### MongoDB Pattern

**Important**: API routes use native MongoDB driver, not Mongoose
- Direct use of `MongoClient` and `ObjectId` from `mongodb` package
- Connection singleton in `app/api/project/route.ts`
- All CRUD operations in single route file
- Note: `models/Project.ts` and `lib/mongodb.ts` exist but are unused (Mongoose remnants)

### Video Export Flow

**WebM Export** (Primary):
1. User configures project (images, frames, transitions, transform)
2. Creates MediaRecorder on `canvas.captureStream(fps)`
3. Render loop draws each frame sequentially:
   - Stage 1: Creates composite images with transitions
   - Stage 2 (if Frame #2): Applies transform and final overlay
4. MediaRecorder collects chunks and produces WebM blob
5. Uses best available codec: vp9 > vp8 > webm

**MP4/MOV Conversion** (Secondary):
1. Loads ffmpeg.wasm 0.12.15 from CDN
2. Writes WebM blob to virtual filesystem
3. Transcodes to MP4 (H.264) or MOV with:
   - Codec: libx264, preset: medium, CRF: 23
   - AAC audio at 128k (though no audio in slideshow)
4. Progress tracking: 0-10% load, 10-90% transcode, 90-100% finalize
5. Returns converted blob for download

### Client-Side Only Architecture

**Important**: All rendering and video encoding happens client-side:
- No server compute for video processing
- Large operations may be slow but are acceptable
- Desktop-first design (mobile support limited)
- Assets stored externally (imgbb) to avoid server storage

### Browser Requirements

- MediaRecorder API (WebM export)
- Canvas API (rendering)
- createImageBitmap (image decoding)
- Recommended: Chrome, Firefox, Edge (desktop)

## Development Guidelines

### When Adding Features

1. **Reuse existing components** - Check `src/canvas/`, `src/media/`, `src/lib/` before creating new utilities
2. **Follow two-stage architecture** - Stage-1 for slideshow, Stage-2 for final composition
3. **Client-side only** - Never add server-side video processing
4. **Path aliases** - Use `@/*` for src imports, `@/app/*` for app imports
5. **Type safety** - All interfaces in `app/types.ts`, Mongoose schemas in `models/`

### Working with Canvas

**Composite Image Pattern** (Critical):
- Stage-1 creates composite images (image + Frame #1 overlay) BEFORE transitions
- Transitions are applied to composite images, not raw images
- This ensures Frame #1 overlay moves with transitions correctly

**Canvas Hierarchy**:
- Stage-1 canvas dimensions: Frame #1 width/height
- Stage-2 canvas dimensions: Frame #2 width/height (or Stage-1 if no Frame #2)
- Preview uses hidden Stage-1 canvas for intermediate rendering
- Final export canvas captures either Stage-1 or Stage-2 output

**Rendering Order**:
1. Create composite: cover-fit image + Frame #1 overlay
2. Apply transition between current and next composites
3. If Frame #2: draw Stage-1 with transform into Stage-2
4. If Frame #2: draw Frame #2 overlay on top

### MongoDB Operations

- Use native MongoDB driver (not Mongoose)
- Single connection singleton in `app/api/project/route.ts`
- All operations in one route file using query param `?id=xxx` for single resource
- Auto-generate `createdAt`, `updatedAt` timestamps in ISO format
- Default values defined in API route, not schema

### Image Uploads

- Images uploaded to imgbb via `/api/imgbb` proxy or direct client-side
- Store returned URLs in project.images array
- Dimensions extracted via `createImageBitmap` or Image.onload

## Current Status

**ALL MILESTONES COMPLETE** ✅
- M1: Upload + Reorder + Persist ✅
- M2: Stage-1 Render + Frame #1 Overlay ✅
- M3: Transitions + Loop Preview ✅
- M4: Stage-2 Composition ✅
- M5: Export WebM ✅
- M6: MP4/MOV Export via ffmpeg.wasm ✅

All features fully functional:
- Multi-image upload with reordering and removal
- Frame #1 and Frame #2 overlays (both optional)
- All four transition types (wipe/push/pull/swipe) with 4 directions each
- Live preview with play/pause and preview mode toggle
- WebM video export with codec detection
- MP4/MOV conversion with progress tracking
- Composite image rendering pattern
- Responsive timeline with auto-adjusting transitions

Default output: 1920x1080 @ 30fps, 30-second videos (all configurable)
