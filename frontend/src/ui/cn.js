// Joins class names, dropping falsy values. Deliberately not a merge utility:
// `className` on a ui component is for layout (margin, width, grid placement),
// not for overriding how the component looks.
export function cn(...parts) {
  return parts.flat(Infinity).filter(Boolean).join(' ')
}

// One focus treatment for buttons, links, chips and tabs: a navy outline,
// which shows clearly on white and sand. Fields keep the gold outline (see
// CONTROL_BASE), where the navy focus border gives the contrast.
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

// The box every text-like control shares: Input, Textarea, Select, Combobox.
// 16px text below `sm` so iOS does not zoom the page when a field is focused.
// CONTROL_BASE leaves the resting border colour out, for a control that takes
// its edge from a status tone instead (a status Select).
export const CONTROL_BASE =
  'block w-full rounded-control border bg-surface text-base text-fg transition-colors placeholder:text-fg-subtle focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-subtle aria-[invalid=true]:border-danger sm:text-sm'
export const CONTROL = `${CONTROL_BASE} border-line-strong hover:border-fg-subtle disabled:hover:border-line-strong`
