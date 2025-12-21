import { fitCover } from './fit'
import { applyTransition, TransitionType, Direction } from './transitions'

export interface RenderConfig {
  images: (HTMLImageElement | ImageBitmap)[]
  frame1?: HTMLImageElement | ImageBitmap
  frame2?: HTMLImageElement | ImageBitmap
  frame1W: number
  frame1H: number
  frame2W: number
  frame2H: number
  transition: {
    type: TransitionType
    direction: Direction
    durationMs: number
  }
  transform: {
    x: number
    y: number
    scale: number
  }
  fps: number
  durationSeconds: number
}

export interface TimelineState {
  currentIndex: number
  nextIndex: number
  transitionProgress: number // 0 to 1
  isTransitioning: boolean
}

/**
 * Calculate timeline state for a given frame with strict duration control
 * 
 * WHY THIS APPROACH:
 * The timeline needs to determine which image to show and whether we're transitioning
 * at any given frame. We loop through images to fill the total duration, distributing
 * time fairly between hold time (static display) and transition time (animation).
 * 
 * KEY DECISION: If total transition time exceeds duration (many images + long transitions),
 * we auto-adjust transitions to 50% of per-image time rather than failing or cutting images.
 * This ensures all images are shown while maintaining smooth transitions.
 * 
 * ALGORITHM:
 * 1. Calculate ideal time per image (duration / imageCount)
 * 2. Subtract transition time from each cycle
 * 3. Determine current cycle based on elapsed time
 * 4. Calculate transition progress within cycle (0-1)
 * 
 * @param frameNumber - Current frame (0-based)
 * @param config - Render configuration with images, fps, duration, transition settings
 * @returns Timeline state with current/next image indices and transition progress
 */
export function calculateTimelineState(
  frameNumber: number,
  config: RenderConfig
): TimelineState {
  const { images, transition, fps, durationSeconds } = config
  const totalFrames = durationSeconds * fps
  const imageCount = images.length
  
  if (imageCount === 0) {
    return { currentIndex: 0, nextIndex: 0, transitionProgress: 0, isTransitioning: false }
  }
  
  // If we're at or past the end, show the last frame
  if (frameNumber >= totalFrames) {
    const lastIndex = imageCount - 1
    return { currentIndex: lastIndex, nextIndex: lastIndex, transitionProgress: 0, isTransitioning: false }
  }
  
  const transitionTimeSeconds = transition.durationMs / 1000
  const totalTransitionTime = transitionTimeSeconds * imageCount
  const totalHoldTime = durationSeconds - totalTransitionTime
  
  // WHY AUTO-ADJUST: If user configures 20 images with 2s transitions in a 30s video,
  // we'd need 40s total (impossible). Rather than failing or cutting images, we reduce
  // transition time proportionally. Using 50% ensures smooth animations while showing all images.
  const adjustedTransitionTime = totalTransitionTime > durationSeconds 
    ? (durationSeconds / imageCount) * 0.5  // Use 50% of time per image for transitions
    : transitionTimeSeconds
  
  const adjustedTotalTransitionTime = adjustedTransitionTime * imageCount
  const adjustedTotalHoldTime = durationSeconds - adjustedTotalTransitionTime
  const holdTimePerImage = adjustedTotalHoldTime / imageCount
  
  // Time per complete cycle (hold + transition)
  const timePerCycle = holdTimePerImage + adjustedTransitionTime
  
  // Current time in seconds
  const currentTime = frameNumber / fps
  
  // Find which cycle we're in
  const cycleIndex = Math.floor(currentTime / timePerCycle)
  const cycleTime = currentTime % timePerCycle
  
  // Handle case where we've gone through all images
  if (cycleIndex >= imageCount) {
    // Show last image for remaining time
    const lastIndex = imageCount - 1
    return { currentIndex: lastIndex, nextIndex: lastIndex, transitionProgress: 0, isTransitioning: false }
  }
  
  const currentIndex = cycleIndex
  const nextIndex = (cycleIndex + 1) % imageCount
  
  // Are we in transition phase?
  if (cycleTime >= holdTimePerImage) {
    // We're in transition
    const transitionProgress = (cycleTime - holdTimePerImage) / adjustedTransitionTime
    return {
      currentIndex,
      nextIndex,
      transitionProgress: Math.min(1, transitionProgress),
      isTransitioning: true
    }
  } else {
    // We're in hold phase
    return {
      currentIndex,
      nextIndex,
      transitionProgress: 0,
      isTransitioning: false
    }
  }
}

/**
 * Calculate timing information for display in UI
 */
export function calculateTimingInfo(config: RenderConfig): {
  holdTimePerImage: number
  transitionTime: number
  totalCycles: number
  timePerCycle: number
} {
  const { images, transition, durationSeconds } = config
  const imageCount = images.length
  
  if (imageCount === 0) {
    return { holdTimePerImage: 0, transitionTime: 0, totalCycles: 0, timePerCycle: 0 }
  }
  
  const transitionTimeSeconds = transition.durationMs / 1000
  const totalTransitionTime = transitionTimeSeconds * imageCount
  
  // If total transition time exceeds duration, adjust transition time
  const adjustedTransitionTime = totalTransitionTime > durationSeconds 
    ? (durationSeconds / imageCount) * 0.5  // Use 50% of time per image for transitions
    : transitionTimeSeconds
  
  const adjustedTotalTransitionTime = adjustedTransitionTime * imageCount
  const adjustedTotalHoldTime = durationSeconds - adjustedTotalTransitionTime
  const holdTimePerImage = adjustedTotalHoldTime / imageCount
  const timePerCycle = holdTimePerImage + adjustedTransitionTime
  const totalCycles = durationSeconds / timePerCycle
  
  return {
    holdTimePerImage,
    transitionTime: adjustedTransitionTime,
    totalCycles,
    timePerCycle
  }
}

/**
 * Create a composite image (image + Frame 1 overlay) on a temporary canvas
 * 
 * WHY COMPOSITE PATTERN:
 * This is a critical implementation detail. We create composite images (base image + Frame #1 overlay)
 * BEFORE applying transitions. This ensures that the Frame #1 overlay participates in transition
 * animations naturally - it moves, slides, or fades along with the image.
 * 
 * ALTERNATIVE REJECTED: Initially tried applying transitions to raw images, then drawing Frame #1
 * on top. This resulted in Frame #1 staying stationary while images moved beneath it, which looked
 * incorrect and confusing to users.
 * 
 * TRADE-OFF: Creates temporary canvas for each composite, slightly more memory usage, but ensures
 * correct visual behavior which is essential for the product.
 * 
 * @param image - Base image to draw (cover-fit)
 * @param frame1 - Optional Frame #1 overlay (PNG with transparency)
 * @param canvasW - Canvas width (from Frame #1 dimensions)
 * @param canvasH - Canvas height (from Frame #1 dimensions)
 * @returns Temporary canvas with composite image
 */
function createCompositeImage(
  image: HTMLImageElement | ImageBitmap,
  frame1: HTMLImageElement | ImageBitmap | undefined,
  canvasW: number,
  canvasH: number
): HTMLCanvasElement {
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = canvasW
  tempCanvas.height = canvasH
  const tempCtx = tempCanvas.getContext('2d')!
  
  // Draw the image with cover fit
  const fit = fitCover(image.width, image.height, canvasW, canvasH)
  tempCtx.drawImage(image, fit.drawX, fit.drawY, fit.drawW, fit.drawH)
  
  // Draw Frame #1 overlay if available
  if (frame1) {
    tempCtx.drawImage(frame1, 0, 0, canvasW, canvasH)
  }
  
  return tempCanvas
}

/**
 * Render a single frame to Stage-1 canvas (slideshow with Frame #1 overlay)
 * 
 * TWO-STAGE ARCHITECTURE:
 * This is Stage-1 of the rendering pipeline. It creates the slideshow with Frame #1 overlay.
 * Stage-2 (optional) takes this output and positions it within Frame #2 for final composition.
 * 
 * COMPOSITE IMAGE PATTERN:
 * Uses createCompositeImage() to bake Frame #1 into each image BEFORE transitions.
 * This is critical for correct visual behavior - see createCompositeImage() comments for details.
 * 
 * RENDERING LOGIC:
 * 1. Calculate timeline state (which image to show, transition progress)
 * 2. If not transitioning: Draw single composite image
 * 3. If transitioning: Create both composites and apply transition effect
 * 
 * @param ctx - Stage-1 canvas context
 * @param frameNumber - Current frame (0-based)
 * @param config - Full render configuration
 */
export function renderStage1Frame(
  ctx: CanvasRenderingContext2D,
  frameNumber: number,
  config: RenderConfig
): void {
  const { images, frame1, frame1W, frame1H, transition } = config
  const canvasW = frame1W
  const canvasH = frame1H
  
  // Clear canvas
  ctx.clearRect(0, 0, canvasW, canvasH)
  
  if (images.length === 0) return
  
  const timeline = calculateTimelineState(frameNumber, config)
  const currentImage = images[timeline.currentIndex]
  
  if (!timeline.isTransitioning) {
    // Simple case: create composite and draw it
    const composite = createCompositeImage(currentImage, frame1, canvasW, canvasH)
    ctx.drawImage(composite, 0, 0)
  } else {
    // Transition case: create composites for both images and blend them
    const nextImage = images[timeline.nextIndex]
    const currentComposite = createCompositeImage(currentImage, frame1, canvasW, canvasH)
    const nextComposite = createCompositeImage(nextImage, frame1, canvasW, canvasH)
    
    // Apply transition to the composite images
    applyTransition(
      ctx,
      currentComposite,
      nextComposite,
      timeline.transitionProgress,
      transition.type,
      transition.direction,
      canvasW,
      canvasH,
      { drawX: 0, drawY: 0, drawW: canvasW, drawH: canvasH }, // currentFit - full canvas
      { drawX: 0, drawY: 0, drawW: canvasW, drawH: canvasH }  // nextFit - full canvas
    )
  }
}

/**
 * Render final composite frame (Stage-1 placed in Frame #2)
 * 
 * TWO-STAGE ARCHITECTURE:
 * This is Stage-2 of the rendering pipeline. Takes Stage-1 output (slideshow) and positions
 * it within Frame #2 canvas, then applies Frame #2 overlay.
 * 
 * USE CASE:
 * Allows users to create slideshow in one aspect ratio (e.g., square for Instagram)
 * and position it within a larger frame (e.g., 16:9 for YouTube) with decorative borders.
 * 
 * WHY OPTIONAL:
 * If user doesn't upload Frame #2, we export Stage-1 directly. This stage only runs when
 * Frame #2 is present.
 * 
 * @param finalCtx - Stage-2 (final) canvas context
 * @param stage1Canvas - The Stage-1 canvas with rendered slideshow
 * @param frameNumber - Current frame (for any future frame-dependent logic)
 * @param config - Full render configuration including transform and Frame #2
 */
export function renderFinalFrame(
  finalCtx: CanvasRenderingContext2D,
  stage1Canvas: HTMLCanvasElement,
  frameNumber: number,
  config: RenderConfig
): void {
  const { frame2, frame2W, frame2H, transform } = config
  const canvasW = frame2W
  const canvasH = frame2H
  
  // Clear final canvas
  finalCtx.clearRect(0, 0, canvasW, canvasH)
  
  // Draw Stage-1 canvas with transform
  const scaledW = config.frame1W * transform.scale
  const scaledH = config.frame1H * transform.scale
  
  finalCtx.drawImage(
    stage1Canvas,
    transform.x,
    transform.y,
    scaledW,
    scaledH
  )
  
  // Draw Frame #2 overlay if available
  if (frame2) {
    finalCtx.drawImage(frame2, 0, 0, canvasW, canvasH)
  }
}