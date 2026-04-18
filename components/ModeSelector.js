'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, ShoppingBag, ChefHat, Home } from 'lucide-react'

const MODES = [
  { label: 'Planera', icon: CalendarDays, href: '/menu', paths: ['/menu', '/recipes', '/pantry'] },
  { label: 'Handla', icon: ShoppingBag, href: '/shopping', paths: ['/shopping', '/campaigns'] },
  { label: 'Laga', icon: ChefHat, href: '/cook', paths: ['/cook', '/panic'] },
]

export default function ModeSelector() {
  const pathname = usePathname()

  const hide =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/invite') ||
    /^\/cook\/[^/]+$/.test(pathname)

  if (hide) return null

  function isActive(mode) {
    return mode.paths.some(p => pathname === p || pathname.startsWith(p + '/'))
  }

  return (
    <>
      {/* Desktop/tablet: tab-bar under navbar */}
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
      }} className="mode-top-bar">
        <div style={{ display: 'flex', width: '100%', maxWidth: '400px', gap: '4px' }}>
          {MODES.map(mode => {
            const active = isActive(mode)
            const Icon = mode.icon
            return (
              <Link
                key={mode.href}
                href={mode.href}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
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
                <Icon size={14} />
                {mode.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Mobil: bottom navigation */}
      <nav className="bottom-nav">
        {MODES.map(mode => {
          const active = isActive(mode)
          const Icon = mode.icon
          return (
            <Link
              key={mode.href}
              href={mode.href}
              className={`bottom-nav-item${active ? ' active' : ''}`}
            >
              <Icon size={22} className="icon" />
              {mode.label}
            </Link>
          )
        })}
        <Link
          href="/"
          className={`bottom-nav-item${pathname === '/' ? ' active' : ''}`}
        >
          <Home size={22} className="icon" />
          Hem
        </Link>
      </nav>
    </>
  )
}
