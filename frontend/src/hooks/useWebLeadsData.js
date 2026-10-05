import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useEffect } from 'react'

/**
 * useWebLeadsData — inbound enquiries from the FZS landing page.
 *
 * These live in `web_leads`, a pool kept deliberately separate from the
 * cold-call `leads` table: no agent assignment, no pool view, super_admin only.
 * RLS is the real boundary — a non-super_admin simply gets zero rows back.
 *
 * Only enabled for super_admin so other roles never fire the request at all.
 */
export function useWebLeadsData(userRole) {
  const queryClient = useQueryClient()
  const enabled = userRole === 'super_admin'

  useEffect(() => {
    if (!enabled) return

    let timeoutId = null
    const invalidate = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['webLeads'] })
      }, 500)
    }

    const channel = supabase
      .channel('admin-web-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'web_leads' }, invalidate)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [queryClient, enabled])

  return useQuery({
    queryKey: ['webLeads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('web_leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled,
    staleTime: 30_000,
  })
}
