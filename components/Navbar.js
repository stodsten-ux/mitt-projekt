'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../lib/supabase'
import ThemeToggle from './ThemeToggle'

const supabase = createClient()

const MODES = [
  { label: '📅 Planera', paths: ['/menu', '/recipes', '/pantry', '/shopping'], href: '/menu' },
  { label: '🛍️ Handla', paths: ['/shopping/active'], href: '/shopping/active' },
  { label: '👨‍🍳 Laga', paths: ['/cook'], href: '/cook' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [household, setHousehold] = useState(null)
  const [householdId, setHouseholdId] = useState(null)

  const hide = pathname.startsWith('/auth') || pathname.startsWith('/invite')

  useEffect(() => {
    if (hide) return
    async function loadHousehold() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: members } = await supabase
        .from('household_members')
        .select('household_id, households(id, display_name, name)')
        .eq('user_id', user.id)
        .limit(1)
      if (members && members.length > 0) {
        setHouseholdId(members[0].household_id)
        setHousehold(members[0].households)
      }
    }
    loadHousehold()
  }, [hide])

  if (hide) return null

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const householdName = household?.display_name || household?.name

  function isActiveMode(mode) {
    return mode.paths.some(p => pathname === p || pathname.startsWith(p + '/'))
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: 'var(--nav-bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 100,
      boxShadow: 'var(--shadow)',
      gap: '12px',
    }}>
      {/* Vänster: appnamn */}
      <Link href="/" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: '700', fontSize: '15px', whiteSpace: 'nowrap', flexShrink: 0 }}>
        🛒 Mathandel
      </Link>

      {/* Mitten: lägestabbar */}
      <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'center' }}>
        {MODES.map(mode => {
          const active = isActiveMode(mode)
          return (
            <Link
              key={mode.href}
              href={mode.href}
              style={{
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: active ? '700' : '500',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--accent-text)' : 'var(--text-muted)',
                border: active ? 'none' : '1px solid transparent',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {mode.label}
            </Link>
          )
        })}
      </div>

      {/* Höger: tema + kampanjer + panik + hushåll + inställningar + logga ut */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
        <ThemeToggle />
        {householdId && (
          <Link href="/campaigns" title="Kampanjer & erbjudanden" style={{ color: 'var(--text-muted)', fontSize: '17px', padding: '6px', lineHeight: 1, textDecoration: 'none' }}>
            🏷️
          </Link>
        )}
        {householdId && (
          <Link href="/panic" title="Vad kan jag laga?" style={{ color: 'var(--text-muted)', fontSize: '17px', padding: '6px', lineHeight: 1, textDecoration: 'none' }}>
            🆘
          </Link>
        )}
        {householdId && (
          <Link
            href={`/household/${householdId}`}
            title={householdName || 'Mitt hushåll'}
            style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '6px 8px', lineHeight: 1, textDecoration: 'none', border: '1px solid var(--border)', borderRadius: '8px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            🏠 {householdName || 'Hushåll'}
          </Link>
        )}
        {!householdId && (
          <Link href="/household" style={{ textDecoration: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: '500' }}>
            Skapa hushåll →
          </Link>
        )}
        <button
          onClick={handleLogout}
          title="Logga ut"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: '6px 8px', borderRadius: '6px' }}
        >
          Logga ut
        </button>
      </div>
    </nav>
  )
}
