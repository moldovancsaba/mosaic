# InBrowserVideoComposer

A 100% client-side Next.js web application for creating video slideshows with custom frames and transitions.

## Features

- **Image Upload & Management**: Upload 10+ images with drag-and-drop reordering
- **Dual Frame System**: 
  - Frame #1: Defines slideshow dimensions and overlay
  - Frame #2: Defines final output dimensions with positioning controls
- **Transition Effects**: Wipe, push, pull, and swipe transitions with directional control
- **Video Export**: 
  - Primary: WebM format via MediaRecorder API
  - Optional: MP4 format via ffmpeg.wasm transcoding
- **Client-Only Processing**: No server compute required, runs entirely in browser
- **1080p Output**: Target resolution 1920x1080 at 30fps

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Rendering**: HTML5 Canvas with Web Workers
- **Storage**: MongoDB Atlas (metadata), ImgBB (images)
- **Deployment**: Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
app/
├── page.tsx              # Project list/creation
├── editor/page.tsx       # Main video editor
├── export/page.tsx       # Export interface
└── api/
    ├── project/route.ts  # Project CRUD
    └── imgbb/route.ts    # Image upload proxy

src/
├── workers/
│   └── renderer.worker.ts
├── canvas/
│   ├── fit.ts
│   ├── transitions.ts
│   └── renderFrame.ts
├── media/
│   ├── recordWebM.ts
│   └── transcodeMp4.ts
└── lib/
    ├── projectApi.ts
    ├── imgbbApi.ts
    └── featureDetect.ts
```

## Environment Variables

```env
MONGODB_URI=your_mongodb_atlas_connection_string
IMGBB_API_KEY=your_imgbb_api_key
```

## Browser Support

- Modern browsers with Canvas API support
- MediaRecorder API for WebM export
- Web Workers for background processing
- OffscreenCanvas (optional, for better performance)

## License

MIT