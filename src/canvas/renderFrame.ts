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
  
  // If total transition time exceeds duration, adjust transition time
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