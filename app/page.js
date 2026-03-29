'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../components/Spinner'

const supabase = createClient()

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [todayItem, setTodayItem] = useState(null)
  const [weekItems, setWeekItems] = useState([])
  const [shoppingList, setShoppingList] = useState(null)
  const [expiringItems, setExpiringItems] = useState([])
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      const { data: members } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)

      if (!members?.length) { router.push('/household'); return }
      const hid = members[0].household_id
      setHouseholdId(hid)

      // Veckomenyn
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
          .select('recipe_id, custom_title, day_of_week, meal_type, recipes(id, title, description)')
          .eq('menu_id', menu[0].id)
          .order('day_of_week')
        const allItems = items || []
        setWeekItems(allItems)

        const todayDow = getTodayDayOfWeek()
        const todayEntry = allItems.find(i => i.day_of_week === todayDow)
        setTodayItem(todayEntry || null)
      }

      // Senaste inköpslista
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

      // Skafferi — utgår snart
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

      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '12px', color: 'var(--text-muted)' }}>
      <Spinner />Laddar...
    </div>
  )

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'God morgon' : hour < 17 ? 'God eftermiddag' : 'God kväll'

  const DAYS = ['', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
  const todayDow = getTodayDayOfWeek()

  return (
    <div className="page animate-fade-in">
      {/* Hälsning */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', marginBottom: '2px' }}>
          {greeting} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          {getDayName()}, vecka {getWeekNumber()}
        </p>
      </div>

      {/* Ikväll lagar vi */}
      <div style={{ marginBottom: '20px' }}>
        <p className="section-label">👨‍🍳 Ikväll lagar vi</p>
        {todayItem ? (
          <div className="card" style={{ padding: '20px' }}>
            <p style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'var(--font-heading)', marginBottom: '4px', color: 'var(--text)' }}>
              {todayItem.recipes?.title || todayItem.custom_title}
            </p>
            {todayItem.recipes?.description && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>{todayItem.recipes.description}</p>
            )}
            {todayItem.recipes?.id ? (
              <Link href={`/cook/${todayItem.recipes.id}`} className="btn-primary" style={{ fontSize: '14px', padding: '10px 18px' }}>
                Börja laga →
              </Link>
            ) : (
              <Link href="/menu" className="btn-secondary" style={{ fontSize: '14px', padding: '10px 18px' }}>
                Se veckomeny →
              </Link>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Inget planerat för idag</p>
            <Link href="/menu" className="btn-secondary" style={{ fontSize: '13px', padding: '8px 14px' }}>Välj recept →</Link>
          </div>
        )}
      </div>

      {/* Denna vecka */}
      <div style={{ marginBottom: '20px' }}>
        <p className="section-label">📅 Denna vecka</p>
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
                  padding: '6px 2px',
                  borderRadius: '8px',
                  background: isToday ? 'var(--color-forest)' : 'var(--bg)',
                  border: '1px solid var(--border)',
                }}>
                  <p style={{ fontSize: '10px', fontWeight: '600', color: isToday ? '#fff' : 'var(--text-muted)', marginBottom: '2px' }}>{DAYS[dow]}</p>
                  <p style={{ fontSize: '14px' }}>{hasRecipe ? '✅' : '➕'}</p>
                </div>
              )
            })}
          </div>
          <Link href="/menu" style={{ textDecoration: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: '600' }}>
            Planera veckan →
          </Link>
        </div>
      </div>

      {/* Inköpslista */}
      <div style={{ marginBottom: '20px' }}>
        <p className="section-label">🛍️ Inköpslista</p>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {shoppingList ? (
            <>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>{shoppingList.count} varor</p>
                {shoppingList.estimatedCost > 0 && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Est. {shoppingList.estimatedCost} kr</p>
                )}
              </div>
              <Link href="/shopping" className="btn-secondary" style={{ fontSize: '13px', padding: '8px 14px' }}>Öppna listan →</Link>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Ingen aktiv inköpslista</p>
              <Link href="/shopping" className="btn-secondary" style={{ fontSize: '13px', padding: '8px 14px' }}>Skapa lista →</Link>
            </>
          )}
        </div>
      </div>

      {/* Skafferiet — utgår snart */}
      {expiringItems.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p className="section-label">⚠️ Skafferiet</p>
          <div className="card" style={{ padding: '16px 20px' }}>
            {expiringItems.map((item, i) => (
              <p key={i} style={{ fontSize: '14px', color: 'var(--warning)', marginBottom: i < expiringItems.length - 1 ? '4px' : '12px' }}>
                {item.name} — {formatExpiry(item.expires_at)}
              </p>
            ))}
            <Link href="/pantry" style={{ textDecoration: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: '600' }}>
              Se skafferiet →
            </Link>
          </div>
        </div>
      )}

      {/* Panikknapp */}
      <div style={{ marginBottom: '20px' }}>
        <p className="section-label">🆘 Panikknapp</p>
        <Link href="/panic" className="card" style={{
          padding: '16px 20px',
          textDecoration: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>Vad kan jag laga just nu?</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Baserat på vad du har hemma</p>
          </div>
          <span style={{ fontSize: '20px' }}>→</span>
        </Link>
      </div>
    </div>
  )
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
