# InBrowserVideoComposer - Project Specification

## Objective
Build a 100% in-browser Next.js (App Router) web app that:
1. Uploads 10+ images
2. Applies Frame #1 to create a looping slideshow with selectable transitions
3. Places/scales that slideshow inside Frame #2
4. Exports a 1080p 30s video

**Primary export:** WebM via MediaRecorder  
**Optional export:** MP4 (H.264) via ffmpeg.wasm transcoding

## Constraints
- **Rendering:** Client-only
- **Server compute:** None
- **Hosting:** Vercel
- **Database:** MongoDB Atlas
- **Image storage:** ImgBB API
- **Target resolution:** 1920x1080
- **FPS:** 30
- **Default duration:** 30 seconds
- **Render speed:** Slow acceptable
- **Output alpha:** Not required

## Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **UI:** React
- **Rendering:** HTMLCanvasElement, CanvasRenderingContext2D
- **Background processing:** Web Worker, OffscreenCanvas (when supported)
- **Video capture:** MediaRecorder
- **Video transcode (optional):** ffmpeg.wasm
- **Storage (images):** ImgBB
- **Storage (state):** MongoDB Atlas
- **Hosting:** Vercel
- **Version control:** GitHub

## Export Strategy

### Primary Export
- **Format:** WebM
- **Method:** MediaRecorder
- **MIME priority:** 
  1. `video/webm;codecs=vp9`
  2. `video/webm;codecs=vp8`
  3. `video/webm`
- **Notes:** Use MediaRecorder.isTypeSupported to pick the best available

### Secondary Export (Optional)
- **Format:** MP4
- **Codec:** H.264
- **Method:** ffmpeg.wasm
- **Input:** WebM blob
- **Notes:** Offer as a slower compatibility option; show progress UI

## User Flow
1. Upload images (10+), preview thumbnails, reorder via drag/drop
2. Upload Frame #1 PNG (transparent). This defines Stage-1 dimensions
3. Configure transitions: type (wipe/push/pull/swipe), direction (L/R/U/D), transition duration (ms), slide hold policy
4. Preview looping slideshow with Frame #1 applied
5. Upload Frame #2 PNG (transparent). This defines final output dimensions (target 1080p)
6. Set slideshow placement inside Frame #2: x, y, scale via drag/handles + numeric inputs
7. Set export length (seconds)
8. Export WebM. Optionally transcode to MP4 and download
## Data Model

### Project Schema
```typescript
interface Project {
  id: string;
  images: Array<{
    url: string;
    order: number;
    width: number;
    height: number;
  }>;
  frame1Url: string;
  frame1W: number;
  frame1H: number;
  frame2Url: string;
  frame2W: number;
  frame2H: number;
  transition: {
    type: 'wipe' | 'push' | 'pull' | 'swipe';
    direction: 'left' | 'right' | 'up' | 'down';
    durationMs: number;
  };
  transform: {
    x: number;
    y: number;
    scale: number;
  };
  export: {
    durationSeconds: number;
    fps: number;
  };
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}
```

## Next.js Structure

### App Routes
- `app/page.tsx` - Project list / new project
- `app/editor/page.tsx` - Main editor (use client)
- `app/export/page.tsx` - Export UI (use client)
- `app/api/project/route.ts` - CRUD project metadata in MongoDB Atlas
- `app/api/imgbb/route.ts` - Optional: proxy imgbb uploads; or do direct from client

### Source Modules
- `src/workers/renderer.worker.ts`
- `src/canvas/fit.ts`
- `src/canvas/transitions.ts`
- `src/canvas/renderFrame.ts`
- `src/media/recordWebM.ts`
- `src/media/transcodeMp4.ts`
- `src/lib/projectApi.ts`
- `src/lib/imgbbApi.ts`
- `src/lib/featureDetect.ts`

## Feature Detection
- **OffscreenCanvas:** `typeof OffscreenCanvas !== 'undefined'`
- **MediaRecorder:** `typeof MediaRecorder !== 'undefined'`
- **MIME Support:** `MediaRecorder.isTypeSupported(mime)`
- **Web Worker:** `typeof Worker !== 'undefined'`
- **ffmpeg.wasm:** Lazy load only when MP4 requested

## Rendering Pipeline

### Overview
Single-pass per output frame (no intermediate video). Draw Stage-1 into final canvas every frame, then record.

### Stage 1
- **Dimensions:** frame1W x frame1H
- **Image fit:** Cover (CSS background-size: cover equivalent)
- **Overlay:** frame1 PNG drawn on top

### Stage 2
- **Dimensions:** frame2W x frame2H
- **Place Stage-1:** Draw Stage-1 output into final canvas with user transform (x,y,scale)
- **Overlay:** frame2 PNG drawn on top

### Per-Frame Draw Order
1. Compute timeline state (currentIndex, nextIndex, transitionProgress 0..1)
2. Render Stage-1 base: current image cover-fit to frame1 canvas
3. If in transition: blend to next via transition geometry
4. Draw Frame #1 overlay (alpha)
5. Clear final canvas; draw Stage-1 canvas into final canvas at transform (x,y,scale)
6. Draw Frame #2 overlay (alpha)
## Timing Model
- **FPS:** 30
- **Total Frames:** durationSeconds * fps
- **Slide Duration Policy:**
  - **Default:** Auto
  - **Auto:** durationSeconds / imageCount (minus transition time per slide)
  - **Alternative:** Fixed seconds per slide (user input)
- **Looping:** Repeat image sequence until totalFrames reached; wrap indices using modulo

## Transition Specifications

### Common Properties
- **Progress:** p in [0,1] computed from transition frames
- **Direction Vectors:**
  - Left: { x: -1, y: 0 }
  - Right: { x: 1, y: 0 }
  - Up: { x: 0, y: -1 }
  - Down: { x: 0, y: 1 }

### Wipe Transition
**Description:** Reveal next image using moving clip rect
**Pseudocode:**
1. Draw current full
2. ctx.save()
3. Set clip rect based on p and direction
4. Draw next full
5. ctx.restore()

**Clip Rect Math:**
- Left: `clip = rect(w*(1-p), 0, w*p, h)`
- Right: `clip = rect(0, 0, w*p, h)`
- Up: `clip = rect(0, h*(1-p), w, h*p)`
- Down: `clip = rect(0, 0, w, h*p)`

### Push Transition
**Description:** Next image pushes current out; both translate
**Pseudocode:**
1. `dx = dir.x * w * p; dy = dir.y * h * p`
2. Draw current at (-dx, -dy)
3. Draw next at (dir.x*w - dx, dir.y*h - dy)

### Pull Transition
**Description:** Current moves away revealing next (inverse feel)
**Pseudocode:**
1. `dx = dir.x * w * p; dy = dir.y * h * p`
2. Draw next at (0,0)
3. Draw current at (-dx, -dy)

### Swipe Transition
**Description:** Alias to push for clarity
**Recommended Definition:** swipe == push

## Fit Cover Algorithm
**Inputs:** imgW, imgH, canvasW, canvasH
**Outputs:** drawX, drawY, drawW, drawH
**Pseudocode:**
1. `scale = max(canvasW/imgW, canvasH/imgH)`
2. `drawW = imgW * scale`
3. `drawH = imgH * scale`
4. `drawX = (canvasW - drawW)/2`
5. `drawY = (canvasH - drawH)/2`

## Worker Design

### Goal
Keep UI responsive by moving decode + stage-1 rendering into worker where possible.

### Messages Main to Worker
- `{ type: "INIT", payload: "frame1W,H; transition config; fps; durations" }`
- `{ type: "LOAD_ASSETS", payload: "image blobs/urls; frame1 bitmap; frame2 bitmap" }`
- `{ type: "SET_TRANSFORM", payload: "x,y,scale" }`
- `{ type: "PLAY_PREVIEW", payload: "start/stop" }`

### Messages Worker to Main
- `{ type: "READY", payload: "decoded asset counts" }`
- `{ type: "FRAME", payload: "optional ImageBitmap for stage-1 or draw instructions" }`
- `{ type: "ERROR", payload: "string" }`

**Notes:** If OffscreenCanvas not supported, keep all rendering on main thread and only use worker for image decoding.
## Recording Design

### Method
MediaRecorder on captureStream

### Pseudocode
1. `stream = canvas.captureStream(fps)`
2. `mime = pickSupportedMime(mime_priority)`
3. `recorder = new MediaRecorder(stream, { mimeType: mime })`
4. `chunks = []`
5. `recorder.ondataavailable = (e) => chunks.push(e.data)`
6. `recorder.start(timesliceMs)`
7. Run render loop for durationSeconds (requestAnimationFrame / setInterval synced to fps)
8. `recorder.stop()`
9. `webmBlob = new Blob(chunks, { type: mime })`

**TimesliceMs:** 250

## MP4 Transcode Design

### Trigger
User click MP4 export

### Pseudocode
1. Load ffmpeg.wasm lazily
2. Write webmBlob to ffmpeg FS
3. Run ffmpeg command to output mp4 (h264)
4. Read mp4 from FS and download

### UI Requirements
- Progress bar
- Cancel button
- Memory warning

## ImgBB Integration
- **Use case:** Persist uploaded assets for later project reload
- **Approach:** Client uploads directly to imgbb API (or via Next route proxy if hiding key)
- **Store in DB:** Image URLs, frame URLs, metadata (dimensions, order)

## MongoDB Integration
- **Use case:** Persist project metadata and asset URLs
- **API Routes:**
  - `POST /api/project` (create)
  - `GET /api/project?id=...` (read)
  - `PUT /api/project?id=...` (update)
  - `DELETE /api/project?id=...` (delete)

## UI Requirements

### Editor Controls
- Multi-upload images
- Thumbnail grid
- Drag-drop reorder
- Frame1 upload + dimension readout
- Transition type/direction/duration controls
- Frame2 upload + dimension readout
- Drag-to-position slideshow
- Scale handle + numeric scale input
- Export duration seconds input

### Preview
- Live preview loop in canvas
- Toggle play/pause
- Show current mime support for export

### Export
- Export WebM button
- Export MP4 (slow) button
- Progress indicator
- Download link

## Performance Guardrails
- Decode images once using createImageBitmap
- Do not store full frame arrays in memory
- Stream recording via MediaRecorder
- Warn and block export if frame2 dimensions exceed 1920x1080 in MVP
- Desktop-first; display warning for mobile
## Development Milestones

### M1: Upload + Reorder + Persist
**Deliverables:**
- Upload 10+ images
- Reorder UI
- Store assets to imgbb
- Create/read/update Project in MongoDB

### M2: Stage-1 Render + Frame1 Overlay
**Deliverables:**
- Cover-fit algorithm
- Draw frame1 overlay
- Preview single image + overlay

### M3: Transitions + Loop Preview
**Deliverables:**
- wipe/push/pull/swipe transitions
- Direction selection
- Looping timeline

### M4: Stage-2 Composition
**Deliverables:**
- Upload frame2
- Transform controls (x,y,scale)
- Final composite preview

### M5: Export WebM
**Deliverables:**
- MediaRecorder export with mime fallback
- 30s export at 1080p/30fps
- Download

### M6: Optional MP4 Export
**Deliverables:**
- ffmpeg.wasm transcode webm->mp4(h264)
- Progress UI

## Non-Goals (v1)
- Audio tracks
- Alpha channel output video
- Server-side rendering or encoding
- Collaboration
- Per-image focal point selection

## Acceptance Criteria
1. User can upload 10+ images and reorder them
2. Frame #1 defines stage-1 size and overlays correctly (transparent areas preserved)
3. Transitions (wipe/push/pull/swipe) work in chosen direction
4. Slideshow loops to fill export duration
5. Frame #2 overlays final composite, with user-defined slideshow position and scale
6. Export WebM downloads and plays correctly
7. Optional MP4 export works via ffmpeg.wasm (slow acceptable)

---

*This document serves as the single source of truth for the InBrowserVideoComposer project.*