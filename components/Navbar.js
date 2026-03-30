'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../lib/supabase'
import { Home, Settings, ChevronDown, LogOut, RefreshCw } from 'lucide-react'

const supabase = createClient()

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [household, setHousehold] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

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

    // Lyssna på auth-händelser — när refresh token är ogiltig skickar
    // Supabase ett SIGNED_OUT-event och vi redirectar till login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/auth/login')
      }
    })
    return () => subscription.unsubscribe()
  }, [hide, router])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (hide) return null

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const householdName = household?.display_name || household?.name || 'Hushåll'

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
      <Link href="/" style={{
        textDecoration: 'none',
        color: 'var(--accent)',
        fontWeight: '700',
        fontSize: '16px',
        fontFamily: 'var(--font-heading)',
        whiteSpace: 'nowrap',
      }}>
        🌿 Mathandel
      </Link>

      {/* Höger: hushållsdropdown + inställningar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {householdId ? (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: '500',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                maxWidth: '160px',
              }}
            >
              <Home size={14} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{householdName}</span>
              <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                boxShadow: 'var(--shadow-hover)',
                minWidth: '180px',
                overflow: 'hidden',
                zIndex: 200,
              }}>
                <Link
                  href={`/household/${householdId}`}
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    textDecoration: 'none',
                    color: 'var(--text)',
                    fontSize: '14px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <Home size={15} /> Mitt hushåll
                </Link>
                <Link
                  href="/household"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    textDecoration: 'none',
                    color: 'var(--text)',
                    fontSize: '14px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <RefreshCw size={15} /> Byt hushåll
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--danger)',
                    fontSize: '14px',
                    textAlign: 'left',
                  }}
                >
                  <LogOut size={15} /> Logga ut
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/household" style={{ textDecoration: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: '500' }}>
            Skapa hushåll →
          </Link>
        )}

        <Link
          href={householdId ? `/household/${householdId}` : '/household'}
          title="Inställningar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            textDecoration: 'none',
            color: 'var(--text-muted)',
          }}
        >
          <Settings size={16} />
        </Link>
      </div>
    </nav>
  )
}
