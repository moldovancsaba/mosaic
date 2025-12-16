export interface RecordingOptions {
  canvas: HTMLCanvasElement
  fps: number
  durationSeconds: number
  onProgress?: (progress: number) => void
  onComplete?: (blob: Blob) => void
  onError?: (error: Error) => void
}

export interface SupportedMimeType {
  mimeType: string
  isSupported: boolean
}

/**
 * Detect supported WebM mime types in order of preference
 */
export function detectSupportedMimeTypes(): SupportedMimeType[] {
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ]
  
  return mimeTypes.map(mimeType => ({
    mimeType,
    isSupported: typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)
  }))
}

/**
 * Get the best supported mime type
 */
export function getBestSupportedMimeType(): string | null {
  const supported = detectSupportedMimeTypes()
  const best = supported.find(mime => mime.isSupported)
  return best?.mimeType || null
}

/**
 * Record canvas to WebM using MediaRecorder
 */
export async function recordCanvasToWebM(options: RecordingOptions): Promise<Blob> {
  const { canvas, fps, durationSeconds, onProgress, onComplete, onError } = options
  
  return new Promise((resolve, reject) => {
    try {
      // Check MediaRecorder support
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder is not supported in this browser')
      }
      
      // Get best supported mime type
      const mimeType = getBestSupportedMimeType()
      if (!mimeType) {
        throw new Error('No supported WebM mime types found')
      }
      
      // Create stream from canvas
      const stream = canvas.captureStream(fps)
      
      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
      })
      
      const chunks: Blob[] = []
      let startTime = Date.now()
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        onComplete?.(blob)
        resolve(blob)
      }
      
      recorder.onerror = (event) => {
        const error = new Error(`MediaRecorder error: ${event.error}`)
        onError?.(error)
        reject(error)
      }
      
      // Start recording
      recorder.start(250) // Request data every 250ms
      
      // Progress tracking
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        const progress = Math.min(elapsed / durationSeconds, 1)
        onProgress?.(progress)
        
        if (progress >= 1) {
          clearInterval(progressInterval)
        }
      }, 100)
      
      // Stop recording after duration
      setTimeout(() => {
        recorder.stop()
        stream.getTracks().forEach(track => track.stop())
        clearInterval(progressInterval)
      }, durationSeconds * 1000)
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown recording error')
      onError?.(err)
      reject(err)
    }
  })
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}