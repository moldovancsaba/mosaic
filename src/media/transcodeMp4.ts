import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

export interface TranscodeOptions {
  webmBlob: Blob
  format: 'mp4' | 'mov'
  onProgress?: (progress: number) => void
  onComplete?: (blob: Blob) => void
  onError?: (error: Error) => void
}

let ffmpegInstance: FFmpeg | null = null

/**
 * Check if ffmpeg.wasm can be loaded
 */
export function canTranscodeToMp4(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  // Check for WebAssembly support
  if (typeof WebAssembly === 'undefined') {
    console.warn('WebAssembly not supported')
    return false
  }
  
  // Check for SharedArrayBuffer support
  if (typeof SharedArrayBuffer === 'undefined') {
    console.warn('SharedArrayBuffer not supported. This requires:')
    console.warn('- HTTPS or localhost')
    console.warn('- Cross-Origin-Opener-Policy: same-origin')
    console.warn('- Cross-Origin-Embedder-Policy: require-corp OR credentialless')
    console.warn('Current browser:', navigator.userAgent)
    return false
  }
  
  // Try to create a SharedArrayBuffer to verify it actually works
  try {
    new SharedArrayBuffer(1)
    console.log('✓ SharedArrayBuffer is available and working')
    return true
  } catch (error) {
    console.warn('SharedArrayBuffer constructor failed:', error)
    return false
  }
}

/**
 * Load ffmpeg.wasm lazily
 * 
 * Strategy:
 * 1. Try toBlobURL (avoids bundler issues)
 * 2. Fallback to direct CDN URLs if blob conversion fails
 */
export async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance
  }

  try {
    ffmpegInstance = new FFmpeg()
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
    
    console.log('Loading ffmpeg.wasm...')
    console.log('Browser info:', {
      userAgent: navigator.userAgent,
      crossOriginIsolated: window.crossOriginIsolated,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      protocol: window.location.protocol
    })
    
    let coreURL: string
    let wasmURL: string
    let workerURL: string
    let loadMethod: string
    
    // Try Method 1: toBlobURL (preferred for Next.js 16)
    try {
      console.log('Attempting to load via blob URLs...')
      coreURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        'text/javascript'
      )
      wasmURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      )
      workerURL = await toBlobURL(
        `${baseURL}/ffmpeg-core.worker.js`,
        'text/javascript'
      )
      loadMethod = 'blob URLs'
      console.log('✓ Blob URLs created successfully')
    } catch (blobError) {
      // Fallback to direct CDN URLs
      console.warn('Blob URL conversion failed, falling back to direct CDN:', blobError)
      coreURL = `${baseURL}/ffmpeg-core.js`
      wasmURL = `${baseURL}/ffmpeg-core.wasm`
      workerURL = `${baseURL}/ffmpeg-core.worker.js`
      loadMethod = 'direct CDN'
      console.log('Using direct CDN URLs')
    }
    
    await ffmpegInstance.load({
      coreURL,
      wasmURL,
      workerURL,
    })
    
    console.log(`✓ ffmpeg.wasm loaded successfully via ${loadMethod}`)

    return ffmpegInstance
  } catch (error) {
    ffmpegInstance = null
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('✗ Failed to load ffmpeg.wasm:', errorMsg)
    if (errorStack) {
      console.error('Error stack:', errorStack)
    }
    console.error('Browser capabilities:', {
      userAgent: navigator.userAgent,
      crossOriginIsolated: window.crossOriginIsolated,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      webAssembly: typeof WebAssembly !== 'undefined',
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      online: navigator.onLine
    })
    
    // Provide helpful error messages based on error type
    if (errorMsg.includes('dynamic') || errorMsg.includes('module')) {
      throw new Error('FFmpeg loading failed due to bundler issue. Please refresh the page.')
    }
    if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('Load failed')) {
      throw new Error('Network error loading FFmpeg. Please check your internet connection and try again.')
    }
    if (!window.crossOriginIsolated) {
      throw new Error('Your browser does not support video conversion. SharedArrayBuffer is not available.')
    }
    
    throw new Error(`Failed to load ffmpeg.wasm: ${errorMsg}`)
  }
}

/**
 * Transcode WebM to MP4/MOV using ffmpeg.wasm
 */
export async function transcodeWebMToMp4(options: TranscodeOptions): Promise<Blob> {
  const { webmBlob, format, onProgress, onComplete, onError } = options
  
  try {
    if (!canTranscodeToMp4()) {
      throw new Error('Your browser does not support video transcoding. Please use a modern browser with SharedArrayBuffer support.')
    }

    onProgress?.(0)
    
    // Load ffmpeg
    const ffmpeg = await loadFFmpeg()
    onProgress?.(10)

    // Set up progress monitoring
    ffmpeg.on('progress', ({ progress }) => {
      // ffmpeg progress is 0-1, we want 10-90 for the actual transcoding
      const adjustedProgress = 10 + (progress * 80)
      onProgress?.(adjustedProgress)
    })

    // Write input file
    const inputFileName = 'input.webm'
    const outputFileName = `output.${format}`
    
    await ffmpeg.writeFile(inputFileName, await fetchFile(webmBlob))
    onProgress?.(20)

    // Transcode based on format
    let ffmpegArgs: string[]
    
    if (format === 'mp4') {
      // High quality MP4 with H.264
      ffmpegArgs = [
        '-i', inputFileName,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputFileName
      ]
    } else { // mov
      // High quality MOV with H.264
      ffmpegArgs = [
        '-i', inputFileName,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-f', 'mov',
        outputFileName
      ]
    }

    // Execute transcoding
    await ffmpeg.exec(ffmpegArgs)
    onProgress?.(90)

    // Read output file
    const outputData = await ffmpeg.readFile(outputFileName)
    // Convert FileData to Uint8Array for Blob creation
    const uint8Array = outputData instanceof Uint8Array ? outputData : new Uint8Array(outputData as any)
    const outputBlob = new Blob([uint8Array], { 
      type: format === 'mp4' ? 'video/mp4' : 'video/quicktime' 
    })

    // Clean up
    await ffmpeg.deleteFile(inputFileName)
    await ffmpeg.deleteFile(outputFileName)
    
    onProgress?.(100)
    onComplete?.(outputBlob)
    
    return outputBlob
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown transcoding error'
    const transcodeError = new Error(`Transcoding failed: ${errorMessage}`)
    onError?.(transcodeError)
    throw transcodeError
  }
}

/**
 * Get estimated file size for transcoding
 */
export function getEstimatedOutputSize(webmBlob: Blob, format: 'mp4' | 'mov'): string {
  // MP4 is typically 70-80% of WebM size, MOV is similar
  const estimatedSize = webmBlob.size * 0.75
  
  if (estimatedSize < 1024 * 1024) {
    return `~${(estimatedSize / 1024).toFixed(0)} KB`
  } else {
    return `~${(estimatedSize / (1024 * 1024)).toFixed(1)} MB`
  }
}