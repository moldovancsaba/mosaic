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
 * Calculate timeline state for a given frame
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
  
  // Calculate time per slide cycle (including transition)
  const timePerCycle = durationSeconds / imageCount
  const transitionTimeSeconds = transition.durationMs / 1000
  const holdTimeSeconds = timePerCycle - transitionTimeSeconds
  
  // Current time in seconds
  const currentTime = (frameNumber / fps) % durationSeconds
  
  // Find which cycle we're in
  const cycleTime = currentTime % timePerCycle
  const cycleIndex = Math.floor(currentTime / timePerCycle) % imageCount
  
  const currentIndex = cycleIndex
  const nextIndex = (cycleIndex + 1) % imageCount
  
  // Are we in transition phase?
  if (cycleTime >= holdTimeSeconds) {
    const transitionProgress = (cycleTime - holdTimeSeconds) / transitionTimeSeconds
    return {
      currentIndex,
      nextIndex,
      transitionProgress: Math.min(1, transitionProgress),
      isTransitioning: true
    }
  } else {
    return {
      currentIndex,
      nextIndex,
      transitionProgress: 0,
      isTransitioning: false
    }
  }
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
    // Simple case: just draw current image
    const fit = fitCover(currentImage.width, currentImage.height, canvasW, canvasH)
    ctx.drawImage(currentImage, fit.drawX, fit.drawY, fit.drawW, fit.drawH)
  } else {
    // Transition case: blend current and next
    const nextImage = images[timeline.nextIndex]
    const currentFit = fitCover(currentImage.width, currentImage.height, canvasW, canvasH)
    const nextFit = fitCover(nextImage.width, nextImage.height, canvasW, canvasH)
    
    applyTransition(
      ctx,
      currentImage,
      nextImage,
      timeline.transitionProgress,
      transition.type,
      transition.direction,
      canvasW,
      canvasH,
      currentFit,
      nextFit
    )
  }
  
  // Draw Frame #1 overlay if available
  if (frame1) {
    ctx.drawImage(frame1, 0, 0, canvasW, canvasH)
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