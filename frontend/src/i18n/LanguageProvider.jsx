import { useCallback, useEffect, useMemo, useState } from 'react'
import { LanguageContext } from './context'
import { STRINGS } from './strings'

const STORAGE_KEY = 'telemanager_lang'

function readStoredLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored && STRINGS[stored] ? stored : 'en'
  } catch {
    return 'en'
  }
}

export default function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang)

  const setLang = useCallback((next) => {
    if (!STRINGS[next]) return
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private browsing: the choice just lasts for this visit.
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
