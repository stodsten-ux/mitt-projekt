'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const MODES = [
  { label: '📅 Planera', href: '/menu', paths: ['/menu', '/recipes', '/pantry'] },
  { label: '🛍️ Handla', href: '/shopping', paths: ['/shopping', '/campaigns'] },
  { label: '👨‍🍳 Laga', href: '/cook', paths: ['/cook', '/panic'] },
]

export default function ModeSelector() {
  const pathname = usePathname()

  // Hide on auth pages and the cook step-by-step page
  const hide =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/invite') ||
    /^\/cook\/[^/]+$/.test(pathname)

  if (hide) return null

  function isActive(mode) {
    return mode.paths.some(p => pathname === p || pathname.startsWith(p + '/'))
  }

  return (
    <div style={{
      position: 'fixed',
      top: '56px',
      left: 0,
      right: 0,
      height: '48px',
      background: 'var(--nav-bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99,
      padding: '0 16px',
    }}>
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: '400px',
        gap: '4px',
      }}>
        {MODES.map(mode => {
          const active = isActive(mode)
          return (
            <Link
              key={mode.href}
              href={mode.href}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '36px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: active ? '700' : '500',
                background: active ? 'var(--color-forest)' : 'transparent',
                color: active ? '#FFFFFF' : 'var(--text-muted)',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {mode.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
