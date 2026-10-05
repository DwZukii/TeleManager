import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Tabs as RTabs } from 'radix-ui'
import { cn, focusRing } from './cn'
import { CountBadge } from './Badge'
import { Select } from './Field'

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
 * FilterChips — a single-choice filter with counts. A row of chips when they
 * all fit; when they don't, one dropdown, so no choice is cut off at the edge.
 * It measures its own width, so it adapts to the sidebar, a narrow card or a
 * long translation without a breakpoint.
 */
export function FilterChips({ label, value, onChange, options, className }) {
  const rowRef = useRef(null)
  const [fits, setFits] = useState(true)

  // The row stays in the page (hidden, taking no space) while the dropdown
  // shows, so there is always something to measure.
  const measure = () => {
    const row = rowRef.current
    if (row) setFits(row.scrollWidth <= row.clientWidth)
  }
  // Counts and labels change the row's width without resizing its box.
  useLayoutEffect(measure)
  useEffect(() => {
    const observer = new ResizeObserver(measure)
    observer.observe(rowRef.current)
    // The web font arrives after first paint and is wider than the fallback.
    document.fonts?.ready.then(measure)
    return () => observer.disconnect()
  }, [])

  return (
    <div className={cn('relative', className)}>
      {!fits && (
        <Select
          aria-label={label}
          value={String(value)}
          onChange={(event) => onChange(options.find((option) => String(option.value) === event.target.value).value)}
          className="sm:max-w-xs"
        >
          {options.map((option) => (
            <option key={option.value} value={String(option.value)}>
              {option.count != null ? `${option.label} (${option.count})` : option.label}
            </option>
          ))}
        </Select>
      )}
      <div
        ref={rowRef}
        role="group"
        aria-label={label}
        aria-hidden={!fits || undefined}
        inert={!fits}
        className={cn(
          '-mx-1 flex gap-2 overflow-hidden px-1',
          fits ? 'py-1' : 'invisible absolute inset-x-0 top-0 h-0'
        )}
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
    </div>
  )
}

// ─── NavItem ─────────────────────────────────────────────────────────────────

/**
 * NavItem — one row in the sidebar. Shared so every role's navigation matches.
 * Pass `as={Link}` and `to` to make it a link.
 */
export function NavItem({ as: Comp = 'button', icon: Icon, label, count, active = false, className, ...rest }) {
  return (
    <Comp
      type={Comp === 'button' ? 'button' : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-10 w-full items-center gap-2.5 rounded-control px-2.5 text-left text-sm transition-colors lg:h-9',
        focusRing,
        active ? 'bg-brand-subtle font-medium text-brand' : 'text-fg-muted hover:bg-sunken hover:text-fg',
        className
      )}
      {...rest}
    >
      {Icon && <Icon className="size-[18px] shrink-0" aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <CountBadge count={count} />
    </Comp>
  )
}
