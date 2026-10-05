// Dates and numbers shown to people, in the current language.

const LOCALES = { en: 'en-GB', ms: 'ms-MY' }

/** "Today at 10:45", "Yesterday at 15:15", "04 Aug 2026 at 10:45". */
export function formatWhen(value, t, lang = 'en') {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const locale = LOCALES[lang] ?? LOCALES.en
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return t('time.today', { time })
  if (d.toDateString() === yesterday.toDateString()) return t('time.yesterday', { time })
  const date = d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
  return t('time.on', { date, time })
}

/** "04 Aug 2026". */
export function formatDate(value, lang = 'en') {
  if (!value) return ''
  const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(LOCALES[lang] ?? LOCALES.en, { day: '2-digit', month: 'short', year: 'numeric' })
}

/** "RM 4,800" or "RM 4,800.50". */
export function formatMoney(value, lang = 'en') {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return `RM ${n.toLocaleString(LOCALES[lang] ?? LOCALES.en, { maximumFractionDigits: 2 })}`
}
