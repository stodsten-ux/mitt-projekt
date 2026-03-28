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
  const router = useRouter()

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    if (password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken.')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>📧</p>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text)' }}>Kolla din e-post!</h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
            Vi har skickat en bekräftelse till <strong style={{ color: 'var(--text)' }}>{email}</strong>. Klicka på länken för att aktivera ditt konto.
          </p>
          <Link href="/auth/login" style={{ display: 'inline-block', padding: '12px 24px', background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
            Gå till inloggning
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '8px', color: 'var(--text)' }}>Skapa konto</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>Mathandelsagenten</p>

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="din@epost.se"
              style={{ display: 'block', width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '15px', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }}
              onFocus={e => e.target.style.outline = '2px solid var(--accent)'}
              onBlur={e => e.target.style.outline = 'none'}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Lösenord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Minst 6 tecken"
              style={{ display: 'block', width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '15px', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }}
              onFocus={e => e.target.style.outline = '2px solid var(--accent)'}
              onBlur={e => e.target.style.outline = 'none'}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px', padding: '10px 12px', background: 'rgba(255,59,48,0.08)', borderRadius: '8px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', marginTop: '8px' }}
          >
            {loading ? 'Skapar konto...' : 'Skapa konto'}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
          Har du redan ett konto?{' '}
          <Link href="/auth/login" style={{ color: 'var(--text)', fontWeight: '500' }}>Logga in</Link>
        </p>
      </div>
    </div>
  )
}
