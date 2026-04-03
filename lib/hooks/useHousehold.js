'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '../supabase'

const supabase = createClient()

async function fetchHousehold() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, householdId: null, householdData: null }

  const { data: members } = await supabase
    .from('household_members')
    .select('household_id, role, households(id, name, display_name, adults, children, weekly_budget)')
    .eq('user_id', user.id)

  if (!members || members.length === 0) {
    return { user, householdId: null, householdData: null }
  }

  const primary = members[0]
  return {
    user,
    householdId: primary.household_id,
    householdData: primary.households,
    allMemberships: members,
  }
}

export function useHousehold({ redirectTo = 'both' } = {}) {
  const router = useRouter()
  const { data, error, isLoading, mutate } = useSWR('household', fetchHousehold)

  useEffect(() => {
    if (isLoading || !data) return
    if (redirectTo === 'none') return

    if (!data.user) {
      router.push('/auth/login')
    } else if (!data.householdId && (redirectTo === 'both' || redirectTo === 'household')) {
      router.push('/household')
    }
  }, [data, isLoading, redirectTo, router])

  return {
    user: data?.user ?? null,
    householdId: data?.householdId ?? null,
    householdData: data?.householdData ?? null,
    allMemberships: data?.allMemberships ?? [],
    isLoading,
    error,
    mutate,
  }
}
