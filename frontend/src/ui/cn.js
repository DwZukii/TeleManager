// Joins class names, dropping falsy values. Deliberately not a merge utility:
// `className` on a ui component is for layout (margin, width, grid placement),
// not for overriding how the component looks.
export function cn(...parts) {
  return parts.flat(Infinity).filter(Boolean).join(' ')
}

// One focus treatment for every interactive element: the brand's gold outline.
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

// The box every text-like control shares: Input, Textarea, Select, Combobox.
// 16px text below `sm` so iOS does not zoom the page when a field is focused.
export const CONTROL =
  'block w-full rounded-control border border-line-strong bg-surface text-base text-fg transition-colors placeholder:text-fg-subtle hover:border-fg-subtle focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-subtle disabled:hover:border-line-strong aria-[invalid=true]:border-danger sm:text-sm'
