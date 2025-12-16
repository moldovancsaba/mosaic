'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Project {
  _id: string
  name: string
  imageCount: number
  createdAt: string
  updatedAt: string
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [newProjectName, setNewProjectName] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/project')
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    if (!newProjectName.trim()) return

    try {
      const response = await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() })
      })

      if (response.ok) {
        const data = await response.json()
        setProjects([data.project, ...projects])
        setNewProjectName('')
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return

    try {
      const response = await fetch(`/api/project?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setProjects(projects.filter(p => p._id !== id))
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px', fontSize: '32px', fontWeight: 'bold' }}>
        In-Browser Video Composer
      </h1>

      {/* Mobile Warning */}
      <div className="mobile-warning" style={{ display: typeof window !== 'undefined' && window.innerWidth < 768 ? 'block' : 'none' }}>
        ⚠️ This app is optimized for desktop. Mobile support is limited.
      </div>

      {/* Create New Project */}
      <div className="card">
        <h2 style={{ marginBottom: '15px' }}>Create New Project</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createProject()}
            style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <button className="btn btn-primary" onClick={createProject}>
            Create Project
          </button>
        </div>
      </div>

      {/* Projects List */}
      <div className="card">
        <h2 style={{ marginBottom: '15px' }}>Your Projects</h2>
        
        {loading ? (
          <p>Loading projects...</p>
        ) : projects.length === 0 ? (
          <p style={{ color: '#666' }}>No projects yet. Create your first project above!</p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {projects.map((project) => (
              <div
                key={project._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  border: '1px solid #eee',
                  borderRadius: '6px'
                }}
              >
                <div>
                  <h3 style={{ marginBottom: '5px' }}>{project.name}</h3>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    {project.imageCount || 0} images • Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Link href={`/editor?id=${project._id}`}>
                    <button className="btn btn-primary">Edit</button>
                  </Link>
                  <button
                    className="btn btn-secondary"
                    onClick={() => deleteProject(project._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature Overview */}
      <div className="card">
        <h2 style={{ marginBottom: '15px' }}>How It Works</h2>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Upload images and arrange them in order (add/remove as needed)</li>
          <li>Upload Frame #1 (PNG with transparency) to define slideshow dimensions</li>
          <li>Configure transitions: wipe, push, pull, or swipe with direction</li>
          <li>Upload Frame #2 (PNG with transparency) for final video dimensions</li>
          <li>Position and scale your slideshow within Frame #2</li>
          <li>Export as WebM video (30 seconds @ 1080p) or optionally convert to MP4</li>
        </ol>
      </div>
    </div>
  )
}