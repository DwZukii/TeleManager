import { cn } from './cn'

const VALUE_TONES = {
  default: 'text-fg',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

/**
 * StatGroup — a row of figures in one bordered strip, divided by hairlines.
 * Two across on phones, one row from `sm` up.
 */
export function StatGroup({ className, children }) {
  return (
    <dl
      className={cn(
        // The 1px gap over a line-coloured background draws the dividers, so they
        // stay correct however the cells wrap.
        'grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none',
        '[&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1',
        className
      )}
    >
      {children}
    </dl>
  )
}

/**
 * Stat — a label and a number. Neutral by default; pass `tone` only when the
 * number itself is good or bad news.
 */
export function Stat({ label, value, hint, tone = 'default', className }) {
  return (
    <div className={cn('bg-surface px-4 py-3.5 sm:px-5', className)}>
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className={cn('mt-1 text-2xl font-semibold tabular-nums', VALUE_TONES[tone])}>{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>}
    </div>
  )
}
