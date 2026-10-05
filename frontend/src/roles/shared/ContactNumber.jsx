import { useT } from '../../i18n/useT'

/**
 * ContactNumber — a staff member's phone number as a tap-to-call link, or
 * "Not set yet". `warn` colours the missing case for people who can fix it.
 */
export default function ContactNumber({ number, warn = false }) {
  const t = useT()
  if (!number) return <span className={warn ? 'text-warning' : 'text-fg-subtle'}>{t('contact.notSet')}</span>
  return (
    <a href={`tel:${number}`} className="tabular-nums text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
      {number}
    </a>
  )
}
