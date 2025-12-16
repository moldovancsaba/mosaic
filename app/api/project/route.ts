import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import { ProjectCreateRequest } from '@/app/types'

// GET /api/project - List all projects
export async function GET() {
  try {
    await connectDB()
    
    const projects = await Project.find({})
      .sort({ updatedAt: -1 })
      .select('name createdAt updatedAt images')
      .lean()

    // Add imageCount to each project
    const projectsWithCount = projects.map(project => ({
      ...project,
      _id: project._id.toString(),
      imageCount: project.images?.length || 0
    }))

    return NextResponse.json(projectsWithCount)
  } catch (error) {
    console.error('GET /api/project error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/project - Create new project
export async function POST(request: NextRequest) {
  try {
    const body: ProjectCreateRequest = await request.json()
    
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    await connectDB()
    
    const project = new Project({
      name: body.name.trim(),
      images: [],
      transition: {
        type: 'wipe',
        direction: 'right',
        durationMs: 500
      },
      transform: {
        x: 0,
        y: 0,
        scale: 1
      },
      export: {
        durationSeconds: 30,
        fps: 30
      }
    })

    await project.save()

    return NextResponse.json({
      ...project.toObject(),
      _id: project._id.toString(),
      imageCount: 0
    })
  } catch (error) {
    console.error('POST /api/project error:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}