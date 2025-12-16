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
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}