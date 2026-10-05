import { Tabs as RTabs } from 'radix-ui'
import { cn, focusRing } from './cn'
import { CountBadge } from './Badge'

// ─── Tabs ────────────────────────────────────────────────────────────────────

/** Tabs — sections within one page. Underline style; the active tab is gold-marked. */
export function Tabs({ className, ...props }) {
  return <RTabs.Root className={className} {...props} />
}

export function TabList({ className, ...props }) {
  return <RTabs.List className={cn('flex gap-1 overflow-x-auto border-b border-line', className)} {...props} />
}

export function Tab({ value, count, children, className }) {
  return (
    <RTabs.Trigger
      value={value}
      className={cn(
        '-mb-px inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-fg-muted transition-colors hover:text-fg data-[state=active]:border-accent data-[state=active]:text-fg',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
        className
      )}
    >
      {children}
      {count != null && <span className="tabular-nums text-fg-subtle">{count}</span>}
    </RTabs.Trigger>
  )
}

export function TabPanel({ className, ...props }) {
  return <RTabs.Content className={cn('pt-4', focusRing, className)} {...props} />
}

// ─── SegmentedControl ────────────────────────────────────────────────────────

/**
 * SegmentedControl — pick one of two or three options that are always visible.
 * For more options, or options that need a count, use FilterChips or Select.
 */
export function SegmentedControl({ label, value, onChange, options, className }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-control bg-sunken p-0.5', className)}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 rounded-control px-3 text-sm font-medium transition-colors',
              focusRing,
              selected ? 'bg-surface text-fg ring-1 ring-line-strong' : 'text-fg-muted hover:text-fg'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── FilterChips ─────────────────────────────────────────────────────────────

/**
 * FilterChips — a single-choice filter with counts. Scrolls sideways on narrow
 * screens rather than wrapping, so the list below it does not jump.
 */
export function FilterChips({ label, value, onChange, options, className }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]', className)}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors',
              focusRing,
              selected ? 'border-brand bg-brand text-on-brand' : 'border-line-strong bg-surface text-fg-muted hover:text-fg'
            )}
          >
            {option.label}
            {option.count != null && (
              <span className={cn('tabular-nums', selected ? 'text-on-brand/70' : 'text-fg-subtle')}>{option.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── NavItem ─────────────────────────────────────────────────────────────────

/** NavItem — one row in the sidebar. Shared so every role's navigation matches. */
export function NavItem({ icon: Icon, label, count, active = false, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-left text-sm transition-colors',
        focusRing,
        active ? 'bg-brand-subtle font-medium text-brand' : 'text-fg-muted hover:bg-sunken hover:text-fg',
        className
      )}
    >
      {Icon && <Icon className="size-[18px] shrink-0" aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <CountBadge count={count} />
    </button>
  )
}
