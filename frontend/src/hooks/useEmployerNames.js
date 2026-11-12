import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'

// The database allows up to this many characters.
export const EMPLOYER_MAX = 120

/** An employer name as saved: trimmed, single spaces, not too long. */
export const tidyEmployer = (name) => (name ?? '').trim().replace(/\s+/g, ' ').slice(0, EMPLOYER_MAX)

/** What two spellings of one employer have in common ("PETRONAS " and "Petronas"). */
export const employerKey = (name) => tidyEmployer(name).toLowerCase()

/**
 * useEmployerNames — the employer names already used, for the whole team, so
 * people pick the same spelling instead of typing a new one. Adds the names
 * on the customers given, so one saved a moment ago shows at once. One entry
 * per name, ignoring capitals, sorted.
 *
 * Loads only while `enabled` (the form is open). If the list can't be loaded,
 * the names on the customers given are still offered.
 */
export function useEmployerNames(customers, { enabled = true } = {}) {
  const { data } = useQuery({
    queryKey: ['employerNames'],
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc('employer_names')
      if (error) throw error
      return (rows ?? []).map((row) => row.name)
    },
    enabled,
    staleTime: 60_000,
  })

  return useMemo(() => {
    const byKey = new Map()
    for (const name of [...(data ?? []), ...customers.map((c) => c.employerName)]) {
      const key = employerKey(name)
      if (key && !byKey.has(key)) byKey.set(key, tidyEmployer(name))
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b))
  }, [data, customers])
}
