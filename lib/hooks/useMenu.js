'use client'

import useSWR from 'swr'
import { createClient } from '../supabase'

const supabase = createClient()

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

async function fetchMenu(householdId, weekStartStr) {
  const { data: menu } = await supabase
    .from('menus')
    .select('id')
    .eq('household_id', householdId)
    .eq('week_start', weekStartStr)
    .single()

  if (!menu) return { menuId: null, menuItems: {}, menuRecipeIds: {} }

  const { data: items } = await supabase
    .from('menu_items')
    .select('day_of_week, custom_title, recipe_id')
    .eq('menu_id', menu.id)

  const menuItems = {}
  const menuRecipeIds = {}
  if (items) {
    items.forEach(item => {
      menuItems[item.day_of_week] = item.custom_title
      if (item.recipe_id) menuRecipeIds[item.day_of_week] = item.recipe_id
    })
  }

  return { menuId: menu.id, menuItems, menuRecipeIds }
}

export function useMenu(householdId, weekStart) {
  const weekStartStr = weekStart ? formatDate(weekStart) : null
  const { data, error, isLoading, mutate } = useSWR(
    householdId && weekStartStr ? ['menu', householdId, weekStartStr] : null,
    () => fetchMenu(householdId, weekStartStr)
  )

  return {
    menuId: data?.menuId ?? null,
    menuItems: data?.menuItems ?? {},
    menuRecipeIds: data?.menuRecipeIds ?? {},
    isLoading,
    error,
    mutate,
  }
}
