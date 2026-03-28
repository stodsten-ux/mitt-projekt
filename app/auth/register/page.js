'use client'

import { useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: 
'20px' }}>
        <h1>Kolla din e-post! 📧</h1>
        <p>Vi har skickat en bekräftelse till {email}. Klicka på länken 
för att aktivera ditt konto.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' 
}}>
      <h1>Registrera dig</h1>
      <form onSubmit={handleRegister}>
        <div style={{ marginBottom: '16px' }}>
          <label>E-post</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: '8px', 
marginTop: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label>Lösenord</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: '8px', 
marginTop: '4px' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px', background: '#000', 
color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'Registrerar...' : 'Registrera'}
        </button>
      </form>
      <p style={{ marginTop: '16px' }}>
        Har du redan ett konto? <a href="/auth/login">Logga in</a>
      </p>
    </div>
  )
}
