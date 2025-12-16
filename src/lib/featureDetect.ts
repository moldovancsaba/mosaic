/**
 * Feature detection utilities for browser capabilities
 */

export interface FeatureSupport {
  offscreenCanvas: boolean
  mediaRecorder: boolean
  webWorkers: boolean
  webm: {
    supported: boolean
    codecs: string[]
  }
}

/**
 * Detect OffscreenCanvas support
 */
export function detectOffscreenCanvas(): boolean {
  return typeof OffscreenCanvas !== 'undefined'
}

/**
 * Detect MediaRecorder support
 */
export function detectMediaRecorder(): boolean {
  return typeof MediaRecorder !== 'undefined'
}

/**
 * Detect Web Worker support
 */
export function detectWebWorkers(): boolean {
  return typeof Worker !== 'undefined'
}

/**
 * Detect WebM support and available codecs
 */
export function detectWebMSupport(): { supported: boolean; codecs: string[] } {
  if (typeof MediaRecorder === 'undefined') {
    return { supported: false, codecs: [] }
  }

  const codecs = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ]

  const supportedCodecs = codecs.filter(codec => MediaRecorder.isTypeSupported(codec))
  
  return {
    supported: supportedCodecs.length > 0,
    codecs: supportedCodecs
  }
}

/**
 * Get comprehensive feature support information
 */
export function getFeatureSupport(): FeatureSupport {
  return {
    offscreenCanvas: detectOffscreenCanvas(),
    mediaRecorder: detectMediaRecorder(),
    webWorkers: detectWebWorkers(),
    webm: detectWebMSupport()
  }
}

/**
 * Check if the current environment supports video composition
 */
export function canComposeVideo(): boolean {
  const support = getFeatureSupport()
  return support.mediaRecorder && support.webm.supported
}

/**
 * Get user-friendly feature support message
 */
export function getCompatibilityMessage(): string {
  const support = getFeatureSupport()
  
  if (!support.mediaRecorder) {
    return 'Your browser does not support MediaRecorder API. Please use a modern browser like Chrome, Firefox, or Edge.'
  }
  
  if (!support.webm.supported) {
    return 'Your browser does not support WebM video recording. Please use a modern browser.'
  }
  
  const features = []
  if (support.offscreenCanvas) features.push('OffscreenCanvas')
  if (support.webWorkers) features.push('Web Workers')
  
  if (features.length > 0) {
    return `Full support detected. Enhanced features available: ${features.join(', ')}`
  }
  
  return 'Basic support detected. Video composition will work but may be slower.'
}

/**
 * Warn user about mobile limitations
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * Get mobile warning message
 */
export function getMobileWarning(): string | null {
  if (isMobileDevice()) {
    return 'This app is optimized for desktop. Mobile devices may experience performance issues or limited functionality.'
  }
  return null
}