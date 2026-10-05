import { useId, useMemo, useState } from 'react'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import { cn, CONTROL, focusRing } from './cn'
import { useT } from '../i18n/useT'
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

/** PasswordInput — a password field with a show/hide button. */
export function PasswordInput({ className, ...props }) {
  const t = useT()
  const [visible, setVisible] = useState(false)
  const control = useFieldControl(props)
  return (
    <div className={cn('relative', className)}>
      <input
        {...props}
        {...control}
        type={visible ? 'text' : 'password'}
        className={cn(CONTROL, 'h-11 pl-3 pr-11 sm:h-10')}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('password.hide') : t('password.show')}
        aria-pressed={visible}
        className={cn(
          'absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-control text-fg-subtle hover:text-fg sm:size-8',
          focusRing
        )}
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
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
