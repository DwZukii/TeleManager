// Whether an agent has seen the tour of the app on this device. Kept on the
// device, like their scripts and WhatsApp choice, so it needs no database.

const keyFor = (email) => `telemanager_tour_${email}`

export function hasSeenTour(email) {
  try {
    return Boolean(localStorage.getItem(keyFor(email)))
  } catch {
    // Without storage it would start on every visit, so treat it as seen.
    return true
  }
}

export function markTourSeen(email) {
  try {
    localStorage.setItem(keyFor(email), new Date().toISOString())
  } catch {
    // nothing to remember it in
  }
}
