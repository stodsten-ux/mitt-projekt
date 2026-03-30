'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem('cookie_consent')) setVisible(true)
    } catch {}
  }, [])

  function accept() {
    try { localStorage.setItem('cookie_consent', 'accepted') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--border)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
    }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, flex: 1, minWidth: '240px' }}>
        Vi använder nödvändiga cookies för att appen ska fungera (inloggning, sessioner).
        Inga spårningscookies. Läs vår{' '}
        <Link href="/integritet" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>integritetspolicy</Link>.
      </p>
      <button
        onClick={accept}
        style={{
          padding: '9px 20px',
          background: 'var(--accent)',
          color: 'var(--accent-text)',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Okej, jag förstår
      </button>
    </div>
  )
}
