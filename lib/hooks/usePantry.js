'use client'

import useSWR from 'swr'
import { createClient } from '../supabase'

const supabase = createClient()

async function fetchPantryItems(householdId) {
  const { data } = await supabase
    .from('pantry')
    .select('*')
    .eq('household_id', householdId)
    .order('expires_at', { ascending: true, nullsLast: true })
  return data || []
}

export function usePantry(householdId) {
  const { data, error, isLoading, mutate } = useSWR(
    householdId ? ['pantry', householdId] : null,
    () => fetchPantryItems(householdId)
  )

  return {
    items: data ?? [],
    isLoading,
    error,
    mutate,
  }
}
