import { useSyncExternalStore } from 'react'

/** useMediaQuery — true while the CSS media query matches. */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (callback) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', callback)
      return () => list.removeEventListener('change', callback)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

/** Below Tailwind's `md` breakpoint, where tables become stacked rows. */
export const PHONE = '(max-width: 767.98px)'
