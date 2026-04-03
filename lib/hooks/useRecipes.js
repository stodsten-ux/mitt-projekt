'use client'

import useSWR from 'swr'
import { createClient } from '../supabase'

const supabase = createClient()

async function fetchRecipes(householdId) {
  const { data } = await supabase
    .from('recipes')
    .select('id, title, description, servings, ai_generated')
    .eq('household_id', householdId)
    .order('id', { ascending: false })
  return data || []
}

async function fetchSharedRecipes() {
  const { data } = await supabase
    .from('shared_recipes')
    .select('id, title, description, servings, published_at, recipe_stats(avg_rating, total_ratings)')
    .order('published_at', { ascending: false })
    .limit(50)
  return data || []
}

async function fetchMyRatings(householdId) {
  const { data } = await supabase
    .from('recipe_ratings')
    .select('shared_recipe_id, rating')
    .eq('household_id', householdId)
  const map = {}
  if (data) data.forEach(r => { map[r.shared_recipe_id] = r.rating })
  return map
}

export function useRecipes(householdId) {
  const { data, error, isLoading, mutate } = useSWR(
    householdId ? ['recipes', householdId] : null,
    () => fetchRecipes(householdId)
  )

  return {
    recipes: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useSharedRecipes() {
  const { data, error, isLoading, mutate } = useSWR(
    'shared-recipes',
    fetchSharedRecipes
  )

  return {
    sharedRecipes: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useMyRatings(householdId) {
  const { data, error, isLoading, mutate } = useSWR(
    householdId ? ['my-ratings', householdId] : null,
    () => fetchMyRatings(householdId)
  )

  return {
    ratings: data ?? {},
    isLoading,
    error,
    mutate,
  }
}
