# Naming Guide

**Project:** InBrowserVideoComposer (Mosaic)
**Version:** 1.0.0
**Last Updated:** 2025-12-21T14:13:30.000Z

## Overview

This document defines naming conventions for all code, files, and components in the Mosaic project. Consistency in naming improves readability, maintainability, and reduces cognitive load for developers.

## General Principles

### 1. Clarity Over Brevity
- **Good:** `calculateTimelineState()`, `transitionProgress`
- **Bad:** `calcTLS()`, `tProg`

### 2. Descriptive Names
- Names should communicate purpose and content
- Avoid abbreviations unless universally understood (e.g., URL, API, ID)

### 3. Consistent Patterns
- Use established patterns throughout the codebase
- When in doubt, search for similar existing code and follow its pattern

## File Naming Conventions

### TypeScript/React Files

#### Component Files
- **Pattern:** PascalCase for React components
- **Location:** `app/` directory
- **Examples:**
  ```
  app/page.tsx              # Homepage component
  app/editor/page.tsx       # Editor page component
  app/layout.tsx            # Root layout component
  ```

#### API Routes
- **Pattern:** lowercase with route.ts
- **Location:** `app/api/` directory
- **Examples:**
  ```
  app/api/project/route.ts  # Project CRUD operations
  app/api/imgbb/route.ts    # Image upload proxy
  ```

#### Utility Modules
- **Pattern:** camelCase.ts
- **Location:** `src/` directory organized by category
- **Examples:**
  ```
  src/canvas/renderFrame.ts    # Frame rendering utilities
  src/canvas/transitions.ts    # Transition implementations
  src/canvas/fit.ts            # Image fitting algorithms
  src/media/transcodeMp4.ts    # Video transcoding
  src/lib/imageLoader.ts       # Image loading utilities
  ```

#### Type Definition Files
- **Pattern:** camelCase.ts or descriptive name
- **Location:** Colocated with usage or `app/types.ts`
- **Examples:**
  ```
  app/types.ts              # Project-wide type definitions
  ```

### Documentation Files

#### Mandatory Documentation
- **Pattern:** UPPERCASE.md
- **Location:** Project root
- **Examples:**
  ```
  README.md                 # Project overview
  ARCHITECTURE.md           # System architecture
  TASKLIST.md              # Task management
  ROADMAP.md               # Future planning
  RELEASE_NOTES.md         # Version history
  LEARNINGS.md             # Project insights
  ```

#### Optional Documentation
- **Pattern:** UPPERCASE.md or descriptive
- **Examples:**
  ```
  NAMING_GUIDE.md          # This file
  VERSION_1.0.0_SUMMARY.md # Release summary
  WARP.md                  # AI guidance
  ```

### Configuration Files
- **Pattern:** lowercase with dots
- **Examples:**
  ```
  package.json
  tsconfig.json
  next.config.js
  tailwind.config.js
  .eslintrc.json
  .env.local
  ```

### Script Files
- **Pattern:** kebab-case.sh
- **Location:** `scripts/` directory
- **Examples:**
  ```
  scripts/bump-version.sh
  ```

## Variable Naming Conventions

### TypeScript/JavaScript Variables

#### Regular Variables
- **Pattern:** camelCase
- **Examples:**
  ```typescript
  const projectId = '123'
  const isPlaying = false
  const exportProgress = 0
  let currentFrame = 0
  ```

#### Constants
- **Pattern:** UPPER_SNAKE_CASE for true constants, camelCase for config
- **Examples:**
  ```typescript
  // True constants (never change)
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024
  const DEFAULT_FPS = 30
  
  // Configuration objects (camelCase)
  const defaultTransition = {
    type: 'wipe',
    direction: 'right',
    durationMs: 500
  }
  ```

#### Boolean Variables
- **Pattern:** Use is/has/can/should prefix
- **Examples:**
  ```typescript
  const isLoading = true
  const hasImages = images.length > 0
  const canExport = project.images.length >= 1
  const shouldShowPreview = true
  ```

#### Arrays and Collections
- **Pattern:** Plural nouns
- **Examples:**
  ```typescript
  const images = []
  const projects = []
  const chunks = []
  const transitions = []
  ```

#### Event Handlers
- **Pattern:** handle + EventName or on + EventName
- **Examples:**
  ```typescript
  const handleClick = () => {}
  const handleDragStart = (index: number) => {}
  const onUploadComplete = (data) => {}
  const onError = (error) => {}
  ```

## Function Naming Conventions

### Regular Functions
- **Pattern:** camelCase with verb prefix
- **Examples:**
  ```typescript
  function calculateTimelineState() {}
  function renderStage1Frame() {}
  function loadImageWithRetry() {}
  function createCompositeImage() {}
  ```

### Utility Functions
- **Pattern:** Descriptive verb + noun
- **Examples:**
  ```typescript
  function fitCover(imgW, imgH, canvasW, canvasH) {}
  function applyTransition(ctx, current, next, progress) {}
  function getEstimatedOutputSize(blob, format) {}
  ```

### Async Functions
- **Pattern:** Same as regular, context determines async
- **Examples:**
  ```typescript
  async function loadProject() {}
  async function uploadImages(files) {}
  async function transcodeWebMToMp4(options) {}
  ```

### Boolean-Returning Functions
- **Pattern:** is/has/can/should prefix
- **Examples:**
  ```typescript
  function isImageAccessible(url) { return boolean }
  function canTranscodeToMp4() { return boolean }
  function hasFrames() { return boolean }
  ```

## Component Naming Conventions

### React Components
- **Pattern:** PascalCase
- **Location:** Defined in page.tsx or dedicated component files
- **Examples:**
  ```typescript
  function HomePage() {}
  function EditorPage() {}
  function RootLayout() {}
  ```

### Component Props
- **Pattern:** Descriptive, specific to component
- **Examples:**
  ```typescript
  interface EditorProps {
    projectId: string
    onSave: (project: Project) => void
  }
  ```

## Type and Interface Naming Conventions

### Interfaces
- **Pattern:** PascalCase, no I prefix
- **Examples:**
  ```typescript
  interface Project {
    _id?: string
    name: string
    version: string
  }
  
  interface ProjectImage {
    url: string
    order: number
  }
  
  interface TransitionConfig {
    type: 'wipe' | 'push' | 'pull' | 'swipe'
    direction: 'left' | 'right' | 'up' | 'down'
    durationMs: number
  }
  ```

### Type Aliases
- **Pattern:** PascalCase
- **Examples:**
  ```typescript
  type TransitionType = 'wipe' | 'push' | 'pull' | 'swipe'
  type Direction = 'left' | 'right' | 'up' | 'down'
  ```

### Enums (if used)
- **Pattern:** PascalCase for enum name, UPPER_SNAKE_CASE for values
- **Examples:**
  ```typescript
  enum ExportFormat {
    WEBM = 'webm',
    MP4 = 'mp4',
    MOV = 'mov'
  }
  ```

## CSS/Styling Conventions

### Tailwind Classes
- **Pattern:** Use Tailwind's conventions as-is
- **Examples:**
  ```tsx
  <div className="container mx-auto px-4">
  <button className="btn btn-primary">
  ```

### Custom CSS Classes
- **Pattern:** kebab-case
- **Location:** `app/globals.css`
- **Examples:**
  ```css
  .upload-zone {}
  .thumbnail-grid {}
  .progress-bar {}
  .mobile-warning {}
  ```

## Database/API Naming Conventions

### MongoDB Collections
- **Pattern:** Plural lowercase
- **Examples:**
  ```
  projects
  users (future)
  ```

### MongoDB Fields
- **Pattern:** camelCase
- **Examples:**
  ```typescript
  {
    _id: ObjectId,
    createdAt: string,
    updatedAt: string,
    frame1Url: string,
    frame1W: number
  }
  ```

### API Routes
- **Pattern:** RESTful lowercase with kebab-case
- **Examples:**
  ```
  /api/project          # GET (all), POST (create)
  /api/project?id=xxx   # GET (one), PUT (update), DELETE
  /api/imgbb           # POST (upload)
  ```

### API Request/Response Types
- **Pattern:** PascalCase with suffix
- **Examples:**
  ```typescript
  interface ProjectCreateRequest {
    name: string
  }
  
  interface ProjectUpdateRequest {
    name?: string
    images?: ProjectImage[]
  }
  ```

## Environment Variables

### Pattern
- **Pattern:** UPPER_SNAKE_CASE
- **Examples:**
  ```
  MONGODB_URI
  IMGBB_API_KEY
  NEXT_PUBLIC_IMGBB_API_KEY
  ```

### Prefixes
- **Public (client-side):** `NEXT_PUBLIC_`
- **Private (server-only):** No prefix

## Directory Structure Naming

### Application Directories
```
app/                    # Next.js app directory
  api/                 # API routes
    project/          # Project endpoints
    imgbb/           # Image upload
  editor/             # Editor page
  
src/                   # Source utilities
  canvas/             # Canvas operations
  media/              # Media processing
  lib/                # Shared libraries

scripts/               # Automation scripts
public/                # Static assets
```

## Common Patterns in Codebase

### Rendering Functions
- **Pattern:** `render` + Stage/Type + `Frame`
- **Examples:**
  ```typescript
  renderStage1Frame()   # Stage-1 rendering
  renderFinalFrame()    # Stage-2 rendering
  ```

### State Variables
- **Pattern:** Descriptive noun
- **Examples:**
  ```typescript
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({...})
  ```

### Refs
- **Pattern:** Descriptive + Ref suffix
- **Examples:**
  ```typescript
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const stage1CanvasRef = useRef<HTMLCanvasElement>(null)
  ```

### Canvas Variables
- **Pattern:** descriptive + Canvas/Ctx suffix
- **Examples:**
  ```typescript
  const stage1Canvas = document.createElement('canvas')
  const stage1Ctx = stage1Canvas.getContext('2d')
  const exportCanvas = document.createElement('canvas')
  const exportCtx = exportCanvas.getContext('2d')
  ```

## Anti-Patterns to Avoid

### ❌ Don't Use
- **Single letter variables** (except in loops: i, j, k)
  ```typescript
  // Bad
  const p = project
  const t = transition
  
  // Good
  const project = ...
  const transition = ...
  ```

- **Unclear abbreviations**
  ```typescript
  // Bad
  const imgCnt = images.length
  const expProg = exportProgress
  
  // Good
  const imageCount = images.length
  const exportProgress = ...
  ```

- **Hungarian notation**
  ```typescript
  // Bad
  const strName = 'Project'
  const boolIsPlaying = true
  
  // Good
  const name = 'Project'
  const isPlaying = true
  ```

- **Redundant names**
  ```typescript
  // Bad
  interface ProjectInterface {}
  class ProjectClass {}
  
  // Good
  interface Project {}
  class Project {}
  ```

## Special Cases

### Frame References
- **Frame #1:** First overlay (defines Stage-1 dimensions)
  - Variables: `frame1`, `frame1Url`, `frame1W`, `frame1H`, `frame1Image`
- **Frame #2:** Second overlay (defines final output dimensions)
  - Variables: `frame2`, `frame2Url`, `frame2W`, `frame2H`, `frame2Image`

### Stage References
- **Stage-1:** Slideshow with Frame #1 overlay
  - Variables: `stage1Canvas`, `stage1Ctx`, `renderStage1Frame()`
- **Stage-2:** Final composition with Frame #2 overlay
  - Variables: `finalCanvas`, `finalCtx`, `renderFinalFrame()`

### Timeline Variables
- **Pattern:** Descriptive of time/frame concept
- **Examples:**
  ```typescript
  const currentFrame = 0
  const totalFrames = durationSeconds * fps
  const currentIndex = 0
  const nextIndex = 1
  const transitionProgress = 0.5  // 0 to 1
  const timePerCycle = 2.0  // seconds
  ```

## Examples from Codebase

### File Organization Example
```
src/canvas/
  fit.ts              # Image fitting algorithms (fitCover, fitContain)
  transitions.ts      # Transition implementations (wipe, push, pull, swipe)
  renderFrame.ts      # Frame rendering and timeline logic

src/media/
  transcodeMp4.ts     # MP4/MOV conversion via ffmpeg.wasm
  recordWebM.ts       # WebM recording utilities

src/lib/
  imageLoader.ts      # Robust image loading with retry logic
  projectApi.ts       # Project API client
  imgbbApi.ts         # Image upload utilities
```

### Function Naming Example
```typescript
// Good: Clear, descriptive, follows conventions
export function calculateTimelineState(
  frameNumber: number,
  config: RenderConfig
): TimelineState

export function fitCover(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number
): FitResult

export async function loadImageWithRetry(
  url: string,
  options: ImageLoadOptions
): Promise<ImageLoadResult>
```

### Variable Naming Example
```typescript
// Good: Consistent patterns
const [project, setProject] = useState<Project | null>(null)
const [isPlaying, setIsPlaying] = useState(false)
const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })

const fileInputRef = useRef<HTMLInputElement>(null)
const previewCanvasRef = useRef<HTMLCanvasElement>(null)

const handleDragStart = (index: number) => setDraggedIndex(index)
const handleDrop = (e: React.DragEvent, dropIndex: number) => {...}
```

## When to Deviate

You may deviate from these conventions when:

1. **External APIs require different naming** (e.g., imgbb API responses)
2. **Framework conventions take precedence** (e.g., Next.js special files)
3. **Industry standard patterns exist** (e.g., MongoDB `_id` field)
4. **Readability significantly improves** with an alternative

**Important:** Document deviations with code comments explaining why.

## Enforcement

### Manual Review
- Code reviews should check naming consistency
- Reference this guide during reviews

### Future Automation
- Consider ESLint rules for naming conventions
- Pre-commit hooks could enforce patterns
- TypeScript naming conventions in tsconfig.json

## Updates to This Guide

- Update this document when establishing new patterns
- Version and timestamp all changes
- Document reasoning for pattern decisions

---

**This guide is a living document. When you establish a new pattern, add it here.**
