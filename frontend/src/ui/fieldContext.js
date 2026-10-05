import { createContext, useContext } from 'react'

export const FieldContext = createContext(null)

/**
 * Lets any control inside a <Field> pick up the id, description and error
 * wiring without the caller passing them by hand. Explicit props still win.
 */
export function useFieldControl(props = {}) {
  const field = useContext(FieldContext)
  return {
    id: props.id ?? field?.id,
    'aria-describedby': props['aria-describedby'] ?? field?.describedBy,
    'aria-invalid': props['aria-invalid'] ?? (field?.invalid ? true : undefined),
    required: props.required ?? field?.required,
  }
}
