import { NextRequest, NextResponse } from 'next/server'
import { MongoClient, ObjectId } from 'mongodb'
import packageJson from '../../../package.json'

const client = new MongoClient(process.env.MONGODB_URI!)
let isConnected = false

async function connectToDatabase() {
  if (!isConnected) {
    await client.connect()
    isConnected = true
  }
  return client.db('video-composer')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const db = await connectToDatabase()
    const collection = db.collection('projects')

    if (id) {
      // Get single project
      const project = await collection.findOne({ _id: new ObjectId(id) })
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      return NextResponse.json({ project })
    } else {
      // Get all projects
      const projects = await collection
        .find({})
        .sort({ updatedAt: -1 })
        .toArray()
      
      return NextResponse.json({ projects })
    }
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const db = await connectToDatabase()
    const collection = db.collection('projects')

    const project = {
      name: name.trim(),
      version: packageJson.version, // Track app version for compatibility
      images: [],
      frame1Url: '',
      frame1W: 0,
      frame1H: 0,
      frame2Url: '',
      frame2W: 0,
      frame2H: 0,
      transition: {
        type: 'wipe' as const,
        direction: 'right' as const,
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
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await collection.insertOne(project)
    const createdProject = { ...project, _id: result.insertedId }

    return NextResponse.json({ project: createdProject }, { status: 201 })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const updateData = {
      ...body,
      version: packageJson.version, // Update version on every save
      updatedAt: new Date().toISOString()
    }

    const db = await connectToDatabase()
    const collection = db.collection('projects')

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const updatedProject = await collection.findOne({ _id: new ObjectId(id) })
    return NextResponse.json({ project: updatedProject })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const db = await connectToDatabase()
    const collection = db.collection('projects')

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}