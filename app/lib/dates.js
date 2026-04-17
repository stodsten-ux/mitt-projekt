export function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

// Returnerar söndagen (sista dagen i ISO-veckan) för ett givet datum, som YYYY-MM-DD
export function getWeekSunday(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() // 0=sön, 1=mån, ..., 6=lör
  const daysUntilSunday = day === 0 ? 0 : 7 - day
  d.setUTCDate(d.getUTCDate() + daysUntilSunday)
  return d.toISOString().split('T')[0]
}
