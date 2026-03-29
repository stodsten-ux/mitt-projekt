'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../../components/Spinner'

const supabase = createClient()

export default function CookPage() {
  const [user, setUser] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [recipe, setRecipe] = useState(null)
  const [steps, setSteps] = useState([])
  const [loadingSteps, setLoadingSteps] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [servings, setServings] = useState(null)
  const [done, setDone] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [savingRating, setSavingRating] = useState(false)
  const [ratedDone, setRatedDone] = useState(false)
  // Timer
  const [timerSeconds, setTimerSeconds] = useState(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerDone, setTimerDone] = useState(false)
  const timerRef = useRef(null)
  // Substitut
  const [substitutIngredient, setSubstitutIngredient] = useState(null)
  const [substitutText, setSubstitutText] = useState('')
  const [loadingSubstitut, setLoadingSubstitut] = useState(false)
  // Röst
  const [voiceActive, setVoiceActive] = useState(false)
  const recognitionRef = useRef(null)
  const wakeLockRef = useRef(null)
  const router = useRouter()
  const { recipeId } = useParams()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      const { data: members } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).limit(1)
      if (!members?.length) { router.push('/household'); return }
      const hid = members[0].household_id
      setHouseholdId(hid)
      const { data: r } = await supabase.from('recipes').select('*').eq('id', recipeId).eq('household_id', hid).single()
      if (!r) { router.push('/recipes'); return }
      setRecipe(r)
      setServings(r.servings || 4)
      // Ladda/parsea steg
      setLoadingSteps(true)
      if (Array.isArray(r.steps) && r.steps.length > 0) {
        setSteps(r.steps)
      } else {
        const res = await fetch('/api/cook/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeId, householdId: hid }),
        })
        const data = await res.json()
        if (data.steps) setSteps(data.steps)
      }
      setLoadingSteps(false)
      setLoading(false)
    }
    load()
  }, [recipeId, router])

  // Wake Lock
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    navigator.wakeLock.request('screen').then(wl => { wakeLockRef.current = wl }).catch(() => {})
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        navigator.wakeLock.request('screen').then(wl => { wakeLockRef.current = wl }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      wakeLockRef.current?.release()
    }
  }, [])

  // Timer
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => {
          if (s <= 1) {
            clearInterval(timerRef.current)
            setTimerRunning(false)
            setTimerDone(true)
            // Notifikation
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Timer klar! 🍳', { body: `Steget "${steps[currentStep]?.text?.slice(0, 50)}" är klart.` })
            } else {
              // Fallback: alert om notifikationer inte är tillgängliga
              setTimeout(() => alert('⏱️ Timer klar!'), 100)
            }
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [timerRunning])

  function startTimer(seconds) {
    setTimerSeconds(seconds)
    setTimerRunning(true)
    setTimerDone(false)
    // Be om notifikationstillstånd
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // Stegnavigering
  function goNext() {
    clearInterval(timerRef.current)
    setTimerRunning(false)
    setTimerSeconds(null)
    setTimerDone(false)
    setSubstitutIngredient(null)
    setSubstitutText('')
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      setDone(true)
    }
  }

  function goPrev() {
    clearInterval(timerRef.current)
    setTimerRunning(false)
    setTimerSeconds(null)
    setTimerDone(false)
    setSubstitutIngredient(null)
    setSubstitutText('')
    setCurrentStep(s => Math.max(0, s - 1))
  }

  // Substitut via AI
  async function askSubstitut(ingredientName) {
    if (substitutIngredient === ingredientName) { setSubstitutIngredient(null); return }
    setSubstitutIngredient(ingredientName)
    setSubstitutText('')
    setLoadingSubstitut(true)
    const prefs = recipe?.household_id
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Vad kan jag använda istället för ${ingredientName} i "${recipe.title}"? Ge ett kort praktiskt svar på max 2 meningar.`,
        householdId,
      }),
    })
    const data = await res.json()
    setSubstitutText(data.content || 'Inget substitut hittades.')
    setLoadingSubstitut(false)
  }

  // Röststyrning
  function toggleVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Röststyrning stöds inte i den här webbläsaren.')
      return
    }
    if (voiceActive) {
      recognitionRef.current?.stop()
      setVoiceActive(false)
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'sv-SE'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase().trim()
      if (transcript.includes('nästa')) goNext()
      else if (transcript.includes('föregående') || transcript.includes('bakåt')) goPrev()
      else if (transcript.includes('starta timer')) {
        const step = steps[currentStep]
        if (step?.timer_seconds) startTimer(step.timer_seconds)
      } else if (transcript.includes('stoppa timer')) {
        clearInterval(timerRef.current)
        setTimerRunning(false)
      }
    }
    recognition.onerror = () => setVoiceActive(false)
    recognition.onend = () => setVoiceActive(false)
    recognition.start()
    recognitionRef.current = recognition
    setVoiceActive(true)
  }

  // Portionsskalning
  const baseServings = recipe?.servings || 4
  const ratio = servings / baseServings
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : []

  function scaleQuantity(quantity) {
    if (!quantity || ratio === 1) return quantity
    const match = String(quantity).match(/^([\d.,]+)(.*)/)
    if (!match) return quantity
    const scaled = parseFloat(match[1].replace(',', '.')) * ratio
    return `${Math.round(scaled * 10) / 10}${match[2]}`
  }

  // Betygsättning
  async function saveRating() {
    if (!rating) return
    setSavingRating(true)
    await supabase.from('meal_ratings').upsert(
      { recipe_id: parseInt(recipeId), household_id: householdId, user_id: user.id, rating, comment: ratingComment || null },
      { onConflict: 'recipe_id,household_id,user_id' }
    )
    setSavingRating(false)
    setRatedDone(true)
  }

  // Lägg rester i skafferi
  async function saveToPantry() {
    const rows = ingredients.map(ing => {
      const name = typeof ing === 'string' ? ing : ing.name
      const qty = typeof ing === 'object' ? ing.quantity : null
      const unit = typeof ing === 'object' ? ing.unit : null
      return { household_id: householdId, name, quantity: qty || null, unit: unit || null }
    }).filter(r => r.name)
    if (rows.length > 0) await supabase.from('pantry').insert(rows)
    alert('Ingredienserna sparades i skafferiet!')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px', color: 'var(--text-muted)' }}>
      <Spinner />Förbereder recept...
    </div>
  )

  // ---- KLAR-skärm med betyg ----
  if (done) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: '56px', marginBottom: '16px' }}>🍽️</p>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>Smaklig måltid!</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>{recipe.title}</p>

        {!ratedDone ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
            <p style={{ fontWeight: '600', marginBottom: '16px', color: 'var(--text)', fontSize: '16px' }}>Hur smakade det?</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '36px', opacity: star <= rating ? 1 : 0.2, transition: 'opacity 0.15s' }}>⭐</button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              placeholder='Valfri kommentar: "Barnen tyckte om den!"'
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', minHeight: '70px', boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <button
              onClick={saveRating}
              disabled={!rating || savingRating}
              style={{ width: '100%', padding: '14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '10px', cursor: rating ? 'pointer' : 'default', fontSize: '15px', fontWeight: '600', opacity: rating ? 1 : 0.4, marginBottom: '10px' }}
            >
              {savingRating ? <><Spinner />&nbsp;Sparar...</> : 'Spara betyg'}
            </button>
            <button onClick={() => setRatedDone(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}>
              Hoppa över
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rating > 0 && <p style={{ color: 'var(--success)', fontSize: '15px', fontWeight: '500' }}>✓ Betyg sparat!</p>}
            <button onClick={saveToPantry} style={{ padding: '14px', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '500' }}>
              📦 Spara rester i skafferiet
            </button>
            <Link href={`/recipes/${recipeId}`} style={{ padding: '14px', background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: '10px', textDecoration: 'none', fontSize: '15px', fontWeight: '600', display: 'block' }}>
              ← Tillbaka till receptet
            </Link>
          </div>
        )}
      </div>
    )
  }

  const step = steps[currentStep]
  const stepProgress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px 40px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Link href={`/recipes/${recipeId}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>← Receptet</Link>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Portionsjustering */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 8px' }}>
            <button onClick={() => setServings(s => Math.max(1, s - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text)', padding: '2px 4px', lineHeight: 1 }}>−</button>
            <span style={{ fontSize: '13px', color: 'var(--text)', minWidth: '60px', textAlign: 'center' }}>🍽️ {servings} port.</span>
            <button onClick={() => setServings(s => s + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text)', padding: '2px 4px', lineHeight: 1 }}>+</button>
          </div>
          {/* Röststyrning */}
          <button
            onClick={toggleVoice}
            title={voiceActive ? 'Stäng av röststyrning' : 'Aktivera röststyrning'}
            style={{ padding: '8px 10px', background: voiceActive ? 'var(--accent)' : 'var(--bg-card)', color: voiceActive ? 'var(--accent-text)' : 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
          >
            🎤
          </button>
        </div>
      </div>

      <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>{recipe.title}</h1>

      {/* Stegprogressbar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {loadingSteps ? 'Förbereder steg...' : `Steg ${currentStep + 1} av ${steps.length}`}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{Math.round(stepProgress)}%</span>
        </div>
        <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${stepProgress}%`, background: 'var(--accent)', borderRadius: '3px', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Aktivt steg */}
      {loadingSteps ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-muted)' }}>
          <Spinner />Parsear instruktioner med AI...
        </div>
      ) : step ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px 24px', marginBottom: '20px' }}>
            <p style={{ fontSize: '20px', lineHeight: '1.7', color: 'var(--text)', fontWeight: '400' }}>{step.text}</p>

            {/* Timer */}
            {step.timer_seconds && (
              <div style={{ marginTop: '20px' }}>
                {timerSeconds === null || timerSeconds === 0 ? (
                  <button
                    onClick={() => startTimer(step.timer_seconds)}
                    style={{ padding: '10px 18px', background: 'rgba(255,149,0,0.1)', color: 'var(--warning)', border: '1px solid var(--warning)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
                  >
                    ⏱️ Starta timer {Math.floor(step.timer_seconds / 60)} min
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '28px', fontWeight: '700', color: timerDone ? 'var(--success)' : 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>
                      {timerDone ? '✅ Klar!' : formatTime(timerSeconds)}
                    </span>
                    {!timerDone && (
                      <button
                        onClick={() => { clearInterval(timerRef.current); setTimerRunning(false); setTimerSeconds(null) }}
                        style={{ padding: '6px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }}
                      >
                        Stoppa
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ingredienslista med substitut */}
          {ingredients.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Ingredienser</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {ingredients.map((ing, i) => {
                  const name = typeof ing === 'string' ? ing : ing.name
                  const qty = typeof ing === 'object' ? ing.quantity : null
                  const unit = typeof ing === 'object' ? ing.unit : null
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', color: 'var(--text)' }}>{name}</span>
                          <button
                            onClick={() => askSubstitut(name)}
                            title="Vad kan jag använda istället?"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.5, padding: '0 2px', lineHeight: 1 }}
                          >
                            💡
                          </button>
                        </div>
                        {qty && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{scaleQuantity(qty)}{unit ? ` ${unit}` : ''}</span>}
                      </div>
                      {substitutIngredient === name && (
                        <div style={{ marginTop: '6px', padding: '8px 12px', background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--text)' }}>
                          {loadingSubstitut ? <><Spinner />&nbsp;Frågar AI...</> : substitutText}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Navigeringsknappar */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={goPrev}
              disabled={currentStep === 0}
              style={{ flex: 1, padding: '16px', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px', cursor: currentStep === 0 ? 'default' : 'pointer', fontSize: '15px', fontWeight: '500', opacity: currentStep === 0 ? 0.3 : 1 }}
            >
              ← Föregående
            </button>
            <button
              onClick={goNext}
              style={{ flex: 2, padding: '16px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: '700' }}
            >
              {currentStep === steps.length - 1 ? '✅ Klart!' : 'Nästa steg →'}
            </button>
          </div>

          {/* Röststyrningsinfo */}
          {voiceActive && (
            <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              🎤 Röststyrning aktiv — säg "nästa", "föregående" eller "starta timer"
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <p>Inga steg hittades. <Link href={`/recipes/${recipeId}`} style={{ color: 'var(--accent)' }}>Gå tillbaka till receptet.</Link></p>
        </div>
      )}
    </div>
  )
}
