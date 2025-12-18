'use client'

import { useEffect, useState } from 'react'

export default function TestSABPage() {
  const [info, setInfo] = useState<any>({})

  useEffect(() => {
    setInfo({
      crossOriginIsolated: window.crossOriginIsolated,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      sharedArrayBufferWorks: (() => {
        try {
          new SharedArrayBuffer(1)
          return true
        } catch {
          return false
        }
      })(),
      webAssembly: typeof WebAssembly !== 'undefined',
      userAgent: navigator.userAgent,
      location: window.location.href,
      protocol: window.location.protocol
    })
  }, [])

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h1>SharedArrayBuffer Test</h1>
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <h2>Environment Info</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
          {JSON.stringify(info, null, 2)}
        </pre>
      </div>

      {info.crossOriginIsolated ? (
        <div style={{ background: '#d4edda', padding: '15px', borderRadius: '8px', marginTop: '20px', color: '#155724' }}>
          ✅ crossOriginIsolated: true - SharedArrayBuffer should work
        </div>
      ) : (
        <div style={{ background: '#f8d7da', padding: '15px', borderRadius: '8px', marginTop: '20px', color: '#721c24' }}>
          ❌ crossOriginIsolated: false - SharedArrayBuffer may not work
        </div>
      )}

      {info.sharedArrayBufferWorks ? (
        <div style={{ background: '#d4edda', padding: '15px', borderRadius: '8px', marginTop: '10px', color: '#155724' }}>
          ✅ SharedArrayBuffer works - ffmpeg.wasm should work
        </div>
      ) : (
        <div style={{ background: '#f8d7da', padding: '15px', borderRadius: '8px', marginTop: '10px', color: '#721c24' }}>
          ❌ SharedArrayBuffer doesn&apos;t work - ffmpeg.wasm will fail
          <div style={{ marginTop: '10px', fontSize: '12px' }}>
            <strong>Possible solutions:</strong>
            <ul>
              <li>Make sure you&apos;re accessing via HTTPS (not HTTP)</li>
              <li>Check that COEP and COOP headers are set correctly</li>
              <li>Safari may need specific header values</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
