'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'

const supabase = createClient()

export default function InvitePage() {
  const [invite, setInvite] = useState(null)
  const [household, setHousehold] = useState(null)
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // loading | valid | expired | already_member | error
  const [joining, setJoining] = useState(false)
  const router = useRouter()
  const { token } = useParams()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/auth/login?redirect=/invite/${token}`)
        return
      }
      setUser(user)

      const { data: inv } = await supabase
        .from('household_invites')
        .select('*, households(id, display_name, name, adults, children)')
        .eq('token', token)
        .single()

      if (!inv) { setStatus('error'); return }
      if (inv.accepted) { setStatus('expired'); return }
      if (inv.expires_at && new Date(inv.expires_at) < new Date()) { setStatus('expired'); return }

      setInvite(inv)
      setHousehold(inv.households)

      const { data: existing } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', inv.household_id)
        .eq('user_id', user.id)
        .single()

      if (existing) { setStatus('already_member'); return }

      setStatus('valid')
    }
    load()
  }, [token, router])

  async function joinHousehold() {
    setJoining(true)
    await supabase.from('household_members').insert({
      household_id: invite.household_id,
      user_id: user.id,
      role: 'member',
    })
    await supabase.from('household_invites').update({ accepted: true }).eq('id', invite.id)
    router.push('/')
  }

  if (status === 'loading') return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Laddar inbjudan...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', textAlign: 'center' }}>
      {status === 'error' && (
        <>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>❌</p>
          <h1 style={{ marginBottom: '12px' }}>Ogiltig inbjudan</h1>
          <p style={{ color: '#666', marginBottom: '24px' }}>Den här inbjudningslänken finns inte.</p>
          <a href="/" style={{ color: '#000', fontWeight: '500' }}>Gå till startsidan</a>
        </>
      )}

      {status === 'expired' && (
        <>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>⏰</p>
          <h1 style={{ marginBottom: '12px' }}>Inbjudan har gått ut</h1>
          <p style={{ color: '#666', marginBottom: '24px' }}>Den här inbjudan är redan använd eller har gått ut. Be om en ny inbjudan.</p>
          <a href="/" style={{ color: '#000', fontWeight: '500' }}>Gå till startsidan</a>
        </>
      )}

      {status === 'already_member' && (
        <>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>✅</p>
          <h1 style={{ marginBottom: '12px' }}>Du är redan med</h1>
          <p style={{ color: '#666', marginBottom: '24px' }}>Du är redan medlem i {household?.display_name || household?.name}.</p>
          <a href="/" style={{ display: 'inline-block', padding: '12px 24px', background: '#000', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '500' }}>
            Gå till appen
          </a>
        </>
      )}

      {status === 'valid' && household && (
        <>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</p>
          <h1 style={{ marginBottom: '8px', fontSize: '22px' }}>Du är inbjuden!</h1>
          <p style={{ color: '#666', marginBottom: '24px', lineHeight: '1.6' }}>
            Du har blivit inbjuden att gå med i hushållet<br />
            <strong style={{ color: '#000' }}>{household.display_name || household.name}</strong>
            <br />
            <span style={{ fontSize: '14px' }}>{household.adults} vuxna · {household.children} barn</span>
          </p>
          <button
            onClick={joinHousehold}
            disabled={joining}
            style={{ width: '100%', padding: '14px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}
          >
            {joining ? 'Går med...' : 'Gå med i hushållet'}
          </button>
          <a href="/" style={{ color: '#666', fontSize: '14px' }}>Avböj</a>
        </>
      )}
    </div>
  )
}
