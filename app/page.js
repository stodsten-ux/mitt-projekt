'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton'
import { getFallbackImage } from '../lib/images'
import { ChefHat, CalendarDays, ShoppingBag, AlertCircle, ChevronRight } from 'lucide-react'
import { useHousehold } from '../lib/hooks/useHousehold'
import Landing from '../components/Landing'

const supabase = createClient()

export default function DashboardPage() {
  const { user, householdId, isLoading: authLoading } = useHousehold({ redirectTo: 'none' })
  const router = useRouter()
  const [dataLoading, setDataLoading] = useState(false)
  const [todayItem, setTodayItem] = useState(null)
  const [weekItems, setWeekItems] = useState([])
  const [shoppingList, setShoppingList] = useState(null)
  const [expiringItems, setExpiringItems] = useState([])

  const loading = authLoading || dataLoading

  useEffect(() => {
    if (authLoading) return
    if (user && !householdId) router.push('/onboarding')
  }, [user, householdId, authLoading, router])

  useEffect(() => {
    if (!householdId) return

    async function load() {
      setDataLoading(true)
      const hid = householdId

      const weekStart = getWeekStart()
      const { data: menu } = await supabase
        .from('menus')
        .select('id')
        .eq('household_id', hid)
        .gte('week_start', weekStart)
        .limit(1)

      if (menu?.length) {
        const { data: items } = await supabase
          .from('menu_items')
          .select('recipe_id, custom_title, day_of_week, recipes(id, title, description)')
          .eq('menu_id', menu[0].id)
          .order('day_of_week')
        const allItems = items || []
        setWeekItems(allItems)
        const todayDow = getTodayDayOfWeek()
        setTodayItem(allItems.find(i => i.day_of_week === todayDow) || null)
      }

      const { data: lists } = await supabase
        .from('shopping_lists')
        .select('id, title')
        .eq('household_id', hid)
        .order('id', { ascending: false })
        .limit(1)

      if (lists?.length) {
        const { data: sitems } = await supabase
          .from('shopping_items')
          .select('id, checked, price')
          .eq('shopping_list_id', lists[0].id)
        const total = sitems?.reduce((s, i) => s + (i.price || 0), 0) || 0
        setShoppingList({ ...lists[0], count: sitems?.length || 0, estimatedCost: Math.round(total) })
      }

      const soon = new Date()
      soon.setDate(soon.getDate() + 2)
      const { data: pantry } = await supabase
        .from('pantry')
        .select('name, expires_at')
        .eq('household_id', hid)
        .not('expires_at', 'is', null)
        .lte('expires_at', soon.toISOString().split('T')[0])
        .order('expires_at')
        .limit(3)
      setExpiringItems(pantry || [])

      setDataLoading(false)
    }
    load()
  }, [householdId])

  if (!authLoading && !user) return <Landing />
  if (!authLoading && user && !householdId) return <DashboardSkeleton />

  if (loading) return <DashboardSkeleton />

  const hour = new Date().getHours()
  const { greeting, heroGradient } = getGreeting(hour)

  const DAYS = ['', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
  const todayDow = getTodayDayOfWeek()

  const todayTitle = todayItem?.recipes?.title || todayItem?.custom_title
  const heroImage = todayTitle ? getFallbackImage(todayTitle) : getFallbackImage('mat')

  return (
    <div className="page animate-fade-in">

      {/* ── Hero-sektion ── */}
      <div style={{
        background: `linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.62)), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '20px',
        padding: '32px 28px',
        color: '#fff',
        marginBottom: '24px',
      }}>
        <p className="t-eyebrow" style={{ color: 'rgba(255,255,255,0.65)', marginBottom: '6px' }}>
          {getDayName()} · vecka {getWeekNumber()}
        </p>
        <h1 className="t-display" style={{ color: '#fff', marginBottom: '20px' }}>
          {greeting} 👋
        </h1>

        {todayTitle ? (
          <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)', borderRadius: '14px', padding: '16px 18px' }}>
            <p className="t-display-italic" style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
              Ikväll lagar vi
            </p>
            <p style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'var(--font-heading)', marginBottom: '12px' }}>{todayTitle}</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {todayItem?.recipes?.id ? (
                <Link
                  href={`/recipes/${todayItem.recipes.id}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', color: 'var(--color-forest)', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '700' }}
                >
                  Visa recept <ChevronRight size={14} />
                </Link>
              ) : (
                <Link href="/menu" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                  Se meny <ChevronRight size={14} />
                </Link>
              )}
              {todayItem?.recipes?.id && (
                <Link
                  href={`/cook/${todayItem.recipes.id}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}
                >
                  <ChefHat size={14} /> Börja laga
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)', borderRadius: '14px', padding: '16px 18px' }}>
            <p style={{ fontSize: '14px', opacity: 0.85, marginBottom: '10px' }}>Inget planerat för idag</p>
            <Link href="/menu" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
              <CalendarDays size={14} /> Planera veckan
            </Link>
          </div>
        )}
      </div>

      {/* ── Denna vecka ── */}
      <div style={{ marginBottom: '20px' }}>
        <p className="section-label">Denna vecka</p>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {[1,2,3,4,5,6,7].map(dow => {
              const item = weekItems.find(i => i.day_of_week === dow)
              const hasRecipe = item?.recipe_id != null
              const isToday = dow === todayDow
              return (
                <div key={dow} style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '7px 2px',
                  borderRadius: '8px',
                  background: isToday ? 'var(--color-forest)' : 'var(--bg)',
                  border: '1px solid var(--border)',
                }}>
                  <p style={{ fontSize: '10px', fontWeight: '600', color: isToday ? '#fff' : 'var(--text-muted)', marginBottom: '3px' }}>{DAYS[dow]}</p>
                  <p style={{ fontSize: '13px' }}>{hasRecipe ? '✅' : '➕'}</p>
                </div>
              )
            })}
          </div>
          <Link href="/menu" style={{ textDecoration: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CalendarDays size={13} /> Planera veckan
          </Link>
        </div>
      </div>

      {/* ── Inköpslista ── */}
      <div style={{ marginBottom: '20px' }}>
        <p className="section-label">Inköpslista</p>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {shoppingList ? (
              <>
                <p className="t-body-medium">{shoppingList.count} varor</p>
                {shoppingList.estimatedCost > 0 && (
                  <p className="t-muted">Est. {shoppingList.estimatedCost} kr</p>
                )}
              </>
            ) : (
              <p className="t-muted">Ingen aktiv inköpslista</p>
            )}
          </div>
          <Link href="/shopping" className="btn-secondary" style={{ fontSize: '13px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <ShoppingBag size={13} /> {shoppingList ? 'Öppna' : 'Skapa'}
          </Link>
        </div>
      </div>

      {/* ── Skafferiet — utgående varor ── */}
      {expiringItems.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p className="section-label">Skafferiet — går ut snart</p>
          <div className="card" style={{ padding: '16px 20px' }}>
            {expiringItems.map((item, i) => (
              <p key={i} style={{ fontSize: '14px', color: 'var(--warning)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} /> {item.name} — {formatExpiry(item.expires_at)}
              </p>
            ))}
            <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
              <Link
                href={`/panic?items=${expiringItems.map(i => encodeURIComponent(i.name)).join(',')}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}
              >
                <AlertCircle size={13} /> Vad kan jag laga?
              </Link>
              <Link href="/pantry" style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-muted)', fontSize: '13px' }}>
                Se skafferiet →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Panikknapp ── */}
      <div style={{ marginBottom: '20px' }}>
        <Link href="/panic" className="card" style={{
          padding: '16px 20px',
          textDecoration: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <AlertCircle size={16} style={{ color: 'var(--danger)' }} /> Vad kan jag laga just nu?
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Baserat på vad du har hemma</p>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </Link>
      </div>
    </div>
  )
}

function getGreeting(hour) {
  if (hour < 5)  return { greeting: 'God natt',        heroGradient: 'from-slate-900 to-slate-700' }
  if (hour < 10) return { greeting: 'God morgon',      heroGradient: 'from-amber-400 to-orange-500' }
  if (hour < 12) return { greeting: 'God förmiddag',   heroGradient: 'from-yellow-400 to-amber-500' }
  if (hour < 17) return { greeting: 'God eftermiddag', heroGradient: 'from-green-700 to-emerald-600' }
  if (hour < 21) return { greeting: 'God kväll',       heroGradient: 'from-orange-500 to-red-600' }
  return           { greeting: 'God kväll',             heroGradient: 'from-indigo-800 to-purple-900' }
}

function getWeekStart() {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

function getTodayDayOfWeek() {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

function getDayName() {
  const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
  return days[new Date().getDay()]
}

function getWeekNumber() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

function formatExpiry(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(dateStr)
  const diff = Math.round((exp - today) / 86400000)
  if (diff < 0) return 'utgånget'
  if (diff === 0) return 'går ut idag'
  if (diff === 1) return 'går ut imorgon'
  return `går ut om ${diff} dagar`
}
