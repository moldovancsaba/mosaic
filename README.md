# InBrowserVideoComposer

A 100% client-side Next.js web app that creates looping slideshow videos with custom frames and transitions. Upload images, apply overlays, configure transitions, and export as WebM or MP4 - all in your browser.

## 🎯 Features

- **Multi-Image Upload**: Upload 10+ images with drag-drop reordering
- **Custom Frames**: Apply PNG overlays to define slideshow and final video dimensions
- **Smooth Transitions**: Wipe, push, pull, and swipe transitions with directional control
- **Live Preview**: Real-time preview of your slideshow with transitions
- **Video Export**: Export as WebM (primary) or MP4 (via ffmpeg.wasm transcoding)
- **Client-Side Only**: No server processing - everything runs in your browser
- **Project Persistence**: Save and reload projects via MongoDB Atlas

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd in-browser-video-composer
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   - `MONGODB_URI`: MongoDB Atlas connection string
   - `IMGBB_API_KEY`: imgbb API key for image storage

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   Navigate to `http://localhost:7777`

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Rendering**: HTMLCanvasElement + CanvasRenderingContext2D
- **Video Export**: MediaRecorder API (WebM), ffmpeg.wasm 0.12.15 (MP4/MOV)
- **Image Storage**: imgbb API
- **Project Storage**: MongoDB Atlas (native driver)
- **Hosting**: Vercel-ready

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system architecture and technical design
- **[BROWSER_COMPATIBILITY.md](BROWSER_COMPATIBILITY.md)** - Browser requirements and compatibility matrix
- **[NAMING_GUIDE.md](NAMING_GUIDE.md)** - Coding conventions and naming standards
- **[TASKLIST.md](TASKLIST.md)** - Active tasks and project management
- **[ROADMAP.md](ROADMAP.md)** - Future development plans (Q1-Q4 2025)
- **[RELEASE_NOTES.md](RELEASE_NOTES.md)** - Version history and changelog
- **[LEARNINGS.md](LEARNINGS.md)** - Project insights and architectural decisions
- **[WARP.md](WARP.md)** - AI development guidance

## 📋 How It Works

1. **Upload Images**: Add 10+ images and arrange them in your desired order
2. **Frame #1**: Upload a PNG overlay that defines your slideshow dimensions
3. **Configure Transitions**: Choose transition type (wipe/push/pull/swipe) and direction
4. **Frame #2**: Upload a PNG overlay that defines your final video dimensions (target 1080p)
5. **Position & Scale**: Drag and scale your slideshow within Frame #2
6. **Export**: Generate 30-second video at 1080p/30fps

## 🎨 Transition Types

- **Wipe**: Next image reveals through a moving clip rectangle
- **Push**: Next image pushes the current image out of frame
- **Pull**: Current image moves away revealing the next image
- **Swipe**: Alias for push transition

All transitions support 4 directions: left, right, up, down.

## 📱 Browser Support

**Recommended**: Chrome, Firefox, Edge (desktop)
**Required Features**: MediaRecorder API, Canvas API, Web Workers
**Mobile**: Limited support (desktop-first design)

## 🔧 Development

### Project Structure

```
app/
├── page.tsx              # Project list homepage
├── editor/page.tsx       # Main editor interface
├── api/
│   ├── project/route.ts  # Project CRUD operations
│   └── imgbb/route.ts    # Image upload proxy
src/
├── canvas/
│   ├── fit.ts           # Image fitting algorithms
│   ├── transitions.ts   # Transition implementations
│   └── renderFrame.ts   # Frame rendering logic
├── media/
│   ├── recordWebM.ts    # WebM recording via MediaRecorder
│   └── transcodeMp4.ts  # MP4 transcoding via ffmpeg.wasm
└── lib/
    ├── projectApi.ts    # Project API client
    ├── imgbbApi.ts      # Image upload utilities
    └── featureDetect.ts # Browser capability detection
```

### Key Algorithms

**Cover Fit**: Scales images to fill canvas while maintaining aspect ratio
```typescript
const scale = Math.max(canvasW / imgW, canvasH / imgH)
```

**Timeline Calculation**: Determines current/next image and transition progress
```typescript
const timePerCycle = durationSeconds / imageCount
const transitionProgress = (cycleTime - holdTime) / transitionTime
```

## 🎯 Milestones

- [x] **M1**: Upload + Reorder + Persist
- [x] **M2**: Stage-1 Render + Frame1 Overlay
- [x] **M3**: Transitions + Loop Preview
- [x] **M4**: Stage-2 Composition
- [x] **M5**: Export WebM
- [x] **M6**: MP4/MOV Export via ffmpeg.wasm

## 🚀 Current Status

**ALL MILESTONES COMPLETE** ✅
- Full video composer application with all features
- Multi-image upload and management
- Frame overlays (Frame #1 and Frame #2)
- Four transition types with directional control
- Live preview with dual mode (Stage-1 / Final)
- WebM export with codec detection
- MP4/MOV conversion via ffmpeg.wasm
- MongoDB persistence for project management

**Production Ready**: All core features implemented and functional

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 😧 Known Issues

- Mobile support is limited (desktop-first design)
- ffmpeg.wasm requires SharedArrayBuffer support (modern browsers only)
- Large image uploads may be slow on slower connections
- Very long export durations (>60s) may cause memory issues

## 📞 Support

For issues and questions, please use the GitHub issue tracker.