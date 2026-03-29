'use client'

import { useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)', marginTop: '-104px' }}>
      <div className="form-card animate-fade-in">
        <p style={{ textAlign: 'center', fontSize: '32px', marginBottom: '8px' }}>🛒</p>
        <h1 style={{ fontFamily: 'var(--font-heading)', textAlign: 'center', marginBottom: '4px' }}>Välkommen tillbaka</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>Logga in på Mathandelsagenten</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>E-post</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="din@epost.se" className="input" />
          </div>
          <div className="form-group">
            <label>Lösenord</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" className="input" />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px', padding: '10px 12px', background: 'rgba(217,79,59,0.08)', borderRadius: '8px', border: '1px solid rgba(217,79,59,0.2)' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '8px', padding: '14px' }}>
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
          Inget konto?{' '}
          <Link href="/auth/register" style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>Skapa konto gratis</Link>
        </p>
      </div>
    </div>
  )
}
