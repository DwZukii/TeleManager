import { useSyncExternalStore } from 'react'

// Text size for this device, chosen in Settings. The interface is sized in
// rem, so changing the root font size scales text and spacing together.
// Pinch-zoom is off on Android (see index.html), so this is how someone who
// needs bigger text gets it.

const KEY = 'telemanager_text_size'
const CHANGE = 'telemanager:text-size'
export const TEXT_SIZES = ['md', 'lg', 'xl']

export function getTextSize() {
  let stored = null
  try {
    stored = localStorage.getItem(KEY)
  } catch {
    // storage unavailable
  }
  return TEXT_SIZES.includes(stored) ? stored : document.documentElement.dataset.textSize || 'md'
}

/** Sets the size on <html>; index.css turns it into a root font size. */
export function applyTextSize(size = getTextSize()) {
  if (size === 'md') delete document.documentElement.dataset.textSize
  else document.documentElement.dataset.textSize = size
}

export function setTextSize(size) {
  applyTextSize(size)
  try {
    localStorage.setItem(KEY, size)
  } catch {
    // lasts until the page is reloaded
  }
  window.dispatchEvent(new Event(CHANGE))
}

function subscribe(callback) {
  window.addEventListener(CHANGE, callback)
  return () => window.removeEventListener(CHANGE, callback)
}

export function useTextSize() {
  return useSyncExternalStore(subscribe, getTextSize)
}
