import { useId, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from './cn'
import { FieldContext, useFieldControl } from './fieldContext'

/**
 * Field — label, control, hint and error as one unit. The label is always
 * connected to its control, and the hint or error is announced with it.
 *
 *   <Field label="Phone number" hint="Example: 012-345 6789" error={errors.phone}>
 *     <Input type="tel" value={phone} onChange={...} />
 *   </Field>
 */
export function Field({ label, hint, error, required = false, className, children }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const value = useMemo(
    () => ({
      id,
      required,
      invalid: Boolean(error),
      describedBy: error ? errorId : hint ? hintId : undefined,
    }),
    [id, required, error, hint, errorId, hintId]
  )

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <FieldContext.Provider value={value}>{children}</FieldContext.Provider>
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs text-fg-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

// 16px text below `sm` so iOS does not zoom the page when a field is focused.
const CONTROL =
  'block w-full rounded-control border border-line-strong bg-surface text-base text-fg transition-colors placeholder:text-fg-subtle hover:border-fg-subtle focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-subtle disabled:hover:border-line-strong aria-[invalid=true]:border-danger sm:text-sm'

export function Input({ icon: Icon, className, ...props }) {
  const control = useFieldControl(props)

  if (!Icon) {
    return <input {...props} {...control} className={cn(CONTROL, 'h-11 px-3 sm:h-10', className)} />
  }

  return (
    <div className={cn('relative', className)}>
      <Icon
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
        aria-hidden="true"
      />
      <input {...props} {...control} className={cn(CONTROL, 'h-11 pl-9 pr-3 sm:h-10')} />
    </div>
  )
}

export function Textarea({ className, rows = 4, ...props }) {
  const control = useFieldControl(props)
  return <textarea rows={rows} {...props} {...control} className={cn(CONTROL, 'resize-y px-3 py-2.5', className)} />
}

/**
 * Select — a styled native select. Native is the right call here: it opens the
 * platform picker on phones, which is where most agents are.
 */
export function Select({ className, children, ...props }) {
  const control = useFieldControl(props)
  return (
    <div className={cn('relative', className)}>
      <select {...props} {...control} className={cn(CONTROL, 'h-11 appearance-none pl-3 pr-9 sm:h-10')}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
        aria-hidden="true"
      />
    </div>
  )
}

export function Checkbox({ label, description, className, ...props }) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={id}
        type="checkbox"
        {...props}
        className="mt-0.5 size-4 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      <label htmlFor={id} className="text-sm text-fg">
        {label}
        {description && <span className="mt-0.5 block text-xs text-fg-subtle">{description}</span>}
      </label>
    </div>
  )
}
