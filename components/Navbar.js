'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../lib/supabase'
import ThemeToggle from './ThemeToggle'

const supabase = createClient()

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
    }}>
      {/* Vänster: appnamn */}
      <Link href="/" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: '700', fontSize: '16px', whiteSpace: 'nowrap' }}>
        🛒 Mathandelsagenten
      </Link>

      {/* Mitten: hushåll */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {householdId ? (
          <Link
            href={`/household/${householdId}`}
            style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}
          >
            🏠 {householdName || 'Mitt hushåll'}
          </Link>
        ) : (
          <Link
            href="/household"
            style={{ textDecoration: 'none', color: 'var(--accent)', fontSize: '14px', fontWeight: '500' }}
          >
            Skapa hushåll →
          </Link>
        )}
      </div>

      {/* Höger: tema + panik + inställningar + logga ut */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <ThemeToggle />
        {householdId && (
          <Link href="/panic" title="Vad kan jag laga?" style={{ color: 'var(--text-muted)', fontSize: '18px', padding: '6px', lineHeight: 1, textDecoration: 'none' }}>
            🆘
          </Link>
        )}
        {householdId && (
          <Link href={`/household/${householdId}`} title="Inställningar" style={{ color: 'var(--text-muted)', fontSize: '18px', padding: '6px', lineHeight: 1, textDecoration: 'none' }}>
            ⚙️
          </Link>
        )}
        <button
          onClick={handleLogout}
          title="Logga ut"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', padding: '6px 10px', borderRadius: '6px' }}
        >
          Logga ut
        </button>
      </div>
    </nav>
  )
}
