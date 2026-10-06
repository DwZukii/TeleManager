import { useSyncExternalStore } from 'react'

// Messages an agent writes for themselves: their WhatsApp and SMS scripts and
// their birthday greeting. Kept on this device, not in the database. The
// script keys are the ones the lead screen has always used, so nobody's saved
// script is lost.

const KEYS = {
  wa: (email) => `whatsapp_script_${email}`,
  sms: (email) => `sms_script_${email}`,
  birthday: (email) => `birthday_greeting_${email}`,
}
const CHANGE = 'telemanager:my-script'
const memory = new Map() // private browsing: lasts for this visit

export function readMyScript(kind, email) {
  const key = KEYS[kind](email)
  let stored = null
  try {
    stored = localStorage.getItem(key)
  } catch {
    // storage unavailable
  }
  return stored ?? memory.get(key) ?? ''
}

export function writeMyScript(kind, email, text) {
  const key = KEYS[kind](email)
  memory.set(key, text)
  try {
    localStorage.setItem(key, text)
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

/** useMyScript — the saved text, or '' when the agent has not written one. */
export function useMyScript(kind, email) {
  return useSyncExternalStore(subscribe, () => readMyScript(kind, email))
}

/** Puts the customer's name wherever the greeting says {name}. */
export const fillName = (template, name) => template.replaceAll('{name}', name ?? '')
