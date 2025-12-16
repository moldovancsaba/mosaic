/**
 * Cover-fit algorithm - equivalent to CSS background-size: cover
 * Scales image to fill canvas while maintaining aspect ratio
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
  const scale = Math.max(canvasW / imgW, canvasH / imgH)
  const drawW = imgW * scale
  const drawH = imgH * scale
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