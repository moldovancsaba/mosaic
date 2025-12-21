export type TransitionType = 'wipe' | 'push' | 'pull' | 'swipe'
export type Direction = 'left' | 'right' | 'up' | 'down'

export interface DirectionVector {
  x: number
  y: number
}

export const directionVectors: Record<Direction, DirectionVector> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 }
}

/**
 * Apply wipe transition - reveal next image using moving clip rect
 * 
 * WHY CLIP RECT APPROACH:
 * Wipe transitions reveal the next image progressively by expanding a clipping rectangle.
 * The current image stays in place while the next image is revealed through the growing clip area.
 * 
 * IMPORTANT: Both currentImage and nextImage should be composite images (image + Frame #1 overlay)
 * to ensure the frame overlay moves with the transition. See createCompositeImage() for details.
 * 
 * @param ctx - Canvas context to draw into
 * @param currentImage - Current composite image (or canvas)
 * @param nextImage - Next composite image (or canvas)
 * @param progress - Transition progress 0 (start) to 1 (complete)
 * @param direction - Direction of wipe (left/right/up/down)
 * @param canvasW - Canvas width
 * @param canvasH - Canvas height
 * @param currentFit - Fit data for current image (usually full canvas)
 * @param nextFit - Fit data for next image (usually full canvas)
 */
export function applyWipeTransition(
  ctx: CanvasRenderingContext2D,
  currentImage: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  nextImage: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  progress: number, // 0 to 1
  direction: Direction,
  canvasW: number,
  canvasH: number,
  currentFit: any,
  nextFit: any
) {
  // Draw current image full
  ctx.drawImage(currentImage, currentFit.drawX, currentFit.drawY, currentFit.drawW, currentFit.drawH)
  
  // Calculate clip rect based on direction and progress
  ctx.save()
  
  let clipX: number, clipY: number, clipW: number, clipH: number
  
  switch (direction) {
    case 'left':
      clipX = canvasW * (1 - progress)
      clipY = 0
      clipW = canvasW * progress
      clipH = canvasH
      break
    case 'right':
      clipX = 0
      clipY = 0
      clipW = canvasW * progress
      clipH = canvasH
      break
    case 'up':
      clipX = 0
      clipY = canvasH * (1 - progress)
      clipW = canvasW
      clipH = canvasH * progress
      break
    case 'down':
      clipX = 0
      clipY = 0
      clipW = canvasW
      clipH = canvasH * progress
      break
  }
  
  // Apply clipping and draw next image
  ctx.beginPath()
  ctx.rect(clipX, clipY, clipW, clipH)
  ctx.clip()
  
  ctx.drawImage(nextImage, nextFit.drawX, nextFit.drawY, nextFit.drawW, nextFit.drawH)
  
  ctx.restore()
}

/**
 * Apply push transition - next image pushes current out
 */
export function applyPushTransition(
  ctx: CanvasRenderingContext2D,
  currentImage: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  nextImage: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  progress: number,
  direction: Direction,
  canvasW: number,
  canvasH: number,
  currentFit: any,
  nextFit: any
) {
  const dir = directionVectors[direction]
  const dx = dir.x * canvasW * progress
  const dy = dir.y * canvasH * progress
  
  // Draw current image moving away
  ctx.drawImage(
    currentImage,
    currentFit.drawX - dx,
    currentFit.drawY - dy,
    currentFit.drawW,
    currentFit.drawH
  )
  
  // Draw next image pushing in
  ctx.drawImage(
    nextImage,
    nextFit.drawX + (dir.x * canvasW) - dx,
    nextFit.drawY + (dir.y * canvasH) - dy,
    nextFit.drawW,
    nextFit.drawH
  )
}

/**
 * Apply pull transition - current moves away revealing next
 */
export function applyPullTransition(
  ctx: CanvasRenderingContext2D,
  currentImage: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  nextImage: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  progress: number,
  direction: Direction,
  canvasW: number,
  canvasH: number,
  currentFit: any,
  nextFit: any
) {
  const dir = directionVectors[direction]
  const dx = dir.x * canvasW * progress
  const dy = dir.y * canvasH * progress
  
  // Draw next image stationary
  ctx.drawImage(nextImage, nextFit.drawX, nextFit.drawY, nextFit.drawW, nextFit.drawH)
  
  // Draw current image moving away
  ctx.drawImage(
    currentImage,
    currentFit.drawX - dx,
    currentFit.drawY - dy,
    currentFit.drawW,
    currentFit.drawH
  )
}

/**
 * Apply transition based on type
 */
export function applyTransition(
  ctx: CanvasRenderingContext2D,
  currentImage: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  nextImage: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  progress: number,
  type: TransitionType,
  direction: Direction,
  canvasW: number,
  canvasH: number,
  currentFit: any,
  nextFit: any
) {
  switch (type) {
    case 'wipe':
      applyWipeTransition(ctx, currentImage, nextImage, progress, direction, canvasW, canvasH, currentFit, nextFit)
      break
    case 'push':
    case 'swipe': // swipe is alias for push
      applyPushTransition(ctx, currentImage, nextImage, progress, direction, canvasW, canvasH, currentFit, nextFit)
      break
    case 'pull':
      applyPullTransition(ctx, currentImage, nextImage, progress, direction, canvasW, canvasH, currentFit, nextFit)
      break
  }
}