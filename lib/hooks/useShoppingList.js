'use client'

import useSWR from 'swr'
import { createClient } from '../supabase'

const supabase = createClient()

async function fetchShoppingLists(householdId) {
  const { data } = await supabase
    .from('shopping_lists')
    .select('id, title, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
  return data || []
}

async function fetchShoppingItems(listId) {
  const { data } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('shopping_list_id', listId)
    .order('store')
  return data || []
}

export function useShoppingLists(householdId) {
  const { data, error, isLoading, mutate } = useSWR(
    householdId ? ['shopping-lists', householdId] : null,
    () => fetchShoppingLists(householdId)
  )

  return {
    lists: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useShoppingItems(listId) {
  const { data, error, isLoading, mutate } = useSWR(
    listId ? ['shopping-items', listId] : null,
    () => fetchShoppingItems(listId)
  )

  return {
    items: data ?? [],
    isLoading,
    error,
    mutate,
  }
}
