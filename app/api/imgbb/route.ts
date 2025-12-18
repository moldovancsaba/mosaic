import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.IMGBB_API_KEY) {
      console.error('IMGBB_API_KEY not configured')
      return NextResponse.json({ 
        error: 'Image upload service not configured. Please check server configuration.' 
      }, { status: 500 })
    }

    const formData = await request.formData()
    const image = formData.get('image') as File
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Validate file type
    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (image.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` 
      }, { status: 400 })
    }

    console.log(`Processing upload: ${image.name} (${(image.size / 1024 / 1024).toFixed(2)}MB)`)

    // Convert file to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    // Upload to imgbb
    const imgbbFormData = new FormData()
    imgbbFormData.append('image', base64)

    console.log('Uploading to ImgBB...')
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
      method: 'POST',
      body: imgbbFormData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ImgBB API error:', response.status, response.statusText, errorText)
      throw new Error(`ImgBB API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      console.error('ImgBB upload failed:', data)
      throw new Error(data.error?.message || 'Upload failed')
    }

    console.log('✓ Upload successful:', data.data.url)

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