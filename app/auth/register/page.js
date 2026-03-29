'use client'

import { useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    if (password.length < 6) { setError('Lösenordet måste vara minst 6 tecken.'); setLoading(false); return }
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else setSuccess(true)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>
        <div className="form-card animate-fade-in" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>📧</p>
          <h1 style={{ fontFamily: 'var(--font-heading)', marginBottom: '12px' }}>Kolla din e-post!</h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.65', marginBottom: '28px' }}>
            Vi har skickat en bekräftelse till <strong style={{ color: 'var(--text)' }}>{email}</strong>.<br />Klicka på länken för att aktivera ditt konto.
          </p>
          <Link href="/auth/login" className="btn-primary" style={{ width: '100%', padding: '14px' }}>
            Gå till inloggning
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>
      <div className="form-card animate-fade-in">
        <p style={{ textAlign: 'center', fontSize: '32px', marginBottom: '8px' }}>🌿</p>
        <h1 style={{ fontFamily: 'var(--font-heading)', textAlign: 'center', marginBottom: '4px' }}>Skapa konto</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>Kom igång med Mathandelsagenten</p>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>E-post</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="din@epost.se" className="input" />
          </div>
          <div className="form-group">
            <label>Lösenord</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" placeholder="Minst 6 tecken" className="input" />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px', padding: '10px 12px', background: 'rgba(217,79,59,0.08)', borderRadius: '8px', border: '1px solid rgba(217,79,59,0.2)' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-cta" style={{ width: '100%', marginTop: '8px', padding: '14px' }}>
            {loading ? 'Skapar konto...' : 'Skapa konto gratis'}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
          Har du redan ett konto?{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>Logga in</Link>
        </p>
      </div>
    </div>
  )
}
