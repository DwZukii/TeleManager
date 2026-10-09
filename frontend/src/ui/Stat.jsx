import { cn } from './cn'

const VALUE_TONES = {
  default: 'text-fg',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

// The 1px gap over a line-coloured background draws the dividers, so they
// stay correct however the cells wrap.
const STRIP = 'grid gap-px overflow-hidden rounded-card border border-line bg-line'

/**
 * StatGroup — a row of figures in one bordered strip, divided by hairlines.
 * Two across on phones, one row from `sm` up.
 *
 * `dense` is for four short counters on a screen where every row of height
 * counts (the agent's leads list): all four share one row whenever the strip
 * is wide enough, phones included, and drop to two across only when it is
 * not (a very narrow phone, or a larger text size). Pass `dense` to each Stat
 * too, and keep the labels to one short word.
 */
export function StatGroup({ dense = false, className, children }) {
  if (dense) {
    return (
      <div className={cn('@container', className)}>
        <dl className={cn(STRIP, 'grid-cols-2 @xs:grid-cols-4')}>{children}</dl>
      </div>
    )
  }
  return (
    <dl
      className={cn(
        STRIP,
        'grid-cols-2 sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none',
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
 * number itself is good or bad news. `dense` is the smaller phone size used
 * inside a dense StatGroup; from `sm` up it looks like any other Stat.
 */
export function Stat({ label, value, hint, tone = 'default', dense = false, className }) {
  return (
    <div className={cn('min-w-0 bg-surface', dense ? 'px-2 py-2.5 sm:px-5 sm:py-3.5' : 'px-4 py-3.5 sm:px-5', className)}>
      <dt className={cn('text-fg-muted', dense ? 'truncate text-xs sm:text-sm' : 'text-sm')}>{label}</dt>
      <dd className={cn('font-semibold tabular-nums', dense ? 'mt-0.5 text-xl sm:mt-1 sm:text-2xl' : 'mt-1 text-2xl', VALUE_TONES[tone])}>
        {value}
      </dd>
      {hint && <dd className="mt-0.5 text-xs text-fg-subtle">{hint}</dd>}
    </div>
  )
}
