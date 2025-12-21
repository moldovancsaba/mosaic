# Learnings & Decisions

**Project:** InBrowserVideoComposer (Mosaic)
**Version:** 1.0.0
**Last Updated:** 2025-12-21T13:57:36.000Z

## Overview

This document captures issues faced, solutions implemented, and architectural decisions made during development. The goal is to prevent repeated mistakes and document rationale for future maintainers.

## Dev / Development Process

### Learning: Documentation Drift During Rapid Development
**Date:** 2025-12-18
**Issue:** Documentation became out of sync with implementation as features were completed
**Context:** M6 (MP4 export) was fully implemented but docs still listed it as "future enhancement"
**Solution:** Conducted comprehensive audit and updated all docs to match actual implementation
**Prevention:** Implement documentation updates as part of Definition of Done
**Impact:** High - Without accurate docs, onboarding and maintenance are difficult

### Learning: Versioning Protocol Essential for Traceability
**Date:** 2025-12-21
**Issue:** No systematic version management, making it hard to track changes
**Context:** Project stuck at 0.1.0 with no clear versioning strategy
**Solution:** Documented semantic versioning protocol in AI rules and mandatory docs
**Decision:** PATCH before dev, MINOR before commit, MAJOR on explicit instruction
**Impact:** Medium - Affects deployment tracking and rollback capability

### Learning: Path Aliases Improve Maintainability
**Date:** 2025-12-18
**Issue:** Relative imports like `../../src/canvas/renderFrame` are brittle
**Context:** TypeScript path aliases configured but not consistently used
**Solution:** Standardized on `@/*` for src imports, `@/app/*` for app imports
**Decision:** Use path aliases for all internal imports
**Impact:** Low - Improves code readability and refactoring ease

### Learning: Unused Dependencies Create Confusion
**Date:** 2025-12-18
**Issue:** Mongoose files present but never used (models/Project.ts, lib/mongodb.ts)
**Context:** Initially planned to use Mongoose, switched to native driver
**Solution:** Left files as harmless remnants, documented in ARCHITECTURE.md
**Decision:** Could remove in future cleanup, keeping as option for migration
**Impact:** Low - Minimal confusion if documented

## Design / Architecture

### Learning: Composite Image Pattern for Transition Quality
**Date:** 2025-12-16
**Issue:** Frame overlays didn't move correctly with transitions
**Context:** Initially applied transitions to raw images, then drew frame overlay
**Solution:** Create composite (image + Frame #1) BEFORE applying transitions
**Rationale:** Ensures frame overlay participates in transition animation
**Impact:** High - Critical for visual quality and expected behavior
**Code Location:** `src/canvas/renderFrame.ts` line 149-170

### Learning: Two-Stage Canvas Architecture Enables Flexibility
**Date:** 2025-12-15
**Issue:** Need to support different slideshow and output dimensions
**Context:** Users want to create slideshow in one aspect ratio, export in another
**Solution:** Stage-1 for slideshow (Frame #1 dims), Stage-2 for final (Frame #2 dims)
**Rationale:** Separation of concerns, allows independent configuration
**Impact:** High - Core architectural decision enabling key features
**Code Location:** `src/canvas/renderFrame.ts` renderStage1Frame, renderFinalFrame

### Learning: Native MongoDB Driver Simpler Than Mongoose
**Date:** 2025-12-10
**Issue:** Mongoose adds complexity for simple CRUD operations
**Context:** MVP only needs basic project storage and retrieval
**Solution:** Use MongoDB native driver directly in API routes
**Rationale:** Less abstraction, fewer dependencies, faster queries
**Trade-off:** No schema validation, no model methods (acceptable for MVP)
**Impact:** Medium - Affects data layer architecture
**Code Location:** `app/api/project/route.ts`

### Learning: Client-Side Rendering Scales Better Than Expected
**Date:** 2025-12-15
**Issue:** Concern about performance of browser-based video rendering
**Context:** Initially worried about slow exports limiting usability
**Solution:** Accepted 1:1 or 2:1 render time as acceptable for MVP
**Rationale:** Eliminates server costs, enables unlimited concurrent users
**Trade-off:** Slower than server-side but eliminates infrastructure complexity
**Impact:** High - Core architectural decision affecting deployment strategy

## Backend / API

### Learning: API Route Patterns: Single File vs Separate Routes
**Date:** 2025-12-10
**Issue:** Next.js supports both `/api/project/route.ts` and `/api/project/[id]/route.ts`
**Context:** Initially documented as separate routes, implemented as single file
**Solution:** Used query param pattern `?id=xxx` in single route file
**Rationale:** Simpler for CRUD operations, fewer files to maintain
**Trade-off:** Less RESTful, but more pragmatic for small API
**Impact:** Low - Internal implementation detail
**Code Location:** `app/api/project/route.ts`

### Learning: imgbb Proxy Hides API Keys from Client
**Date:** 2025-12-09
**Issue:** Direct client uploads expose API key in browser
**Context:** Security requirement to never expose credentials
**Solution:** Created `/api/imgbb` proxy route on server
**Rationale:** Server converts to base64 and uploads, returns only public URL
**Impact:** Medium - Essential security pattern
**Code Location:** `app/api/imgbb/route.ts`

### Learning: MongoDB Connection Singleton Prevents Pool Exhaustion
**Date:** 2025-12-10
**Issue:** Creating new MongoDB connection per request is inefficient
**Context:** Serverless functions reuse execution contexts
**Solution:** Singleton connection with `isConnected` flag
**Rationale:** Reuses connection across requests in same execution context
**Impact:** Medium - Affects database performance and costs
**Code Location:** `app/api/project/route.ts` lines 4-13

## Frontend / UI

### Learning: Robust Image Loading Requires Retry Logic
**Date:** 2025-12-17
**Issue:** imgbb images occasionally fail to load due to network issues
**Context:** External CDN can be unreliable, CORS errors occur
**Solution:** Implemented retry logic with exponential backoff
**Features:** 3 retries, 30s timeout, CORS handling, progress callbacks
**Impact:** High - Critical for reliability of preview and export
**Code Location:** `src/lib/imageLoader.ts`

### Learning: Upload Progress Feedback Reduces User Anxiety
**Date:** 2025-12-16
**Issue:** Users uncertain if upload is working during long waits
**Context:** Large images take time to upload to imgbb
**Solution:** Detailed progress tracking with current/total/percentage
**Impact:** Medium - Improves UX significantly
**Code Location:** `app/editor/page.tsx` lines 473-554

### Learning: Preview Mode Toggle Helps Understand Pipeline
**Date:** 2025-12-16
**Issue:** Users confused about difference between Stage-1 and Final output
**Context:** Two-stage architecture not obvious to users
**Solution:** Added toggle to switch between Stage-1 and Final preview
**Rationale:** Educational tool showing how pipeline works
**Impact:** Medium - Helps users understand and verify configuration
**Code Location:** `app/editor/page.tsx` preview rendering logic

### Learning: Drag-Drop for Reordering More Intuitive Than Buttons
**Date:** 2025-12-09
**Issue:** Need natural way to reorder images
**Context:** Buttons (up/down) are tedious for many images
**Solution:** Drag-drop with visual feedback
**Impact:** Medium - Better UX than alternatives
**Code Location:** `app/editor/page.tsx` handleDragStart, handleDrop

## Process / Workflow

### Learning: Documentation Rules Prevent Chaos at Scale
**Date:** 2025-12-21
**Issue:** Without enforced structure, docs become inconsistent
**Context:** Multiple doc files with different formats and purposes
**Solution:** Defined mandatory structure in AI rules
**Required Files:** README, ARCHITECTURE, TASKLIST, ROADMAP, RELEASE_NOTES, LEARNINGS
**Impact:** High - Enables project continuity and team scaling

### Learning: Timestamps Must Be Standardized
**Date:** 2025-12-21
**Issue:** Mixed timestamp formats create parsing issues
**Context:** Some logs use local time, others use UTC, inconsistent precision
**Solution:** Mandate ISO 8601 with milliseconds in UTC (YYYY-MM-DDTHH:MM:SS.sssZ)
**Rationale:** Unambiguous, sortable, internationally recognized
**Impact:** Medium - Affects logging, debugging, auditing
**Code Location:** All API routes, MongoDB documents

### Learning: Definition of Done Must Include Multiple Checks
**Date:** 2025-12-21
**Issue:** "Done" is ambiguous without clear criteria
**Context:** Tasks completed in code but not verified in all contexts
**Solution:** Mandatory checklist: dev verification, version bump, docs update, commit
**Impact:** High - Ensures quality and completeness

## Technical / Implementation

### Learning: MediaRecorder MIME Type Fallback Essential
**Date:** 2025-12-14
**Issue:** Different browsers support different video codecs
**Context:** vp9 not available in all browsers
**Solution:** Try vp9 > vp8 > webm in order with isTypeSupported check
**Impact:** High - Ensures export works across browsers
**Code Location:** `app/editor/page.tsx` lines 333-345

### Learning: ffmpeg.wasm Requires SharedArrayBuffer
**Date:** 2025-12-14
**Issue:** ffmpeg.wasm fails without SharedArrayBuffer support
**Context:** SharedArrayBuffer requires specific CORS headers
**Solution:** Added COEP: require-corp and COOP: same-origin headers
**Rationale:** Enables multithreading in ffmpeg.wasm
**Trade-off:** Stricter CORS requirements for all resources
**Impact:** High - Enables MP4/MOV export
**Code Location:** `next.config.js` lines 6-22

### Learning: Safari Requires Different CORS Approach
**Date:** 2025-12-17
**Issue:** Safari blocks resources with COEP: require-corp from different origins
**Context:** ffmpeg.wasm CDN needs cross-origin compatibility
**Solution:** Use credentialless mode or CDN with proper CORS headers
**Impact:** Medium - Safari compatibility essential for Mac users
**Code Location:** `src/media/transcodeMp4.ts` lines 62-77

### Learning: Timeline Calculation Must Handle Edge Cases
**Date:** 2025-12-15
**Issue:** Transition time can exceed total duration with many images
**Context:** User sets 30s duration with 20 images and 2s transitions = 40s needed
**Solution:** Auto-adjust transition time to 50% of per-image time if overflow
**Rationale:** Better than failing or cutting off images
**Impact:** High - Prevents unexpected behavior
**Code Location:** `src/canvas/renderFrame.ts` lines 54-65

### Learning: Cover-Fit vs Contain for Different Use Cases
**Date:** 2025-12-12
**Issue:** Images with different aspect ratios need appropriate scaling
**Context:** Cover fills canvas (may crop), contain shows full image (may letterbox)
**Solution:** Implemented both, use cover for slideshow (no black bars)
**Rationale:** Cover prevents black bars in transitions, looks professional
**Trade-off:** May crop parts of images, but that's expected behavior
**Impact:** Medium - Visual quality decision
**Code Location:** `src/canvas/fit.ts`

## Other / Miscellaneous

### Learning: Tests Prohibited for MVP Factory
**Date:** 2025-12-09
**Context:** AI rule explicitly prohibits tests in MVP projects
**Decision:** No test files, no test frameworks, focus on speed to market
**Rationale:** MVPs prioritize validation over perfection
**Trade-off:** Less confidence in refactoring, but faster iteration
**Impact:** Medium - Affects development workflow

### Learning: Desktop-First Acceptable for MVP
**Date:** 2025-12-09
**Issue:** Mobile support would require significant additional work
**Context:** Canvas performance, file uploads, and UI all favor desktop
**Solution:** Optimize for desktop, show warning on mobile
**Rationale:** Target users (content creators) primarily use desktop
**Trade-off:** Smaller addressable market, but focused MVP
**Impact:** Medium - Affects user base and requirements

### Learning: External CDN for Images Simplifies Infrastructure
**Date:** 2025-12-09
**Issue:** Need persistent storage for user-uploaded images
**Context:** Vercel serverless has no persistent filesystem
**Solution:** imgbb provides free CDN hosting with API
**Rationale:** Zero storage costs, reliable CDN, simple integration
**Trade-off:** Dependency on external service, potential rate limits
**Impact:** High - Core infrastructure decision
**Alternative Considered:** S3/R2 self-hosted (deferred to future)

## Decision Log

### Decision: Use Native MongoDB Driver (Not Mongoose)
**Date:** 2025-12-10
**Rationale:** Simpler for MVP, fewer abstractions, direct control
**Alternatives Considered:** Mongoose (more structure but more complexity)
**Status:** Implemented
**Review Date:** When scaling requires schema validation

### Decision: Client-Side Video Rendering
**Date:** 2025-12-08
**Rationale:** Zero server costs, unlimited scalability, acceptable performance
**Alternatives Considered:** Server-side ffmpeg (complex, expensive)
**Status:** Implemented
**Review Date:** If render speed becomes major user complaint

### Decision: Composite Image Pattern
**Date:** 2025-12-16
**Rationale:** Only way to make Frame #1 overlay move with transitions
**Alternatives Considered:** Separate overlay rendering (doesn't work visually)
**Status:** Implemented
**Review Date:** Not expected to change (core to visual quality)

### Decision: imgbb for Image Storage
**Date:** 2025-12-09
**Rationale:** Free, reliable CDN, simple API
**Alternatives Considered:** S3 (more control but costs), Cloudflare R2
**Status:** Implemented
**Review Date:** If rate limits become issue or want more control

### Decision: TypeScript Strict Mode
**Date:** 2025-12-08
**Rationale:** Catch more errors at compile time, better IDE support
**Alternatives Considered:** Loose mode (faster to write, less safe)
**Status:** Implemented
**Review Date:** Not expected to change

## Future Considerations

### Potential Refactoring: Extract Export Logic to Module
**Context:** Export logic currently inline in editor component
**Benefit:** Better testability, reusability, cleaner component
**Cost:** Additional abstraction may not be worth it for MVP
**Decision:** Defer until other components need export functionality

### Potential Migration: Add Mongoose for Schema Validation
**Context:** Native driver works but no validation layer
**Benefit:** Type safety, validation, cleaner data layer
**Cost:** Added complexity, learning curve
**Decision:** Consider when data integrity issues arise

### Potential Optimization: Web Workers for Rendering
**Context:** Rendering blocks main thread during export
**Benefit:** Keeps UI responsive during long exports
**Cost:** OffscreenCanvas support limited, complexity increases
**Decision:** Wait for broader browser support

## Lessons for Next Project

1. **Document as you go** - Don't let docs drift from implementation
2. **Version everything** - Semantic versioning from day one
3. **Choose simplest that works** - Native driver over Mongoose was correct for MVP
4. **Client-side rendering viable** - Don't assume server-side required
5. **Retry logic essential** - External dependencies will fail, plan for it
6. **CORS headers critical** - SharedArrayBuffer needs specific configuration
7. **Edge cases matter** - Timeline calculation required careful testing
8. **User feedback is gold** - Progress indicators reduce anxiety significantly
9. **Desktop-first ok for MVP** - Mobile can come later if needed
10. **External CDN acceptable** - imgbb simplifies infrastructure significantly

---

**Next Review:** After first production deployment and user feedback
