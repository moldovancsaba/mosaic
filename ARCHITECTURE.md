# Architecture Documentation

**Project:** InBrowserVideoComposer (Mosaic)
**Version:** 1.0.0
**Last Updated:** 2025-12-21T13:57:36.000Z

## System Overview

InBrowserVideoComposer is a 100% client-side Next.js application that creates looping slideshow videos with custom frame overlays and transitions. All video rendering happens in the browser using Canvas API and MediaRecorder - no server-side processing.

## Technology Stack

### Frontend
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript (strict mode)
- **UI Library:** React 18
- **Styling:** Tailwind CSS 4.1.18
- **Runtime:** Node.js 20+

### Rendering & Export
- **Canvas Rendering:** HTMLCanvasElement + CanvasRenderingContext2D
- **Video Capture:** MediaRecorder API (WebM primary)
- **Video Transcoding:** ffmpeg.wasm 0.12.15 (MP4/MOV optional)
- **Image Loading:** Image API with retry logic + CORS handling

### Data & Storage
- **Project Database:** MongoDB Atlas (native MongoDB driver 6.21.0)
- **Image Storage:** imgbb API (external CDN)
- **State Management:** React hooks (useState, useEffect, useRef)

### Security & CORS
- **Cross-Origin-Embedder-Policy:** require-corp
- **Cross-Origin-Opener-Policy:** same-origin
- **Required for:** SharedArrayBuffer support (ffmpeg.wasm)

## Core Architecture: Two-Stage Rendering Pipeline

### Stage 1: Slideshow Canvas
**Purpose:** Create composite slideshow with Frame #1 overlay
**Dimensions:** Defined by Frame #1 PNG dimensions
**Process:**
1. For each frame, create composite image (cover-fit image + Frame #1 overlay)
2. Apply transitions between composite images (NOT raw images)
3. Render to hidden Stage-1 canvas

**Critical Pattern:** Frame #1 is baked into each composite BEFORE transitions are applied. This ensures the overlay moves correctly with transition effects.

### Stage 2: Final Composition (Optional)
**Purpose:** Position slideshow within larger frame with Frame #2 overlay
**Dimensions:** Defined by Frame #2 PNG dimensions (typically 1920x1080)
**Process:**
1. Draw Stage-1 canvas output with user transform (x, y, scale)
2. Apply Frame #2 overlay on top (with alpha transparency)
3. This canvas is captured for video export

**If Frame #2 not provided:** Exports Stage-1 output directly

## Component Architecture

### App Routes (Next.js App Router)

#### `app/page.tsx`
**Role:** Project list homepage
**Type:** Client component
**Responsibilities:**
- List all projects from MongoDB
- Create new projects
- Delete projects
- Navigate to editor

#### `app/editor/page.tsx`
**Role:** Main editor interface
**Type:** Client component
**Dependencies:**
- Canvas rendering modules
- Media export modules
- Project API
- Image loader
**Responsibilities:**
- Multi-image upload and management
- Frame #1 and Frame #2 upload
- Transition configuration
- Live preview rendering
- Video export (WebM/MP4/MOV)

#### `app/layout.tsx`
**Role:** Root layout wrapper
**Responsibilities:**
- HTML structure
- Global CSS imports
- Metadata configuration

### API Routes (Server-Side)

#### `app/api/project/route.ts`
**Role:** Project CRUD operations
**Status:** Active, single-file pattern
**Methods:**
- GET (all projects or single by ID)
- POST (create new project)
- PUT (update project)
- DELETE (remove project)
**Database:** Native MongoDB driver (NOT Mongoose)
**Connection:** Singleton pattern with connection pooling

#### `app/api/imgbb/route.ts`
**Role:** Image upload proxy
**Purpose:** Hide imgbb API key from client
**Process:**
1. Receive image from client
2. Convert to base64
3. Upload to imgbb API
4. Return public URL and metadata

### Canvas Rendering Modules

#### `src/canvas/fit.ts`
**Role:** Image fitting algorithms
**Functions:**
- `fitCover()` - Scale image to fill canvas (maintains aspect ratio)
- `fitContain()` - Scale image to fit within canvas
**Algorithm (cover):**
```typescript
scale = Math.max(canvasW / imgW, canvasH / imgH)
drawW = imgW * scale
drawH = imgH * scale
drawX = (canvasW - drawW) / 2
drawY = (canvasH - drawH) / 2
```

#### `src/canvas/transitions.ts`
**Role:** Transition effect implementations
**Types:** wipe, push, pull, swipe (4 types × 4 directions = 16 variations)
**Functions:**
- `applyWipeTransition()` - Reveal next via moving clip rect
- `applyPushTransition()` - Next pushes current out
- `applyPullTransition()` - Current moves away revealing next
- `applyTransition()` - Router function for all types
**Input:** Composite images (NOT raw images)

#### `src/canvas/renderFrame.ts`
**Role:** Frame rendering and timeline logic
**Functions:**
- `calculateTimelineState()` - Determine current/next image and transition progress
- `calculateTimingInfo()` - Calculate hold times and cycle duration
- `createCompositeImage()` - Create image + Frame #1 composite (private)
- `renderStage1Frame()` - Render slideshow frame to Stage-1 canvas
- `renderFinalFrame()` - Render final composition with Stage-2
**Dependencies:** fit.ts, transitions.ts

### Media Export Modules

#### `src/media/recordWebM.ts`
**Role:** WebM video export via MediaRecorder
**Status:** Unused (logic inline in editor)
**Note:** Could be extracted for better organization

#### `src/media/transcodeMp4.ts`
**Role:** MP4/MOV conversion via ffmpeg.wasm
**Functions:**
- `canTranscodeToMp4()` - Check browser support (SharedArrayBuffer)
- `loadFFmpeg()` - Lazy load ffmpeg.wasm from CDN
- `transcodeWebMToMp4()` - Convert WebM blob to MP4/MOV
- `getEstimatedOutputSize()` - Estimate output file size
**Requirements:** SharedArrayBuffer, WebAssembly, HTTPS/localhost
**Progress Stages:** 0-10% load, 10-90% transcode, 90-100% finalize

### Utility Modules

#### `src/lib/imageLoader.ts`
**Role:** Robust image loading with retry logic
**Functions:**
- `loadImageWithRetry()` - Load single image with retry + timeout
- `loadImagesWithRetry()` - Load multiple images in parallel
- `loadImagesSequentially()` - Load images one at a time (fallback)
- `isImageAccessible()` - Check if image URL is accessible
**Features:**
- Exponential backoff retry
- CORS handling (crossOrigin: 'anonymous')
- 30-second timeout per attempt
- Progress callbacks

#### `src/lib/projectApi.ts`
**Role:** Client-side project API wrapper
**Status:** Referenced but may be unused (direct fetch in editor)

#### `src/lib/imgbbApi.ts`
**Role:** Image upload utilities
**Status:** Referenced but may be unused (direct fetch in editor)

### Database Schema

#### Projects Collection
**Database:** video-composer
**Collection:** projects
**Driver:** Native MongoDB (NOT Mongoose)

**Schema:**
```typescript
{
  _id: ObjectId,
  name: string,
  version: string, // Application version (for compatibility tracking)
  images: Array<{
    url: string,
    order: number,
    width: number,
    height: number
  }>,
  frame1Url: string,
  frame1W: number,
  frame1H: number,
  frame2Url: string,
  frame2W: number,
  frame2H: number,
  transition: {
    type: 'wipe' | 'push' | 'pull' | 'swipe',
    direction: 'left' | 'right' | 'up' | 'down',
    durationMs: number
  },
  transform: {
    x: number,
    y: number,
    scale: number
  },
  export: {
    durationSeconds: number,
    fps: number
  },
  createdAt: string, // ISO 8601 with milliseconds UTC
  updatedAt: string  // ISO 8601 with milliseconds UTC
}
```

**Defaults:**
- transition.type: 'wipe'
- transition.direction: 'right'
- transition.durationMs: 500
- transform: { x: 0, y: 0, scale: 1 }
- export: { durationSeconds: 30, fps: 30 }

### Removed Components (Technical Debt Cleanup)

#### `models/Project.ts` (REMOVED v1.0.0)
**Previous Status:** Mongoose schema, unused
**Action:** Removed in v1.0.0 - native MongoDB driver is sufficient for MVP
**Rationale:** Reduces confusion, removes unused dependency

#### `lib/mongodb.ts` (REMOVED v1.0.0)
**Previous Status:** Mongoose connection singleton, unused
**Action:** Removed in v1.0.0 - native driver uses inline connection
**Rationale:** Simplifies codebase, one less abstraction layer

#### `mongoose` npm package (REMOVED v1.0.0)
**Previous Status:** Listed as dependency but never used
**Action:** Removed from package.json in v1.0.0
**Rationale:** Reduces bundle size, eliminates unused code

## Data Flow

### Image Upload Flow
1. User selects images → Client
2. Client uploads to `/api/imgbb` → Server
3. Server converts to base64 → imgbb API
4. imgbb returns public URL + metadata → Server
5. Server returns data → Client
6. Client saves URLs to MongoDB via `/api/project` → Database
7. Client loads images with retry logic → Preview

### Video Export Flow (WebM)
1. User configures project (images, frames, transitions, transform)
2. Client creates MediaRecorder on `canvas.captureStream(fps)`
3. Render loop:
   - For each frame (0 to totalFrames):
     - Calculate timeline state (current/next image, transition progress)
     - Render Stage-1: Create composites + apply transitions
     - If Frame #2: Render Stage-2 with transform + overlay
     - MediaRecorder captures frame from canvas
4. MediaRecorder collects chunks → WebM blob
5. Client creates download link

### Video Conversion Flow (MP4/MOV)
1. User requests MP4/MOV conversion
2. Check SharedArrayBuffer support
3. Load ffmpeg.wasm from CDN (lazy)
4. Write WebM blob to virtual filesystem
5. Execute ffmpeg transcode command (H.264, AAC)
6. Read output file from virtual filesystem
7. Create download link

## Timeline & Rendering Logic

### Timeline Calculation
**Goal:** Determine which image to show and transition progress at any frame

**Algorithm:**
1. Calculate time per cycle: `(durationSeconds / imageCount)`
2. Subtract transition time: `holdTime = timePerCycle - transitionTime`
3. For current frame: `currentTime = frameNumber / fps`
4. Find cycle: `cycleIndex = floor(currentTime / timePerCycle)`
5. Find position in cycle: `cycleTime = currentTime % timePerCycle`
6. If `cycleTime >= holdTime`: transitioning to next image
7. Progress: `(cycleTime - holdTime) / transitionTime` (0 to 1)

**Edge Case:** If total transition time exceeds duration, adjust to use 50% of time per image for transitions

### Composite Image Pattern
**Why:** Ensures Frame #1 overlay moves correctly with transitions

**Process:**
1. Create temporary canvas (frame1W × frame1H)
2. Draw cover-fit image
3. Draw Frame #1 overlay on top
4. Use this composite in transition functions
5. Transitions blend between composites (not raw images)

**Benefit:** Frame overlays participate in transition animations naturally

## Browser Requirements

### Minimum Requirements
- MediaRecorder API (WebM export)
- Canvas API (rendering)
- Image API with CORS support
- ES6+ JavaScript support

### Optional Requirements (MP4/MOV)
- SharedArrayBuffer support
- WebAssembly support
- HTTPS or localhost (for COEP/COOP headers)

### Recommended Browsers
- Chrome/Edge 88+ (desktop) ✅ Full support
- Firefox 78+ (desktop) ✅ Full support
- Safari 15.2+ (desktop) ✅ Full support with COEP/COOP
- Mobile browsers ⚠️ Limited support (desktop-first design)

## Performance Characteristics

### Client-Side Processing
**Implication:** All rendering and encoding happens in browser
**Advantage:** No server compute costs, unlimited concurrent users
**Disadvantage:** Slow on older hardware, memory-intensive

### Export Duration
**Typical:** 30-second video takes 30-60 seconds to render (WebM)
**MP4 Conversion:** Additional 60-120 seconds for transcoding
**Acceptable:** MVP prioritizes functionality over speed

### Memory Usage
**Stage-1 Canvas:** frame1W × frame1H × 4 bytes (RGBA)
**Stage-2 Canvas:** frame2W × frame2H × 4 bytes (RGBA)
**Typical (1080p):** ~8MB per canvas, ~16MB total
**Images:** Loaded as HTMLImageElement (browser-managed memory)

## Security Considerations

### API Keys
- imgbb API key stored in server environment variables
- Never exposed to client
- Proxied through `/api/imgbb` route

### CORS Configuration
- Required for imgbb image loading
- crossOrigin: 'anonymous' on all Image elements
- imgbb serves images with CORS headers

### MongoDB Connection
- Connection string in server environment only
- Native driver with connection pooling
- Auto-reconnect on connection loss

## Deployment Architecture

### Vercel Deployment
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Node Version:** 20+
- **Environment Variables:** MONGODB_URI, IMGBB_API_KEY

### Environment Variables Required
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/video-composer
IMGBB_API_KEY=your_imgbb_api_key_here
```

### CORS Headers (next.config.js)
```javascript
headers: [
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }
]
```
**Purpose:** Enable SharedArrayBuffer for ffmpeg.wasm

## Component Dependencies

### Editor Component Dependencies
- Canvas rendering: fit.ts, transitions.ts, renderFrame.ts
- Media export: transcodeMp4.ts
- Data: MongoDB via API routes
- Images: imgbb via API route, imageLoader.ts

### Rendering Module Dependencies
- renderFrame.ts → fit.ts, transitions.ts
- transitions.ts → (no dependencies)
- fit.ts → (no dependencies)

### API Route Dependencies
- project/route.ts → MongoDB native driver
- imgbb/route.ts → fetch (built-in)

## Future Architecture Considerations

### Potential Optimizations
1. Web Workers for canvas rendering (offload from main thread)
2. OffscreenCanvas for background rendering (when browser support improves)
3. Image preloading strategy (lazy load based on timeline)
4. Chunk-based rendering (render in segments to reduce memory)

### Potential Migrations
1. Mongoose integration (if stricter schema validation needed)
2. Server-side rendering (if SEO becomes important)
3. Database caching layer (if project list grows large)
4. CDN for static assets (if performance becomes critical)

### Scalability Notes
- **Current:** Unlimited concurrent users (client-side rendering)
- **Bottleneck:** imgbb API rate limits (hosting dependent)
- **Alternative:** Self-hosted image storage (S3, Cloudflare R2)

## Status

**Architecture Status:** Stable ✅
**All Components:** Implemented and functional ✅
**Production Ready:** Yes ✅

**Last Architectural Change:** 2025-12-18 (ffmpeg.wasm Safari compatibility)
**Next Review:** When adding new major features or migrating infrastructure
