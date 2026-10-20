import { cn } from './cn'
import { TONE_LABEL, TONE_PICK, TONE_WASH } from './tones'

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
export function StatGroup({ dense = false, className, children, ...rest }) {
  if (dense) {
    return (
      <div className={cn('@container', className)} {...rest}>
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
      {...rest}
    >
      {children}
    </dl>
  )
}

/**
 * Stat — a label and a number. Neutral by default; pass `tone` only when the
 * number itself is good or bad news. `dense` is the smaller phone size used
 * inside a dense StatGroup; from `sm` up it looks like any other Stat.
 *
 * `tint` is for a figure that counts one status: the cell takes that status's
 * pale wash and the label its darker shade (getStatusMeta(kind, status).tone).
 * The number stays dark, so the count is still the easiest thing to read.
 *
 * `onClick` makes the whole cell a button, for a counter that filters or
 * sorts what is below it; `selected` marks the one in effect with an inset edge.
 */
export function Stat({ label, value, hint, tone = 'default', tint, dense = false, onClick, selected = false, className }) {
  return (
    <div
      className={cn(
        'relative min-w-0',
        TONE_WASH[tint] ?? 'bg-surface',
        dense ? 'px-2 py-2.5 sm:px-5 sm:py-3.5' : 'px-4 py-3.5 sm:px-5',
        onClick && 'cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-brand',
        onClick && (selected ? ['ring-2 ring-inset', TONE_PICK[tint] ?? 'ring-line-strong'] : 'hover:ring-1 hover:ring-inset hover:ring-line-strong'),
        className
      )}
    >
      <dt className={cn(TONE_LABEL[tint] ?? 'text-fg-muted', dense ? 'truncate text-xs sm:text-sm' : 'text-sm')}>
        {onClick ? (
          // The button's ::after covers the cell, so the number is clickable too.
          <button type="button" aria-pressed={selected} onClick={onClick} className="outline-hidden after:absolute after:inset-0">
            {label}
          </button>
        ) : (
          label
        )}
      </dt>
      <dd className={cn('font-semibold tabular-nums', dense ? 'mt-0.5 text-xl sm:mt-1 sm:text-2xl' : 'mt-1 text-2xl', VALUE_TONES[tone])}>
        {value}
      </dd>
      {hint && <dd className="mt-0.5 text-xs text-fg-subtle">{hint}</dd>}
    </div>
  )
}
