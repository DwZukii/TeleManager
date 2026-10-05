import { useT } from '../../i18n/useT'

/** "Just now", "5 min ago", "3 days ago", then a date after a month. */
export function useRelativeTime() {
  const t = useT()
  return (iso) => {
    if (!iso) return '—'
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return t('web.justNow')
    if (mins < 60) return t('web.minutesAgo', { count: mins })
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return t('web.hoursAgo', { count: hrs })
    const days = Math.floor(hrs / 24)
    if (days < 30) return t('web.daysAgo', { count: days })
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }
}
