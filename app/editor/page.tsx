'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Project } from '@/app/types'

export default function EditorPage() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) {
      loadProject(projectId)
    } else {
      setError('No project ID provided')
      setLoading(false)
    }
  }, [projectId])

  const loadProject = async (id: string) => {
    try {
      const response = await fetch(`/api/project/${id}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      } else {
        setError('Project not found')
      }
    } catch (error) {
      console.error('Failed to load project:', error)
      setError('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/" className="btn-primary">
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-blue-600 hover:text-blue-700">
                ← Back to Projects
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                {project.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {project.images.length} images
              </span>
              <button className="btn-secondary">Save</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Editor */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel - Upload & Images */}
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Images</h2>
              
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
                <div className="text-gray-500 mb-2">
                  <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Drop images here or click to upload
                </p>
                <p className="text-xs text-gray-500">
                  Upload 10+ images for your slideshow
                </p>
                <button className="btn-primary mt-3">
                  Choose Images
                </button>
              </div>

              {/* Image List */}
              {project.images.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No images uploaded yet
                </div>
              ) : (
                <div className="space-y-2">
                  {project.images.map((image, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0">
                        <img
                          src={image.url}
                          alt={`Image ${index + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Image {index + 1}
                        </p>
                        <p className="text-xs text-gray-500">
                          {image.width} × {image.height}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          ↑
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          ↓
                        </button>
                        <button className="p-1 text-red-400 hover:text-red-600">
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center Panel - Preview */}
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Preview</h2>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">🎬</div>
                  <p>Preview will appear here</p>
                  <p className="text-sm">Upload images to get started</p>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-center gap-2">
                <button className="btn-secondary">⏮</button>
                <button className="btn-primary">▶️</button>
                <button className="btn-secondary">⏭</button>
              </div>
            </div>
          </div>

          {/* Right Panel - Settings */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              
              {/* Frames */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Frames</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frame #1 (Slideshow Container)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Upload Frame #1 PNG</p>
                      <button className="btn-secondary mt-2 text-sm">Choose File</button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frame #2 (Final Output)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Upload Frame #2 PNG</p>
                      <button className="btn-secondary mt-2 text-sm">Choose File</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transitions */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Transitions</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="wipe">Wipe</option>
                      <option value="push">Push</option>
                      <option value="pull">Pull</option>
                      <option value="swipe">Swipe</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Direction
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                      <option value="up">Up</option>
                      <option value="down">Down</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (ms)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="2000"
                      step="100"
                      defaultValue="500"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Export */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Export</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (seconds)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      defaultValue="30"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <button className="w-full btn-primary">
                      Export WebM
                    </button>
                    <button className="w-full btn-secondary">
                      Export MP4 (Slow)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}