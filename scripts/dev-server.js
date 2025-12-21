#!/usr/bin/env node

/**
 * Custom Next.js dev server with port range preference
 * Tries ports 7777-7800 in order until it finds an available one
 */

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const MIN_PORT = 7777
const MAX_PORT = 7800

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer()
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false)
      } else {
        resolve(false)
      }
    })
    
    server.once('listening', () => {
      server.close()
      resolve(true)
    })
    
    server.listen(port, '0.0.0.0')
  })
}

/**
 * Find first available port in range
 */
async function findAvailablePort() {
  for (let port = MIN_PORT; port <= MAX_PORT; port++) {
    const available = await isPortAvailable(port)
    if (available) {
      return port
    }
  }
  return null
}

/**
 * Start the dev server
 */
async function startServer() {
  try {
    console.log('🔍 Finding available port in range 7777-7800...')
    
    const port = await findAvailablePort()
    
    if (!port) {
      console.error('❌ No available ports found in range 7777-7800')
      console.error('   Please free up a port in this range or check if other services are using them.')
      process.exit(1)
    }
    
    console.log(`✅ Found available port: ${port}`)
    console.log('🚀 Starting Next.js development server...\n')
    
    await app.prepare()
    
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('Internal server error')
      }
    })
    
    server.listen(port, '0.0.0.0', (err) => {
      if (err) throw err
      console.log(`┌─────────────────────────────────────────────────┐`)
      console.log(`│                                                 │`)
      console.log(`│   ✨ Next.js ready on http://localhost:${port}   │`)
      console.log(`│                                                 │`)
      console.log(`│   Press Ctrl+C to stop                          │`)
      console.log(`│                                                 │`)
      console.log(`└─────────────────────────────────────────────────┘\n`)
    })
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down gracefully...')
      server.close(() => {
        console.log('✅ Server closed')
        process.exit(0)
      })
    })
    
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down gracefully...')
      server.close(() => {
        console.log('✅ Server closed')
        process.exit(0)
      })
    })
    
  } catch (err) {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  }
}

startServer()
