'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../lib/supabase'
import { Home, Settings, ChevronDown, LogOut, RefreshCw, User } from 'lucide-react'

const supabase = createClient()

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [household, setHousehold] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [currentUser, setCurrentUser] = useState(undefined)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const hide = pathname.startsWith('/auth') || pathname.startsWith('/invite')

  useEffect(() => {
    if (hide) return
    async function loadHousehold() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (!user) return
      const { data: members } = await supabase
        .from('household_members')
        .select('household_id, households(id, display_name, name)')
        .eq('user_id', user.id)
        .limit(1)
      if (members?.length > 0) {
        setHouseholdId(members[0].household_id)
        setHousehold(members[0].households)
      }
    }
    loadHousehold()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/auth/login')
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

  const navStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: '56px',
    background: 'rgba(247,243,236,0.88)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    borderBottom: '0.5px solid rgba(45,74,62,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    zIndex: 100,
  }

  const logoStyle = {
    textDecoration: 'none',
    fontFamily: 'var(--font-heading)',
    fontSize: '17px',
    fontWeight: '800',
    color: '#1a2f25',
    letterSpacing: '-0.03em',
  }

  // Ej inloggad — landing navbar
  if (currentUser === null) {
    return (
      <nav style={{ ...navStyle, background: 'transparent', borderBottom: 'none' }}>
        <Link href="/" style={logoStyle}>Mathandel</Link>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/auth/login" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: '500' }}>
            Logga in
          </Link>
          <Link href="/auth/register" className="btn-cta" style={{ fontSize: '13px', padding: '8px 16px' }}>
            Kom igång
          </Link>
        </div>
      </nav>
    )
  }

  if (currentUser === undefined) return null

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const householdName = household?.display_name || household?.name || 'Hushåll'

  return (
    <nav style={navStyle}>
      <Link href="/" style={logoStyle}>Mathandel</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {householdId ? (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="nav-pill"
            >
              <Home size={11} strokeWidth={2.5} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                {householdName}
              </span>
              <ChevronDown size={10} style={{ opacity: 0.6, flexShrink: 0 }} />
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-md)',
                minWidth: '180px',
                overflow: 'hidden',
                zIndex: 200,
              }}>
                <Link href={`/household/${householdId}`} onClick={() => setDropdownOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', textDecoration: 'none', color: 'var(--text)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>
                  <Home size={15} /> Mitt hushåll
                </Link>
                <Link href="/household" onClick={() => setDropdownOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', textDecoration: 'none', color: 'var(--text)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>
                  <RefreshCw size={15} /> Byt hushåll
                </Link>
                <button onClick={handleLogout}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px', textAlign: 'left' }}>
                  <LogOut size={15} /> Logga ut
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/household" className="nav-pill">
            Skapa hushåll
          </Link>
        )}

        <Link
          href={householdId ? `/household/${householdId}` : '/household'}
          className="nav-icon-btn"
          title="Inställningar"
        >
          <Settings size={15} strokeWidth={1.8} />
        </Link>
      </div>
    </nav>
  )
}
