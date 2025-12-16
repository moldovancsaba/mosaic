'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { renderStage1Frame, renderFinalFrame, RenderConfig, calculateTimingInfo } from '../../src/canvas/renderFrame'

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
  const [showFinalPreview, setShowFinalPreview] = useState(false)

  useEffect(() => {
    if (projectId) {
      loadProject()
    }
  }, [projectId])

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

  const loadImagesForPreview = async (projectData: Project) => {
    // Load main images
    const imagePromises = projectData.images
      .sort((a, b) => a.order - b.order)
      .map(img => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image()
          image.crossOrigin = 'anonymous'
          image.onload = () => resolve(image)
          image.onerror = reject
          image.src = img.url
        })
      })

    try {
      const images = await Promise.all(imagePromises)
      setLoadedImages(images)
    } catch (error) {
      console.error('Failed to load images for preview:', error)
    }

    // Load frame1 if available
    if (projectData.frame1Url) {
      const frame1 = new Image()
      frame1.crossOrigin = 'anonymous'
      frame1.onload = () => setFrame1Image(frame1)
      frame1.src = projectData.frame1Url
    }

    // Load frame2 if available
    if (projectData.frame2Url) {
      const frame2 = new Image()
      frame2.crossOrigin = 'anonymous'
      frame2.onload = () => setFrame2Image(frame2)
      frame2.src = projectData.frame2Url
    }
  }

  const saveProject = async (updates: Partial<Project>) => {
    if (!project) return

    try {
      const response = await fetch(`/api/project?id=${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
        // Reload images when project updates
        loadImagesForPreview(data.project)
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
    if (!isPlaying || !project || loadedImages.length === 0) {
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

  const uploadImages = async (files: FileList) => {
    setUploading(true)
    const newImages: ProjectImage[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) continue

        const formData = new FormData()
        formData.append('image', file)

        const response = await fetch('/api/imgbb', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const data = await response.json()
          newImages.push({
            url: data.url,
            order: (project?.images.length || 0) + newImages.length,
            width: data.width,
            height: data.height
          })
        }
      }

      if (newImages.length > 0) {
        const updatedImages = [...(project?.images || []), ...newImages]
        await saveProject({ images: updatedImages })
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const uploadFrame = async (file: File, frameType: 'frame1' | 'frame2') => {
    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/imgbb', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        const updates = frameType === 'frame1' 
          ? { frame1Url: data.url, frame1W: data.width, frame1H: data.height }
          : { frame2Url: data.url, frame2W: data.width, frame2H: data.height }
        
        await saveProject(updates)
      }
    } catch (error) {
      console.error('Frame upload failed:', error)
    } finally {
      setUploading(false)
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

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>{project.name}</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => window.history.back()}>
            Back to Projects
          </button>
          <button className="btn btn-primary" disabled={project.images.length < 10}>
            Preview & Export
          </button>
        </div>
      </div>

      {/* Step 1: Upload Images */}
      <div className="card">
        <h2>Step 1: Upload Images (10+ required)</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Current: {project.images.length} images
        </p>
        
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
            <p>Uploading...</p>
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
                <img src={image.url} alt={`Image ${index + 1}`} />
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
            {project.frame1Url ? 'Replace Frame #1' : 'Upload Frame #1'}
          </button>
          
          {project.frame1Url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={project.frame1Url}
                alt="Frame 1"
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
            {project.frame2Url ? 'Replace Frame #2' : 'Upload Frame #2'}
          </button>
          
          {project.frame2Url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={project.frame2Url}
                alt="Frame 2"
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
      {project.images.length >= 10 && project.frame1Url && (
        <div className="card">
          <h2>Step 6: Export Video</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Export your slideshow as a WebM video. Duration: {project.export.durationSeconds}s at 30fps.
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
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={exportedVideoUrl}
                  download={`${project.name}.webm`}
                  className="btn btn-success"
                >
                  Download Video
                </a>
                <video
                  src={exportedVideoUrl}
                  controls
                  style={{ maxWidth: '300px', maxHeight: '200px' }}
                />
              </div>
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