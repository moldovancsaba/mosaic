import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    // Upload to imgbb
    const imgbbFormData = new FormData()
    imgbbFormData.append('image', base64)

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
      method: 'POST',
      body: imgbbFormData
    })

    if (!response.ok) {
      throw new Error('Failed to upload to imgbb')
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Upload failed')
    }

    return NextResponse.json({
      url: data.data.url,
      width: data.data.width,
      height: data.data.height,
      size: data.data.size
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }, { status: 500 })
  }
}