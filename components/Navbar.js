'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../lib/supabase'

const supabase = createClient()

const NAV_ITEMS = [
  { href: '/', emoji: '🏠', label: 'Hem' },
  { href: '/menu', emoji: '📅', label: 'Meny' },
  { href: '/recipes', emoji: '📖', label: 'Recept' },
  { href: '/shopping', emoji: '🛍️', label: 'Handla' },
  { href: '/pantry', emoji: '🥦', label: 'Skafferi' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const hide = pathname.startsWith('/auth') || pathname.startsWith('/invite')
  if (hide) return null

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {NAV_ITEMS.map(item => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px 8px', textDecoration: 'none', color: active ? '#000' : '#aaa', fontSize: '11px', gap: '3px', fontWeight: active ? '600' : '400' }}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.emoji}</span>
            {item.label}
          </Link>
        )
      })}
      <button
        onClick={handleLogout}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '11px', gap: '3px' }}
      >
        <span style={{ fontSize: '20px', lineHeight: 1 }}>🚪</span>
        Logga ut
      </button>
    </nav>
  )
}
