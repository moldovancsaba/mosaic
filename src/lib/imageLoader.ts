/**
 * Robust image loader with retry logic and CORS handling
 * Handles common issues with external image hosts like imgbb
 */

export interface ImageLoadOptions {
  maxRetries?: number
  retryDelay?: number
  crossOrigin?: 'anonymous' | 'use-credentials' | null
  timeout?: number
}

export interface ImageLoadResult {
  image: HTMLImageElement
  url: string
  attempts: number
}

/**
 * Load a single image with retry logic and CORS handling
 */
export async function loadImageWithRetry(
  url: string,
  options: ImageLoadOptions = {}
): Promise<ImageLoadResult> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    crossOrigin = 'anonymous',
    timeout = 30000
  } = options

  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Loading image (attempt ${attempt}/${maxRetries}):`, url)
      
      const image = await loadImageWithTimeout(url, crossOrigin, timeout)
      
      console.log(`✓ Image loaded successfully on attempt ${attempt}:`, url)
      return { image, url, attempts: attempt }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      console.warn(`✗ Failed to load image (attempt ${attempt}/${maxRetries}):`, url, lastError.message)
      
      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        await sleep(retryDelay * attempt) // Exponential backoff
      }
    }
  }
  
  // All attempts failed
  throw new Error(`Failed to load image after ${maxRetries} attempts: ${url} - ${lastError?.message}`)
}

/**
 * Load an image with timeout
 */
function loadImageWithTimeout(
  url: string,
  crossOrigin: 'anonymous' | 'use-credentials' | null,
  timeout: number
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    
    // Set CORS before setting src
    if (crossOrigin) {
      image.crossOrigin = crossOrigin
    }
    
    // Timeout handler
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error(`Image load timeout after ${timeout}ms`))
    }, timeout)
    
    // Success handler
    image.onload = () => {
      cleanup()
      resolve(image)
    }
    
    // Error handler
    image.onerror = (error) => {
      cleanup()
      reject(new Error(`Image load error: ${error}`))
    }
    
    // Cleanup function
    const cleanup = () => {
      clearTimeout(timeoutId)
      image.onload = null
      image.onerror = null
    }
    
    // Start loading
    image.src = url
  })
}

/**
 * Load multiple images in parallel with retry logic
 */
export async function loadImagesWithRetry(
  urls: string[],
  options: ImageLoadOptions = {},
  onProgress?: (loaded: number, total: number) => void
): Promise<ImageLoadResult[]> {
  const results: ImageLoadResult[] = []
  const total = urls.length
  
  console.log(`Loading ${total} images...`)
  
  // Load images in parallel but track progress
  const promises = urls.map(async (url, index) => {
    try {
      const result = await loadImageWithRetry(url, options)
      results.push(result)
      onProgress?.(results.length, total)
      return result
    } catch (error) {
      console.error(`Failed to load image ${index + 1}/${total}:`, url, error)
      throw error
    }
  })
  
  // Wait for all to complete (or fail)
  await Promise.all(promises)
  
  console.log(`✓ All ${total} images loaded successfully`)
  return results
}

/**
 * Load images sequentially (one at a time) - slower but more reliable for many images
 */
export async function loadImagesSequentially(
  urls: string[],
  options: ImageLoadOptions = {},
  onProgress?: (loaded: number, total: number) => void
): Promise<ImageLoadResult[]> {
  const results: ImageLoadResult[] = []
  const total = urls.length
  
  console.log(`Loading ${total} images sequentially...`)
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    try {
      const result = await loadImageWithRetry(url, options)
      results.push(result)
      onProgress?.(i + 1, total)
      console.log(`Progress: ${i + 1}/${total}`)
    } catch (error) {
      console.error(`Failed to load image ${i + 1}/${total}:`, url, error)
      throw error
    }
  }
  
  console.log(`✓ All ${total} images loaded successfully`)
  return results
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Preload an image (load but don't return it)
 */
export async function preloadImage(url: string, options: ImageLoadOptions = {}): Promise<void> {
  await loadImageWithRetry(url, options)
}

/**
 * Check if an image URL is accessible
 */
export async function isImageAccessible(url: string): Promise<boolean> {
  try {
    await loadImageWithRetry(url, { maxRetries: 1, timeout: 5000 })
    return true
  } catch {
    return false
  }
}
