'use client'

import { useState } from 'react'
import { z } from 'zod'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

const loginSchema = z.object({
  email: z.string().email('Ange en giltig e-postadress'),
  password: z.string().min(1, 'Lösenord krävs'),
})

const fieldErrorStyle = { color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setFormError(null)

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors
      setErrors({ email: flat.email?.[0], password: flat.password?.[0] })
      return
    }
    setErrors({})
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setFormError(error.message); setLoading(false) }
    else router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)', marginTop: '-104px' }}>
      <div className="form-card animate-fade-in">
        <p style={{ textAlign: 'center', fontSize: '32px', marginBottom: '8px' }}>🛒</p>
        <h1 style={{ fontFamily: 'var(--font-heading)', textAlign: 'center', marginBottom: '4px' }}>Välkommen tillbaka</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>Logga in på Mathandelsagenten</p>

        <form onSubmit={handleLogin} noValidate>
          <div className="form-group">
            <label>E-post</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="din@epost.se" className="input" />
            {errors.email && <p style={fieldErrorStyle}>{errors.email}</p>}
          </div>
          <div className="form-group">
            <label>Lösenord</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" className="input" />
            {errors.password && <p style={fieldErrorStyle}>{errors.password}</p>}
          </div>

          {formError && (
            <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px', padding: '10px 12px', background: 'rgba(217,79,59,0.08)', borderRadius: '8px', border: '1px solid rgba(217,79,59,0.2)' }}>
              {formError}
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
