import { supabase } from '../../supabase'

// How many numbers go to the database at a time.
const CHECK_SIZE = 1000
const SAVE_SIZE = 500

// A count for t(): t() picks the singular wording only for the number 1.
const shown = (n) => (n === 1 ? 1 : n.toLocaleString())

// Where a number already in the database is, as locate_phones reports it.
const PLACES = ['yours', 'agents', 'admin', 'others']

/** "500 in the admin pool, 200 with other teams", for the import messages. */
function placesText(places, t, addedMeanwhile = 0) {
  const counts = {}
  for (const place of places.values()) counts[place] = (counts[place] || 0) + 1
  const parts = PLACES.filter((place) => counts[place]).map((place) =>
    t(`import.place.${place}`, { count: counts[place].toLocaleString() })
  )
  if (addedMeanwhile > 0) parts.push(t('import.place.justAdded', { count: addedMeanwhile.toLocaleString() }))
  return parts.join(', ')
}

/**
 * uploadNumbers — adds cleaned numbers to a pool: skips the ones already in
 * the database, saves the rest, and says what happened.
 *
 *   numbers     phone numbers, unique
 *   set         the set they go into
 *   owner       the email of the pool they go into
 *   t           for the messages
 *   onStatus    called with { tone, text } as it goes
 *
 * Returns { status, added, finished }. `status` is the last message and
 * `added` how many numbers went in. `finished` is false when it stopped early,
 * so the numbers should stay on screen: what went in stays in, and running it
 * again skips those and adds the rest.
 */
export async function uploadNumbers({ numbers, set, owner, t, onStatus }) {
  onStatus({ tone: 'info', text: t('import.checking', { count: numbers.length.toLocaleString() }) })

  // Skip anything already in the database. If the check fails, stop here:
  // nothing has been added, so it is safe to retry.
  const chunks = []
  for (let i = 0; i < numbers.length; i += CHECK_SIZE) chunks.push(numbers.slice(i, i + CHECK_SIZE))
  const results = await Promise.all(chunks.map((chunk) => supabase.rpc('locate_phones', { phone_numbers: chunk })))
  const failedCheck = results.find(({ error }) => error)
  if (failedCheck) {
    return {
      status: { tone: 'danger', text: t('import.checkFailed', { error: failedCheck.error.message }) },
      added: 0,
      finished: false,
    }
  }
  const existing = new Map(results.flatMap(({ data }) => data.map((row) => [row.phone_number, row.place])))
  const fresh = numbers.filter((phone) => !existing.has(phone))
  const skipped = numbers.length - fresh.length

  if (fresh.length === 0) {
    return {
      status: {
        tone: 'warning',
        text: t('import.allDuplicates', { count: shown(numbers.length), where: placesText(existing, t) }),
      },
      added: 0,
      finished: true,
    }
  }

  const rows = fresh.map((phone) => ({
    phone_number: phone,
    assigned_to: 'unassigned',
    status: 'Pending',
    agent_notes: '',
    document_url: null,
    admin_reviewed: true,
    manager_reviewed: true,
    lead_set: set,
    pool_owner: owner,
  }))

  // A number someone else adds after the check is skipped, not an error, so
  // one clash can't lose the rest of its batch.
  let added = 0
  for (let i = 0; i < rows.length; i += SAVE_SIZE) {
    onStatus({
      tone: 'info',
      text: t('import.pushing', { done: Math.min(i + SAVE_SIZE, rows.length), total: rows.length, skipped }),
    })
    const batch = rows.slice(i, i + SAVE_SIZE)
    const { error, count } = await supabase
      .from('leads')
      .upsert(batch, { onConflict: 'phone_number', ignoreDuplicates: true, count: 'exact' })
    if (error) {
      const text =
        added > 0
          ? t('import.failedPartway', { count: added.toLocaleString(), total: fresh.length.toLocaleString(), error: error.message })
          : t('import.failed', { error: error.message })
      return { status: { tone: 'danger', text }, added, finished: false }
    }
    added += count ?? batch.length
  }

  const text =
    added < numbers.length
      ? t('import.doneSkipped', { count: shown(added), set, where: placesText(existing, t, fresh.length - added) })
      : t('import.done', { count: shown(added), set })
  return { status: { tone: 'success', text }, added, finished: true }
}
