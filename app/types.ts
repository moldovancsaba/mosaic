export interface ProjectImage {
  url: string
  order: number
  width: number
  height: number
}

export interface TransitionConfig {
  type: 'wipe' | 'push' | 'pull' | 'swipe'
  direction: 'left' | 'right' | 'up' | 'down'
  durationMs: number
}

export interface Transform {
  x: number
  y: number
  scale: number
}

export interface ExportConfig {
  durationSeconds: number
  fps: number
}

export interface Project {
  _id?: string
  name: string
  version: string // Application version when project was created/updated
  images: ProjectImage[]
  frame1Url?: string
  frame1W?: number
  frame1H?: number
  frame2Url?: string
  frame2W?: number
  frame2H?: number
  transition: TransitionConfig
  transform: Transform
  export: ExportConfig
  createdAt: string
  updatedAt: string
}

export interface ProjectCreateRequest {
  name: string
}

export interface ProjectUpdateRequest {
  name?: string
  images?: ProjectImage[]
  frame1Url?: string
  frame1W?: number
  frame1H?: number
  frame2Url?: string
  frame2W?: number
  frame2H?: number
  transition?: TransitionConfig
  transform?: Transform
  export?: ExportConfig
}