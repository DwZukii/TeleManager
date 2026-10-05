import { createContext } from 'react'

// Defaults to English so components still render outside a provider (tests,
// isolated previews).
export const LanguageContext = createContext({ lang: 'en', setLang: () => {} })
