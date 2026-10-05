import { useCallback } from 'react'
import { toast } from 'sonner'
import { useT } from '../i18n/useT'

/**
 * useUndoToast — confirms a reversible action and offers Undo.
 *
 *   const showUndo = useUndoToast()
 *   showUndo(t('...'), async () => supabase.from(...).update(previous), { id: 'lead-status' })
 *
 * `undo` puts the previous values back. It may return a Supabase result; an
 * `error` there, or a throw, gets its own toast. Repeated actions share an
 * `id`, so a new toast replaces the last one instead of stacking up.
 */
export function useUndoToast() {
  const t = useT()
  return useCallback(
    (message, undo, { id } = {}) =>
      toast.success(message, {
        id,
        duration: 6000,
        action: {
          label: t('common.undo'),
          onClick: async () => {
            try {
              const result = await undo()
              if (result?.error) throw result.error
            } catch (err) {
              toast.error(t('common.undoFailed', { error: err?.message ?? String(err) }))
            }
          },
        },
      }),
    [t]
  )
}
