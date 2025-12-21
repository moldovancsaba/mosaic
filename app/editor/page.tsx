'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { renderStage1Frame, renderFinalFrame, RenderConfig, calculateTimingInfo } from '@/canvas/renderFrame'
import { transcodeWebMToMp4, canTranscodeToMp4, getEstimatedOutputSize } from '@/media/transcodeMp4'
import { loadImagesWithRetry, loadImageWithRetry } from '@/lib/imageLoader'

interface ProjectImage {
  url: string
  order: number
  width: number
  height: number
}

interface Project {
  _id: string
  name: string
  images: ProjectImage[]
  frame1Url: string
  frame1W: number
  frame1H: number
  frame2Url: string
  frame2W: number
  frame2H: number
  transition: {
    type: 'wipe' | 'push' | 'pull' | 'swipe'
    direction: 'left' | 'right' | 'up' | 'down'
    durationMs: number
  }
  transform: {
    x: number
    y: number
    scale: number
  }
  export: {
    durationSeconds: number
    fps: number
  }
}

function EditorPageContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const frame1InputRef = useRef<HTMLInputElement>(null)
  const frame2InputRef = useRef<HTMLInputElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const finalPreviewCanvasRef = useRef<HTMLCanvasElement>(null)
  const stage1CanvasRef = useRef<HTMLCanvasElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewFrame, setPreviewFrame] = useState(0)
  const [loadedImages, setLoadedImages] = useState<HTMLImageElement[]>([])
  const [frame1Image, setFrame1Image] = useState<HTMLImageElement | null>(null)
  const [frame2Image, setFrame2Image] = useState<HTMLImageElement | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionProgress, setConversionProgress] = useState(0)
  const [convertedVideoUrl, setConvertedVideoUrl] = useState<string | null>(null)
  const [conversionFormat, setConversionFormat] = useState<'mp4' | 'mov'>('mp4')
  const [webmBlob, setWebmBlob] = useState<Blob | null>(null)
  const [showFinalPreview, setShowFinalPreview] = useState(false)
  const [imageLoadingProgress, setImageLoadingProgress] = useState({ loaded: 0, total: 0 })
  const [imageLoadError, setImageLoadError] = useState<string | null>(null)

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/project?id=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
        // Load images for preview
        loadImagesForPreview(data.project)
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadProject()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadImagesForPreview = async (projectData: Project) => {
    setImageLoadError(null)
    
    // Load main images with retry logic
    if (projectData.images.length > 0) {
      const sortedImages = projectData.images.sort((a, b) => a.order - b.order)
      const imageUrls = sortedImages.map(img => img.url)
      
      try {
        console.log(`Loading ${imageUrls.length} images with retry logic...`)
        const results = await loadImagesWithRetry(
          imageUrls,
          { maxRetries: 3, retryDelay: 1000, timeout: 30000 },
          (loaded, total) => {
            setImageLoadingProgress({ loaded, total })
          }
        )
        
        // Extract images from results (they're in order)
        const loadedImgs = results.map(r => r.image)
        setLoadedImages(loadedImgs)
        console.log(`✓ All ${loadedImgs.length} images loaded successfully`)
        setImageLoadingProgress({ loaded: 0, total: 0 })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error loading images'
        console.error('Failed to load images for preview:', errorMsg)
        setImageLoadError(errorMsg)
        setImageLoadingProgress({ loaded: 0, total: 0 })
      }
    } else {
      setLoadedImages([])
    }

    // Load frame1 if available with retry logic
    if (projectData.frame1Url) {
      try {
        const result = await loadImageWithRetry(projectData.frame1Url, { 
          maxRetries: 3, 
          retryDelay: 1000,
          timeout: 30000 
        })
        setFrame1Image(result.image)
        console.log('✓ Frame 1 loaded successfully')
      } catch (error) {
        console.error('Failed to load frame1:', projectData.frame1Url, error)
        setFrame1Image(null)
      }
    }

    // Load frame2 if available with retry logic
    if (projectData.frame2Url) {
      try {
        const result = await loadImageWithRetry(projectData.frame2Url, { 
          maxRetries: 3, 
          retryDelay: 1000,
          timeout: 30000 
        })
        setFrame2Image(result.image)
        console.log('✓ Frame 2 loaded successfully')
      } catch (error) {
        console.error('Failed to load frame2:', projectData.frame2Url, error)
        setFrame2Image(null)
      }
    }
  }

  const saveProject = async (updates: Partial<Project>) => {
    if (!project) {
      console.error('No project to save!')
      return
    }

    try {
      console.log('Saving project updates:', updates)
      const response = await fetch(`/api/project?id=${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Project saved successfully, new project state:', data.project)
        console.log('New project images count:', data.project.images?.length || 0)
        setProject(data.project)
        // Reload images when project updates
        loadImagesForPreview(data.project)
      } else {
        console.error('Failed to save project:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to save project:', error)
    }
  }

  const togglePreview = () => {
    setIsPlaying(!isPlaying)
  }

  // Preview animation loop
  useEffect(() => {
    if (!isPlaying || !project) {
      return
    }
    
    // If no images are loaded but we have project images, show a message
    if (project.images.length > 0 && loadedImages.length === 0) {
      console.log('Images not loaded yet, waiting...')
      return
    }

    const stage1Canvas = stage1CanvasRef.current
    const previewCanvas = previewCanvasRef.current
    const finalPreviewCanvas = finalPreviewCanvasRef.current

    if (!stage1Canvas || !previewCanvas) return

    const stage1Ctx = stage1Canvas.getContext('2d')
    const previewCtx = previewCanvas.getContext('2d')
    const finalPreviewCtx = finalPreviewCanvas?.getContext('2d')

    if (!stage1Ctx || !previewCtx) return

    const config: RenderConfig = {
      images: loadedImages,
      frame1: frame1Image || undefined,
      frame2: frame2Image || undefined,
      frame1W: project.frame1W,
      frame1H: project.frame1H,
      frame2W: project.frame2W,
      frame2H: project.frame2H,
      transition: project.transition,
      transform: project.transform,
      fps: 30,
      durationSeconds: 10 // Preview duration
    }

    let animationId: number
    let frameCount = 0

    const animate = () => {
      try {
        // Always render Stage 1 to the hidden canvas
        renderStage1Frame(stage1Ctx, frameCount, config)
        
        if (!showFinalPreview) {
          // Show Stage 1 preview - copy from hidden canvas to visible preview canvas
          previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
          previewCtx.drawImage(stage1Canvas, 0, 0)
        } else if (finalPreviewCtx && finalPreviewCanvas && frame2Image) {
          // Show final composition preview
          renderFinalFrame(finalPreviewCtx, stage1Canvas, frameCount, config)
        }
        
        frameCount++
        
        // Loop the preview
        if (frameCount >= config.durationSeconds * config.fps) {
          frameCount = 0
        }
        
        setPreviewFrame(frameCount)
        animationId = requestAnimationFrame(animate)
      } catch (error) {
        console.error('Preview animation error:', error)
        // Stop animation on error
        setIsPlaying(false)
      }
    }

    animate()

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [isPlaying, project, loadedImages, frame1Image, frame2Image, showFinalPreview])

  const exportWebM = async () => {
    if (!project || loadedImages.length === 0 || !frame1Image) {
      alert('Please ensure all images and Frame 1 are loaded before exporting.')
      return
    }

    // Check if we need Frame 2 for final composition
    if (!frame2Image && project.frame2Url) {
      alert('Please wait for Frame 2 to load before exporting.')
      return
    }

    setIsExporting(true)
    setExportProgress(0)
    setExportedVideoUrl(null)

    try {
      // Create export canvases
      const stage1Canvas = document.createElement('canvas')
      stage1Canvas.width = project.frame1W
      stage1Canvas.height = project.frame1H
      const stage1Ctx = stage1Canvas.getContext('2d')!

      // Determine final export canvas dimensions
      const exportCanvas = document.createElement('canvas')
      const exportCtx = exportCanvas.getContext('2d')!
      
      if (frame2Image && project.frame2W && project.frame2H) {
        // Export final composition (Stage 1 positioned in Frame 2)
        exportCanvas.width = project.frame2W
        exportCanvas.height = project.frame2H
      } else {
        // Export just Stage 1 (slideshow with Frame 1 overlay)
        exportCanvas.width = project.frame1W
        exportCanvas.height = project.frame1H
      }

      const config: RenderConfig = {
        images: loadedImages,
        frame1: frame1Image,
        frame2: frame2Image || undefined,
        frame1W: project.frame1W,
        frame1H: project.frame1H,
        frame2W: project.frame2W,
        frame2H: project.frame2H,
        transition: project.transition,
        transform: project.transform,
        fps: project.export.fps,
        durationSeconds: project.export.durationSeconds
      }

      // Set up MediaRecorder
      const stream = exportCanvas.captureStream(config.fps)
      const chunks: Blob[] = []
      
      // Try different MIME types in order of preference
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ]
      
      let selectedMimeType = 'video/webm'
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType
          break
        }
      }

      const recorder = new MediaRecorder(stream, { 
        mimeType: selectedMimeType,
        videoBitsPerSecond: 5000000 // 5 Mbps
      })

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMimeType })
        const url = URL.createObjectURL(blob)
        setExportedVideoUrl(url)
        setWebmBlob(blob) // Save for potential conversion
        setIsExporting(false)
        setExportProgress(100)
      }

      // Start recording
      recorder.start(250) // 250ms timeslice

      const totalFrames = config.durationSeconds * config.fps
      let currentFrame = 0

      const renderFrame = () => {
        // Always render Stage 1 (slideshow + Frame 1 overlay)
        renderStage1Frame(stage1Ctx, currentFrame, config)
        
        if (frame2Image && project.frame2W && project.frame2H) {
          // Render final composition (Stage 1 positioned in Frame 2)
          renderFinalFrame(exportCtx, stage1Canvas, currentFrame, config)
        } else {
          // Export just Stage 1
          exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height)
          exportCtx.drawImage(stage1Canvas, 0, 0)
        }
        
        currentFrame++
        const progress = (currentFrame / totalFrames) * 100
        setExportProgress(progress)

        if (currentFrame < totalFrames) {
          // Continue rendering
          setTimeout(renderFrame, 1000 / config.fps)
        } else {
          // Finished rendering
          recorder.stop()
        }
      }

      // Start rendering
      renderFrame()

    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  const convertVideo = async () => {
    if (!webmBlob) {
      alert('Please export a WebM video first before converting.')
      return
    }

    if (!canTranscodeToMp4()) {
      alert('Your browser does not support video conversion. Please use a modern browser with SharedArrayBuffer support.')
      return
    }

    setIsConverting(true)
    setConversionProgress(0)
    setConvertedVideoUrl(null)

    try {
      const convertedBlob = await transcodeWebMToMp4({
        webmBlob,
        format: conversionFormat,
        onProgress: (progress) => {
          setConversionProgress(progress)
        },
        onError: (error) => {
          console.error('Conversion error:', error)
          alert(`Conversion failed: ${error.message}`)
        }
      })

      const url = URL.createObjectURL(convertedBlob)
      setConvertedVideoUrl(url)
      setIsConverting(false)
      setConversionProgress(100)

    } catch (error) {
      console.error('Conversion failed:', error)
      alert('Video conversion failed. Please try again.')
      setIsConverting(false)
      setConversionProgress(0)
    }
  }

  const uploadImages = async (files: FileList) => {
    // Prevent multiple simultaneous uploads
    if (uploading) {
      console.log('Upload already in progress, ignoring new upload request')
      return
    }

    setUploading(true)
    const newImages: ProjectImage[] = []
    const failedUploads: string[] = []
    
    // Filter valid image files
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    const totalFiles = validFiles.length
    
    if (totalFiles === 0) {
      setUploading(false)
      alert('No valid image files selected. Please select JPG, PNG, or other image files.')
      return
    }

    console.log(`Starting upload of ${totalFiles} files`)
    setUploadProgress({ current: 0, total: totalFiles, percentage: 0 })

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i]
        
        // Update progress for current file
        setUploadProgress({ 
          current: i, 
          total: totalFiles, 
          percentage: Math.round((i / totalFiles) * 100) 
        })

        const formData = new FormData()
        formData.append('image', file)

        console.log(`Uploading file ${i + 1}/${totalFiles}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        
        try {
          const response = await fetch('/api/imgbb', {
            method: 'POST',
            body: formData
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`✓ Upload successful for ${file.name}:`, data)
            
            newImages.push({
              url: data.url,
              order: (project?.images.length || 0) + newImages.length,
              width: data.width || 0,
              height: data.height || 0
            })
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.error(`✗ Failed to upload ${file.name}:`, response.status, errorData)
            failedUploads.push(`${file.name}: ${errorData.error || response.statusText}`)
          }
        } catch (networkError) {
          console.error(`✗ Network error uploading ${file.name}:`, networkError)
          failedUploads.push(`${file.name}: Network error`)
        }
        
        // Update progress after processing file
        setUploadProgress({ 
          current: i + 1, 
          total: totalFiles, 
          percentage: Math.round(((i + 1) / totalFiles) * 100) 
        })
      }

      // Save successful uploads to database
      if (newImages.length > 0) {
        const existingImages = project?.images || []
        const updatedImages = [...existingImages, ...newImages]
        console.log(`Saving ${newImages.length} new images to database`)
        console.log('Current project state:', project)
        console.log('Existing images:', existingImages.length)
        console.log('New images:', newImages)
        console.log('Updated images array:', updatedImages)
        await saveProject({ images: updatedImages })
        console.log('✓ Images saved to database successfully')
      }
      
      // Show results to user
      if (failedUploads.length > 0) {
        const message = `Upload completed with issues:\n✓ ${newImages.length} images uploaded successfully\n✗ ${failedUploads.length} failed:\n${failedUploads.join('\n')}`
        alert(message)
      } else if (newImages.length > 0) {
        console.log(`✓ All ${newImages.length} images uploaded successfully`)
      } else {
        alert('No images were uploaded successfully. Please check your internet connection and try again.')
      }
      
    } catch (error) {
      console.error('Upload process failed:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      setUploading(false)
      setUploadProgress({ current: 0, total: 0, percentage: 0 })
    }
  }

  const uploadFrame = async (file: File, frameType: 'frame1' | 'frame2') => {
    // Prevent multiple simultaneous uploads
    if (uploading) {
      console.log('Upload already in progress, ignoring frame upload request')
      return
    }

    setUploading(true)
    setUploadProgress({ current: 0, total: 1, percentage: 0 })
    
    try {
      console.log(`Uploading ${frameType}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      
      const formData = new FormData()
      formData.append('image', file)

      setUploadProgress({ current: 0, total: 1, percentage: 25 })

      const response = await fetch('/api/imgbb', {
        method: 'POST',
        body: formData
      })

      setUploadProgress({ current: 0, total: 1, percentage: 50 })

      if (response.ok) {
        const data = await response.json()
        console.log(`✓ ${frameType} upload successful:`, data)
        
        const updates = frameType === 'frame1' 
          ? { frame1Url: data.url, frame1W: data.width, frame1H: data.height }
          : { frame2Url: data.url, frame2W: data.width, frame2H: data.height }
        
        setUploadProgress({ current: 0, total: 1, percentage: 75 })
        await saveProject(updates)
        setUploadProgress({ current: 1, total: 1, percentage: 100 })
        console.log(`✓ ${frameType} saved to database`)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error(`✗ Failed to upload ${frameType}:`, response.status, errorData)
        throw new Error(`Upload failed: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error(`${frameType} upload failed:`, error)
      alert(`Failed to upload ${frameType}: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      setUploading(false)
      setUploadProgress({ current: 0, total: 0, percentage: 0 })
    }
  }

  const removeImage = async (index: number) => {
    if (!project) return
    
    const updatedImages = project.images.filter((_, i) => i !== index)
    // Reorder remaining images
    updatedImages.forEach((img, i) => img.order = i)
    
    await saveProject({ images: updatedImages })
  }

  const reorderImages = async (fromIndex: number, toIndex: number) => {
    if (!project) return
    
    const updatedImages = [...project.images]
    const [movedImage] = updatedImages.splice(fromIndex, 1)
    updatedImages.splice(toIndex, 0, movedImage)
    
    // Update order values
    updatedImages.forEach((img, i) => img.order = i)
    
    await saveProject({ images: updatedImages })
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderImages(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
  }

  if (loading) {
    return <div className="container">Loading project...</div>
  }

  if (!project) {
    return <div className="container">Project not found</div>
  }

  // Ensure project.images is always an array
  if (!project.images) {
    project.images = []
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>{project.name}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => window.history.back()}>
            Back to Projects
          </button>
          <button className="btn btn-primary" disabled={project.images.length < 1}>
            Preview & Export
          </button>
        </div>
      </div>

      {/* Step 1: Upload Images */}
      <div className="card">
        <h2>Step 1: Upload Images</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Current: {project.images.length} images {project.images.length < 2 && '(minimum 2 recommended for transitions)'}
        </p>
        
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          backgroundColor: '#e7f3ff', 
          border: '1px solid #b3d9ff',
          borderRadius: '4px', 
          fontSize: '14px'
        }}>
          💡 <strong>Flexible Image Management:</strong> Add images one by one, remove unwanted ones, and drag to reorder. 
          You can export with any number of images (minimum 1 recommended).
        </div>
        
        <div
          className="upload-zone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const files = e.dataTransfer.files
            if (files.length > 0) uploadImages(files)
          }}
        >
          {uploading ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
                Uploading {uploadProgress.current}/{uploadProgress.total} images
              </p>
              <div style={{ 
                width: '100%', 
                height: '12px', 
                backgroundColor: '#e0e0e0', 
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '8px'
              }}>
                <div style={{
                  width: `${uploadProgress.percentage}%`,
                  height: '100%',
                  backgroundColor: '#007bff',
                  transition: 'width 0.3s ease',
                  borderRadius: '6px'
                }} />
              </div>
              <p style={{ fontSize: '14px', color: '#666' }}>
                {uploadProgress.percentage}% complete
              </p>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                Check browser console for detailed upload logs
              </p>
            </div>
          ) : (
            <>
              <p>Click or drag images here</p>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Supports JPG, PNG, GIF. Multiple files allowed.
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && uploadImages(e.target.files)}
        />

        {/* Image Loading Status */}
        {imageLoadingProgress.total > 0 && (
          <div style={{ 
            marginBottom: '15px', 
            padding: '12px', 
            backgroundColor: '#f0f8ff', 
            border: '1px solid #90caf9',
            borderRadius: '4px'
          }}>
            <p style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#1976d2' }}>
              📥 Loading images for preview: {imageLoadingProgress.loaded}/{imageLoadingProgress.total}
            </p>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(imageLoadingProgress.loaded / imageLoadingProgress.total) * 100}%`,
                height: '100%',
                backgroundColor: '#2196f3',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Images are being loaded with retry logic. This may take a moment...
            </p>
          </div>
        )}

        {/* Image Load Error */}
        {imageLoadError && (
          <div style={{ 
            marginBottom: '15px', 
            padding: '12px', 
            backgroundColor: '#fff3e0', 
            border: '1px solid #ffb74d',
            borderRadius: '4px'
          }}>
            <p style={{ marginBottom: '5px', fontSize: '14px', fontWeight: 'bold', color: '#e65100' }}>
              ⚠️ Image Loading Error
            </p>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              {imageLoadError}
            </p>
            <button 
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '4px 8px' }}
              onClick={() => project && loadImagesForPreview(project)}
            >
              Retry Loading Images
            </button>
          </div>
        )}

        {/* Image Load Success */}
        {project.images.length > 0 && loadedImages.length === project.images.length && !imageLoadError && (
          <div style={{ 
            marginBottom: '15px', 
            padding: '10px', 
            backgroundColor: '#e8f5e9', 
            border: '1px solid #81c784',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#2e7d32'
          }}>
            ✅ All {loadedImages.length} images loaded and ready for preview
          </div>
        )}

        {project.images.length > 0 && (
          <div className="thumbnail-grid">
            {project.images.map((image, index) => (
              <div
                key={index}
                className="thumbnail"
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                <img 
                  src={image.url} 
                  alt={`Image ${index + 1}`} 
                  crossOrigin="anonymous"
                  loading="lazy"
                  onError={(e) => {
                    console.error('Failed to load thumbnail:', image.url)
                    e.currentTarget.style.border = '2px solid #ff9800'
                  }}
                />
                <button
                  className="remove-btn"
                  onClick={() => removeImage(index)}
                >
                  ×
                </button>
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '4px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '12px'
                }}>
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Frame 1 */}
      <div className="card">
        <h2>Step 2: Upload Frame #1 (Slideshow Overlay)</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          PNG with transparency recommended. Defines slideshow dimensions.
        </p>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => frame1InputRef.current?.click()}
            disabled={uploading}
          >
            {uploading && uploadProgress.total === 1 ? 'Uploading Frame #1...' : (project.frame1Url ? 'Replace Frame #1' : 'Upload Frame #1')}
          </button>
          
          {project.frame1Url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={project.frame1Url}
                alt="Frame 1"
                crossOrigin="anonymous"
                loading="lazy"
                style={{ width: '60px', height: '60px', objectFit: 'contain', border: '1px solid #ddd' }}
              />
              <span style={{ fontSize: '14px', color: '#666' }}>
                {project.frame1W} × {project.frame1H}
              </span>
            </div>
          )}
        </div>

        <input
          ref={frame1InputRef}
          type="file"
          accept="image/png,image/gif"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && uploadFrame(e.target.files[0], 'frame1')}
        />
      </div>

      {/* Step 3: Transitions */}
      <div className="card">
        <h2>Step 3: Configure Transitions</h2>
        <div className="controls-panel">
          <div className="control-group">
            <label>Transition Type</label>
            <select
              value={project.transition.type}
              onChange={(e) => saveProject({
                transition: { ...project.transition, type: e.target.value as any }
              })}
            >
              <option value="wipe">Wipe</option>
              <option value="push">Push</option>
              <option value="pull">Pull</option>
              <option value="swipe">Swipe</option>
            </select>
          </div>
          
          <div className="control-group">
            <label>Direction</label>
            <select
              value={project.transition.direction}
              onChange={(e) => saveProject({
                transition: { ...project.transition, direction: e.target.value as any }
              })}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="up">Up</option>
              <option value="down">Down</option>
            </select>
          </div>
          
          <div className="control-group">
            <label>Transition Duration (ms)</label>
            <input
              type="number"
              min="100"
              max="2000"
              step="100"
              value={project.transition.durationMs}
              onChange={(e) => saveProject({
                transition: { ...project.transition, durationMs: parseInt(e.target.value) }
              })}
            />
            
            {/* Warning for excessive transition time */}
            {project.images.length > 0 && (
              (() => {
                const totalTransitionTime = (project.transition.durationMs / 1000) * project.images.length
                const isExcessive = totalTransitionTime > project.export.durationSeconds
                
                return isExcessive ? (
                  <div style={{ 
                    marginTop: '5px', 
                    padding: '8px', 
                    backgroundColor: '#fff3cd', 
                    border: '1px solid #ffeaa7',
                    borderRadius: '4px', 
                    fontSize: '12px',
                    color: '#856404'
                  }}>
                    ⚠️ Transition time will be automatically reduced to fit {project.export.durationSeconds}s duration
                  </div>
                ) : null
              })()
            )}
          </div>
        </div>
      </div>

      {/* Preview Canvas */}
      {project.images.length > 0 && project.frame1Url && (
        <div className="card">
          <h2>Preview</h2>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ position: 'relative' }}>
              {/* Stage 1 Preview */}
              <canvas
                ref={previewCanvasRef}
                width={project.frame1W}
                height={project.frame1H}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  maxWidth: '400px',
                  maxHeight: '400px',
                  display: showFinalPreview ? 'none' : 'block'
                }}
              />
              
              {/* Final Composition Preview */}
              {project.frame2Url && (
                <canvas
                  ref={finalPreviewCanvasRef}
                  width={project.frame2W}
                  height={project.frame2H}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    maxWidth: '400px',
                    maxHeight: '400px',
                    display: showFinalPreview ? 'block' : 'none'
                  }}
                />
              )}
              
              {/* Hidden Stage 1 canvas for composition */}
              <canvas
                ref={stage1CanvasRef}
                width={project.frame1W}
                height={project.frame1H}
                style={{ display: 'none' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={togglePreview}
              >
                {isPlaying ? 'Pause' : 'Play'} Preview
              </button>
              
              {project.frame2Url && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Preview Mode:</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="previewMode"
                      checked={!showFinalPreview}
                      onChange={() => setShowFinalPreview(false)}
                    />
                    Stage 1 (Slideshow + Frame 1)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="previewMode"
                      checked={showFinalPreview}
                      onChange={() => setShowFinalPreview(true)}
                    />
                    Final Composition
                  </label>
                </div>
              )}
              
              <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                <p>Stage 1: {project.frame1W}x{project.frame1H}px</p>
                {project.frame2Url && (
                  <p>Final: {project.frame2W}x{project.frame2H}px</p>
                )}
                <p>Preview scaled to fit 400px</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Frame 2 */}
      <div className="card">
        <h2>Step 4: Upload Frame #2 (Optional - Final Video Frame)</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Optional: PNG with transparency to define final video dimensions and position the slideshow within a larger frame.
          If not provided, the video will export at Frame 1 dimensions.
        </p>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => frame2InputRef.current?.click()}
            disabled={uploading}
          >
            {uploading && uploadProgress.total === 1 ? 'Uploading Frame #2...' : (project.frame2Url ? 'Replace Frame #2' : 'Upload Frame #2')}
          </button>
          
          {project.frame2Url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={project.frame2Url}
                alt="Frame 2"
                crossOrigin="anonymous"
                loading="lazy"
                style={{ width: '60px', height: '60px', objectFit: 'contain', border: '1px solid #ddd' }}
              />
              <span style={{ fontSize: '14px', color: '#666' }}>
                {project.frame2W} × {project.frame2H}
              </span>
            </div>
          )}
        </div>

        <input
          ref={frame2InputRef}
          type="file"
          accept="image/png,image/gif"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && uploadFrame(e.target.files[0], 'frame2')}
        />
      </div>

      {/* Step 5: Transform Controls */}
      {project.frame2Url && (
        <div className="card">
          <h2>Step 5: Position Slideshow in Frame #2</h2>
          <div className="controls-panel">
            <div className="control-group">
              <label>X Position</label>
              <input
                type="number"
                value={project.transform.x}
                onChange={(e) => saveProject({
                  transform: { ...project.transform, x: parseInt(e.target.value) }
                })}
              />
            </div>
            
            <div className="control-group">
              <label>Y Position</label>
              <input
                type="number"
                value={project.transform.y}
                onChange={(e) => saveProject({
                  transform: { ...project.transform, y: parseInt(e.target.value) }
                })}
              />
            </div>
            
            <div className="control-group">
              <label>Scale</label>
              <input
                type="number"
                min="0.1"
                max="3"
                step="0.1"
                value={project.transform.scale}
                onChange={(e) => saveProject({
                  transform: { ...project.transform, scale: parseFloat(e.target.value) }
                })}
              />
            </div>
            
            <div className="control-group">
              <label>Export Duration (seconds)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={project.export.durationSeconds}
                onChange={(e) => saveProject({
                  export: { ...project.export, durationSeconds: parseInt(e.target.value) }
                })}
              />
              
              {/* Timing Information */}
              {project.images.length > 0 && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '12px' }}>
                  <strong>Timing Breakdown:</strong>
                  {(() => {
                    const config: RenderConfig = {
                      images: [],
                      frame1W: project.frame1W,
                      frame1H: project.frame1H,
                      frame2W: project.frame2W,
                      frame2H: project.frame2H,
                      transition: project.transition,
                      transform: project.transform,
                      fps: project.export.fps,
                      durationSeconds: project.export.durationSeconds
                    }
                    config.images = new Array(project.images.length) // Mock array for calculation
                    const timing = calculateTimingInfo(config)
                    
                    return (
                      <div style={{ marginTop: '5px' }}>
                        <div>• Each image shown for: <strong>{timing.holdTimePerImage.toFixed(2)}s</strong></div>
                        <div>• Transition duration: <strong>{timing.transitionTime.toFixed(2)}s</strong></div>
                        <div>• Total cycles: <strong>{timing.totalCycles.toFixed(1)}</strong></div>
                        <div>• {project.images.length} images × {timing.timePerCycle.toFixed(2)}s = <strong>{project.export.durationSeconds}s total</strong></div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Section */}
      {project.images.length >= 1 && project.frame1Url && (
        <div className="card">
          <h2>Step 6: Export Video</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Export your slideshow as a WebM video with {project.images.length} image{project.images.length !== 1 ? 's' : ''}. 
            Duration: {project.export.durationSeconds}s at 30fps.
            {project.frame2Url ? ' Final composition will include Frame 2 positioning.' : ' Exports slideshow with Frame 1 overlay.'}
          </p>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={exportWebM}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export WebM'}
            </button>
            
            {exportProgress > 0 && (
              <div style={{ flex: 1, maxWidth: '200px' }}>
                <div style={{ 
                  width: '100%', 
                  height: '8px', 
                  backgroundColor: '#eee', 
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${exportProgress}%`,
                    height: '100%',
                    backgroundColor: '#007bff',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  {Math.round(exportProgress)}% complete
                </p>
              </div>
            )}
          </div>
          
          {exportedVideoUrl && (
            <div style={{ marginTop: '15px' }}>
              <p style={{ color: '#28a745', marginBottom: '10px' }}>✅ Export complete!</p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <a
                  href={exportedVideoUrl}
                  download={`${project.name}.webm`}
                  className="btn btn-success"
                >
                  Download WebM
                </a>
                <video
                  src={exportedVideoUrl}
                  controls
                  style={{ maxWidth: '300px', maxHeight: '200px' }}
                />
              </div>
            </div>
          )}
          
          {/* Video Conversion Section */}
          {exportedVideoUrl && webmBlob && (
            <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '6px' }}>
              <h3 style={{ marginBottom: '15px' }}>Convert to MP4/MOV</h3>
              
              {!canTranscodeToMp4() && (
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#f8d7da', 
                  border: '1px solid #f5c6cb',
                  borderRadius: '4px', 
                  marginBottom: '15px',
                  color: '#721c24'
                }}>
                  ⚠️ Video conversion is not supported in your browser. Please use a modern browser with SharedArrayBuffer support.
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ marginRight: '10px' }}>Format:</label>
                  <select
                    value={conversionFormat}
                    onChange={(e) => setConversionFormat(e.target.value as 'mp4' | 'mov')}
                    disabled={isConverting}
                    style={{ padding: '5px', marginRight: '10px' }}
                  >
                    <option value="mp4">MP4 (H.264)</option>
                    <option value="mov">MOV (QuickTime)</option>
                  </select>
                </div>
                
                <button
                  className="btn btn-primary"
                  onClick={convertVideo}
                  disabled={isConverting || !canTranscodeToMp4()}
                >
                  {isConverting ? 'Converting...' : `Convert to ${conversionFormat.toUpperCase()}`}
                </button>
                
                {webmBlob && (
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    Estimated size: {getEstimatedOutputSize(webmBlob, conversionFormat)}
                  </span>
                )}
              </div>
              
              {conversionProgress > 0 && isConverting && (
                <div style={{ marginTop: '15px' }}>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    backgroundColor: '#eee', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${conversionProgress}%`,
                      height: '100%',
                      backgroundColor: '#007bff',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    {Math.round(conversionProgress)}% complete
                    {conversionProgress < 20 && ' - Loading ffmpeg...'}
                    {conversionProgress >= 20 && conversionProgress < 90 && ' - Converting...'}
                    {conversionProgress >= 90 && ' - Finalizing...'}
                  </p>
                </div>
              )}
              
              {convertedVideoUrl && (
                <div style={{ marginTop: '15px' }}>
                  <p style={{ color: '#28a745', marginBottom: '10px' }}>✅ Conversion complete!</p>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <a
                      href={convertedVideoUrl}
                      download={`${project.name}.${conversionFormat}`}
                      className="btn btn-success"
                    >
                      Download {conversionFormat.toUpperCase()}
                    </a>
                    <video
                      src={convertedVideoUrl}
                      controls
                      style={{ maxWidth: '300px', maxHeight: '200px' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditorPageContent />
    </Suspense>
  )
}