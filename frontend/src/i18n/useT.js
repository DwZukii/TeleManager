import { useCallback, useContext } from 'react'
import { LanguageContext } from './context'
import { STRINGS } from './strings'

/**
 * useT — returns `t(key, vars)`.
 *
 * Falls back to English, then to `fallback`, then to the key itself, so a
 * missing translation shows readable text rather than nothing.
 *
 *   const t = useT()
 *   t('pagination.range', { from: 1, to: 10, total: 700 })
 *   t('overview.attention.feedback', { count: 1 })  // uses the `.one` key if there is one
 */
export function useT() {
  const { lang } = useContext(LanguageContext)

  return useCallback(
    (key, vars, fallback) => {
      // `key.one` is used when vars.count is 1, so "1 new message" reads right.
      const singular = vars?.count === 1 ? `${key}.one` : null
      // Only the current language's singular: BM, for one, has no separate form.
      const template =
        (singular && STRINGS[lang]?.[singular]) ??
        STRINGS[lang]?.[key] ??
        STRINGS.en[key] ??
        fallback ??
        key
      if (!vars) return template
      return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
    },
    [lang]
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
