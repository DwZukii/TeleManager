import { useCallback, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useT } from '../i18n/useT'
import { SMS_PROMO_SCRIPT, WHATSAPP_PROMO_SCRIPT } from '../roles/staff/scripts'

// The messages people send: each person's own WhatsApp script, SMS script and
// birthday greeting, and the company's standard ones that an admin sets. They
// live in the message_scripts table, so they follow the person to any phone
// or computer. A copy stays on the device, so the screens show them at once
// and still have them when the connection drops.
//
// Who can do what is enforced by the database: a person reads and changes
// only their own; an admin also reads everyone's and is the only one who
// changes the company's.

export const SCRIPT_KINDS = ['wa', 'sms', 'birthday']
export const COMPANY = 'company'

// The device copies. A person's keys are the ones the app has always used, so
// whatever was saved on a phone before is still found, and moved across once.
const LOCAL = {
  wa: (email) => `whatsapp_script_${email}`,
  sms: (email) => `sms_script_${email}`,
  birthday: (email) => `birthday_greeting_${email}`,
}
const localKey = (owner, kind) => (owner === COMPANY ? `company_script_${kind}` : LOCAL[kind](owner))
const CHANGE = 'telemanager:my-script'
const memory = new Map() // private browsing: lasts for this visit

function readLocal(owner, kind) {
  const key = localKey(owner, kind)
  let stored = null
  try {
    stored = localStorage.getItem(key)
  } catch {
    // storage unavailable
  }
  return stored ?? memory.get(key) ?? ''
}

function writeLocal(owner, kind, text) {
  const key = localKey(owner, kind)
  if (readLocal(owner, kind) === text) return
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

async function fetchScripts(email) {
  const { data, error } = await supabase.from('message_scripts').select('owner, kind, body').in('owner', [email, COMPANY])
  if (error) throw error
  const mine = {}
  const company = {}
  for (const row of data ?? []) (row.owner === COMPANY ? company : mine)[row.kind] = row.body

  // The first time this device sees the account: a script written here before
  // moves to the account, unless the account already has one of its own.
  for (const kind of SCRIPT_KINDS) {
    const local = readLocal(email, kind)
    if (local && mine[kind] == null) {
      const { error: moveError } = await supabase.from('message_scripts').upsert({ owner: email, kind, body: local })
      if (!moveError) mine[kind] = local
    }
  }

  // From here the account is what counts; the device keeps a copy of it.
  for (const kind of SCRIPT_KINDS) {
    if (mine[kind] != null) writeLocal(email, kind, mine[kind])
    writeLocal(COMPANY, kind, company[kind] ?? '')
  }
  return { mine, company }
}

/** useScripts — this person's scripts and the company's, from the account. */
export function useScripts(email) {
  return useQuery({
    queryKey: ['scripts', email],
    queryFn: () => fetchScripts(email),
    enabled: Boolean(email),
    staleTime: 60_000,
  })
}

/** useMyScript — the person's own text, or '' when they have not written one. */
export function useMyScript(kind, email) {
  const { data } = useScripts(email)
  const local = useSyncExternalStore(subscribe, () => readLocal(email, kind))
  return data ? (data.mine[kind] ?? '') : local
}

/**
 * useStandardScript — the company's text for a kind: what an admin has set,
 * or the original that ships with the app (the promo scripts, the standard
 * birthday greeting in the current language).
 */
export function useStandardScript(kind, email) {
  const t = useT()
  const { data } = useScripts(email)
  const local = useSyncExternalStore(subscribe, () => readLocal(COMPANY, kind))
  const set = data ? (data.company[kind] ?? '') : local
  return set || builtIn(kind, t)
}

export function builtIn(kind, t) {
  if (kind === 'wa') return WHATSAPP_PROMO_SCRIPT
  if (kind === 'sms') return SMS_PROMO_SCRIPT
  return t('alerts.wishesText')
}

/**
 * useSaveScript — saves a script to the account: the person's own (`owner` is
 * their email) or, for an admin, the company's (`owner` is COMPANY). Throws
 * when the save fails, so the screen can say so.
 */
export function useSaveScript() {
  const queryClient = useQueryClient()
  return useCallback(
    async (owner, kind, text) => {
      const { error } = await supabase.from('message_scripts').upsert({ owner, kind, body: text })
      if (error) throw error
      writeLocal(owner, kind, text)
      queryClient.setQueriesData({ queryKey: ['scripts'] }, (old) =>
        old
          ? owner === COMPANY
            ? { ...old, company: { ...old.company, [kind]: text } }
            : { ...old, mine: { ...old.mine, [kind]: text } }
          : old
      )
      queryClient.invalidateQueries({ queryKey: ['scripts-all'] })
    },
    [queryClient]
  )
}

/** Puts the customer's name wherever the greeting says {name}. */
export const fillName = (template, name) => template.replaceAll('{name}', name ?? '')
