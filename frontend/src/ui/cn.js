// Joins class names, dropping falsy values. Deliberately not a merge utility:
// `className` on a ui component is for layout (margin, width, grid placement),
// not for overriding how the component looks.
export function cn(...parts) {
  return parts.flat(Infinity).filter(Boolean).join(' ')
}

// One focus treatment for every interactive element: the brand's gold outline.
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
