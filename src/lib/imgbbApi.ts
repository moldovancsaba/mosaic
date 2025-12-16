export interface UploadResult {
  url: string
  width: number
  height: number
  size: number
}

/**
 * Upload image to imgbb via our API route
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch('/api/imgbb', {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}

/**
 * Upload multiple images
 */
export async function uploadImages(files: File[]): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      continue // Skip non-image files
    }
    
    try {
      const result = await uploadImage(file)
      results.push(result)
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error)
      // Continue with other files
    }
  }
  
  return results
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' }
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' }
  }

  // Check for common image formats
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported image format. Use JPG, PNG, GIF, or WebP.' }
  }

  return { valid: true }
}

/**
 * Load image from URL and get dimensions
 */
export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // For imgbb CORS
    
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    
    img.src = url
  })
}

/**
 * Create ImageBitmap from URL (for better performance)
 */
export async function createImageBitmapFromUrl(url: string): Promise<ImageBitmap> {
  const response = await fetch(url)
  const blob = await response.blob()
  return createImageBitmap(blob)
}