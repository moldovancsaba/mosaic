export interface ProjectImage {
  url: string
  order: number
  width: number
  height: number
}

export interface Project {
  _id?: string
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
  createdAt?: string
  updatedAt?: string
}

/**
 * Create a new project
 */
export async function createProject(name: string): Promise<Project> {
  const response = await fetch('/api/project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create project')
  }

  const data = await response.json()
  return data.project
}

/**
 * Get all projects
 */
export async function getProjects(): Promise<Project[]> {
  const response = await fetch('/api/project')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to load projects')
  }

  const data = await response.json()
  return data.projects || []
}

/**
 * Get a single project by ID
 */
export async function getProject(id: string): Promise<Project> {
  const response = await fetch(`/api/project?id=${id}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to load project')
  }

  const data = await response.json()
  return data.project
}

/**
 * Update a project
 */
export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const response = await fetch(`/api/project?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update project')
  }

  const data = await response.json()
  return data.project
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/project?id=${id}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete project')
  }
}