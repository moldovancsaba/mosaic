import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'In-Browser Video Composer',
  description: 'Create looping slideshow videos with custom frames and transitions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get version from package.json at build time
  const version = process.env.npm_package_version || '1.0.0'
  
  return (
    <html lang="en">
      <body>
        {children}
        <footer style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          padding: '8px 16px',
          fontSize: '11px',
          color: '#999',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderTopLeftRadius: '4px',
          zIndex: 1000
        }}>
          v{version}
        </footer>
      </body>
    </html>
  )
}
