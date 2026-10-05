import { cn } from './cn'
import { getStatusMeta } from './status'
import { useT } from '../i18n/useT'

const TONES = {
  neutral: 'bg-sunken text-fg-muted',
  info: 'bg-info-subtle text-info',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  accent: 'bg-accent-subtle text-on-accent',
  solid: 'bg-success text-on-brand',
}

/**
 * Badge — a short label on a pale background. Always carries text, so meaning
 * never depends on colour alone.
 */
export function Badge({ tone = 'neutral', icon: Icon, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-control px-2 text-xs font-medium',
        TONES[tone],
        className
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {children}
    </span>
  )
}

/**
 * StatusBadge — pass the stored status and what it belongs to. Tone, icon and
 * translated label all come from ui/status.js.
 *
 *   <StatusBadge kind="lead" status={lead.status} />
 */
export function StatusBadge({ kind = 'lead', status, className }) {
  const t = useT()
  const { canonical, tone, icon } = getStatusMeta(kind, status)
  return (
    <Badge tone={tone} icon={icon} className={className}>
      {t(`status.${kind}.${canonical}`, null, status)}
    </Badge>
  )
}

/** CountBadge — the gold number beside a nav item or tab. Hidden at zero. */
export function CountBadge({ count, max = 99, className }) {
  if (!count) return null
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold tabular-nums text-on-accent',
        className
      )}
    >
      {count > max ? `${max}+` : count}
    </span>
  )
}
