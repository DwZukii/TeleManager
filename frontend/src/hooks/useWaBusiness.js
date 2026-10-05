import { useSyncExternalStore } from 'react'

// Which WhatsApp app an agent's message links open. It only matters on
// Android, where the link names the app; elsewhere wa.me opens whatever is
// installed. Same storage key as before, so nobody's choice resets, and the
// default is still WhatsApp Business.

const keyFor = (email) => `wa_business_${email}`
const CHANGE = 'telemanager:wa-app'
const memory = new Map() // private browsing: the choice lasts for this visit

export const isAndroid = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)

function read(email) {
  let stored = null
  try {
    stored = localStorage.getItem(keyFor(email))
  } catch {
    // storage unavailable
  }
  return stored ?? memory.get(email) ?? null
}

export const usesWaBusiness = (email) => read(email) !== 'false'

export function setWaBusiness(email, business) {
  memory.set(email, String(business))
  try {
    localStorage.setItem(keyFor(email), String(business))
  } catch {
    // kept in memory only
  }
  window.dispatchEvent(new Event(CHANGE))
}

function subscribe(callback) {
  window.addEventListener(CHANGE, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(CHANGE, callback)
    window.removeEventListener('storage', callback)
  }
}

/** useWaBusiness — true when this agent's WhatsApp links open WhatsApp Business. */
export function useWaBusiness(email) {
  return useSyncExternalStore(subscribe, () => usesWaBusiness(email))
}
