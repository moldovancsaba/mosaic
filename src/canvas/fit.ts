/**
 * Cover-fit algorithm - equivalent to CSS background-size: cover
 * Scales image to fill canvas while maintaining aspect ratio
 * 
 * WHY COVER (NOT CONTAIN):
 * Cover was chosen for slideshow images to prevent black bars (letterboxing) during transitions.
 * When images slide, wipe, or push, black bars would be visible and look unprofessional.
 * 
 * TRADE-OFF: May crop parts of images, but this is expected behavior for slideshow/video content.
 * Users can control framing via image selection and cropping before upload.
 * 
 * ALGORITHM:
 * 1. Calculate scale to fill canvas (max of width ratio and height ratio)
 * 2. Scale image dimensions
 * 3. Center the scaled image on canvas (may overflow edges)
 * 
 * RESULT: Image fills entire canvas, maintains aspect ratio, may crop edges
 */
export interface FitResult {
  drawX: number
  drawY: number
  drawW: number
  drawH: number
}

export function fitCover(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number
): FitResult {
  // Use Math.max to ensure image fills canvas (one dimension will match exactly, other will overflow)
  const scale = Math.max(canvasW / imgW, canvasH / imgH)
  const drawW = imgW * scale
  const drawH = imgH * scale
  // Center the image (negative values will be clipped by canvas, creating crop effect)
  const drawX = (canvasW - drawW) / 2
  const drawY = (canvasH - drawH) / 2

  return { drawX, drawY, drawW, drawH }
}

/**
 * Contain-fit algorithm - equivalent to CSS background-size: contain
 * Scales image to fit entirely within canvas while maintaining aspect ratio
 */
export function fitContain(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number
): FitResult {
  const scale = Math.min(canvasW / imgW, canvasH / imgH)
  const drawW = imgW * scale
  const drawH = imgH * scale
  const drawX = (canvasW - drawW) / 2
  const drawY = (canvasH - drawH) / 2

  return { drawX, drawY, drawW, drawH }
}