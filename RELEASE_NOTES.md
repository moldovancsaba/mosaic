# Release Notes

**Project:** InBrowserVideoComposer (Mosaic)
**Current Version:** 1.0.0

## Version History

### [0.1.0] - 2025-12-18

**Status:** Initial MVP Release - All Core Features Complete

#### Added

**M1: Upload + Reorder + Persist**
- Multi-image upload functionality with drag-drop support
- Image reordering via drag-drop interface
- Image removal capability
- imgbb API integration for image storage
- MongoDB Atlas integration with native driver
- Project CRUD operations (Create, Read, Update, Delete)
- Project list homepage with create/delete actions
- Editor interface with project management

**M2: Stage-1 Render + Frame #1 Overlay**
- Canvas rendering infrastructure
- Cover-fit algorithm implementation for image scaling
- Frame #1 PNG upload and overlay support
- Composite image pattern (image + Frame #1 combined before transitions)
- Hidden Stage-1 canvas for slideshow rendering
- Frame dimensions auto-detection from uploaded PNG

**M3: Transitions + Loop Preview**
- Four transition types: wipe, push, pull, swipe
- Four directions per transition: left, right, up, down (16 total combinations)
- Transition duration configuration (milliseconds)
- Timeline calculation algorithm with auto-looping
- Live preview with play/pause controls
- Dual preview modes: Stage-1 only and Final composition
- Automatic transition time adjustment if exceeds total duration

**M4: Stage-2 Composition**
- Frame #2 PNG upload for final video dimensions
- Transform controls: position (x, y) and scale
- Stage-1 canvas positioning within Stage-2 canvas
- Final composition rendering with Frame #2 overlay
- Preview mode toggle between Stage-1 and Final
- Configurable export dimensions via Frame #2

**M5: Export WebM**
- MediaRecorder API integration
- WebM video export with codec detection
- MIME type priority: vp9 > vp8 > webm
- Export progress tracking (0-100%)
- Configurable export duration (5-120 seconds)
- Configurable FPS (default 30fps)
- Download link generation for exported video
- 5 Mbps bitrate for quality output

**M6: MP4/MOV Export via ffmpeg.wasm**
- ffmpeg.wasm 0.12.15 integration
- WebM to MP4 conversion with H.264 codec
- WebM to MOV conversion with QuickTime format
- SharedArrayBuffer detection and compatibility checking
- Lazy loading of ffmpeg.wasm from CDN
- Progress tracking: 0-10% load, 10-90% transcode, 90-100% finalize
- Format selection UI (MP4 or MOV)
- Estimated output size calculation
- Safari compatibility with COEP/COOP headers
- Error handling and user feedback for unsupported browsers

**Infrastructure & Quality**
- TypeScript strict mode enabled
- Next.js 14+ App Router architecture
- Tailwind CSS 4.1.18 for styling
- CORS headers configuration for SharedArrayBuffer
- Robust image loading with retry logic
- Exponential backoff for failed image loads
- CORS handling for external images
- 30-second timeout per image load attempt
- Upload progress tracking with percentage display
- Detailed console logging for debugging

#### Fixed
- Transition direction default standardized to 'right'
- Import paths updated to use TypeScript aliases (@/*)
- Frame #1 integration with transitions (composite pattern)
- Image loading errors with retry mechanism
- Safari SharedArrayBuffer support diagnostics
- ffmpeg.wasm loading in production environment
- Image preview loading with CORS support

#### Technical Details

**Database Schema:**
- Projects collection in MongoDB Atlas
- Native MongoDB driver (not Mongoose)
- ISO 8601 timestamps for createdAt/updatedAt
- Embedded image array with order, dimensions, URLs
- Transition, transform, and export configuration stored

**Rendering Pipeline:**
- Two-stage canvas architecture
- Stage-1: Composite images (image + Frame #1) with transitions
- Stage-2: Final composition (Stage-1 + Frame #2) with transform
- Timeline calculation with precise frame timing
- Cover-fit algorithm for aspect ratio preservation

**Browser Requirements:**
- MediaRecorder API (WebM export)
- Canvas API (rendering)
- SharedArrayBuffer (MP4/MOV conversion - optional)
- WebAssembly (ffmpeg.wasm - optional)
- HTTPS or localhost (for SharedArrayBuffer)

**Performance:**
- 30-second video renders in 30-60 seconds (WebM)
- MP4 conversion adds 60-120 seconds
- Client-side processing only (no server compute)
- Memory usage: ~16MB for 1080p canvas pair
- Desktop-first design (mobile support limited)

#### Known Issues
- Mobile browser support limited (desktop-optimized)
- ffmpeg.wasm requires SharedArrayBuffer (not available in all browsers)
- Large image uploads may be slow on slower connections
- Very long export durations (>60s) may cause memory issues on low-end devices
- Mongoose files present but unused (models/Project.ts, lib/mongodb.ts)

#### Dependencies

**Production:**
- next: ^14.0.0
- react: ^18.0.0
- react-dom: ^18.0.0
- typescript: ^5.0.0
- mongodb: ^6.21.0
- mongoose: ^9.0.1 (unused, legacy)
- @ffmpeg/ffmpeg: ^0.12.15
- @ffmpeg/util: ^0.12.2

**Development:**
- tailwindcss: ^4.1.18
- @tailwindcss/postcss: ^4.1.18
- eslint: ^8.0.0
- eslint-config-next: ^14.0.0

#### Contributors
- Development Team
- AI Assistance (WARP)

#### Deployment
- Platform: Vercel-ready
- Node Version: 20+
- Environment Variables: MONGODB_URI, IMGBB_API_KEY
- Build Command: npm run build
- Output Directory: .next

---

## Version Format

Versions follow semantic versioning: **MAJOR.MINOR.PATCH**

- **MAJOR:** Breaking changes or major feature releases
- **MINOR:** New features, significant improvements (incremented before GitHub commits)
- **PATCH:** Bug fixes, minor improvements (incremented before npm run dev)

## Release Process

1. Increment version according to change type
2. Update all documentation with new version number
3. Update this file with detailed changelog
4. Commit with version tag
5. Deploy to production (if applicable)
6. Update TASKLIST.md (move completed tasks here)
7. Update ROADMAP.md (adjust future plans)

## Notes

- First production release includes all MVP features (M1-M6)
- All core functionality tested and verified
- Documentation aligned with implementation
- Ready for production deployment
- Future releases will increment version appropriately

**Next Planned Release:** 1.0.0 (Production deployment + versioning protocol)
