import { useEffect, useRef } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from './cn'

// ─── Avatar ──────────────────────────────────────────────────────────────────

const AVATAR_SIZES = { sm: 'size-7 text-xs', md: 'size-8 text-xs', lg: 'size-10 text-sm' }

function initialsOf(name, email) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (email || '?').charAt(0).toUpperCase()
}

/** Avatar — flat initials. Decorative: the name is always shown next to it. */
export function Avatar({ name, email, size = 'md', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-subtle font-medium text-brand',
        AVATAR_SIZES[size],
        className
      )}
    >
      {initialsOf(name, email)}
    </span>
  )
}

/**
 * Person — avatar, name and email on one line, for a table cell or list row.
 * Shows the email in place of a missing name. `showEmail={false}` for name only.
 */
export function Person({ name, email, showEmail = true, className }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      <Avatar name={name} email={email} size="sm" />
      <span className="min-w-0">
        <span className="block truncate">{name || email}</span>
        {showEmail && name && <span className="block truncate text-xs font-normal text-fg-subtle">{email}</span>}
      </span>
    </span>
  )
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

/** EmptyState — says what is missing and, when there is one, what to do next. */
export function EmptyState({ title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

/** Skeleton — a placeholder shaped like the content that is loading. */
export function Skeleton({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block animate-pulse rounded-control bg-line motion-reduce:animate-none', className)}
    />
  )
}

// ─── Banner ──────────────────────────────────────────────────────────────────

const BANNER_TONES = {
  info: { box: 'border-info/15 bg-info-subtle', icon: 'text-info', Icon: Info },
  success: { box: 'border-success/20 bg-success-subtle', icon: 'text-success', Icon: CheckCircle2 },
  warning: { box: 'border-warning/20 bg-warning-subtle', icon: 'text-warning', Icon: AlertTriangle },
  danger: { box: 'border-danger/20 bg-danger-subtle', icon: 'text-danger', Icon: AlertCircle },
}

/**
 * Banner — an inline message that belongs to the thing it sits above. Use it
 * for form-level errors; toasts are for confirmations. `scrollIntoView` brings
 * it on screen when it appears or its text changes.
 */
export function Banner({ tone = 'info', title, children, action, scrollIntoView = false, className }) {
  const { box, icon, Icon } = BANNER_TONES[tone]
  const urgent = tone === 'danger' || tone === 'warning'
  const ref = useRef(null)
  // A form error at the top of a long form can be off-screen when it appears.
  useEffect(() => {
    if (scrollIntoView) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [scrollIntoView, children, title])
  return (
    <div
      ref={ref}
      role={urgent ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-control border px-3.5 py-3 text-sm', box, className)}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium text-fg">{title}</p>}
        {children && <div className={cn('text-fg-muted', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ─── PageSkeleton ────────────────────────────────────────────────────────────

/** PageSkeleton — what a page looks like while its code or data loads. */
export function PageSkeleton({ className }) {
  return (
    <div className={cn('space-y-5', className)} aria-busy="true">
      <Skeleton className="h-7 w-48" />
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 bg-surface px-4 py-3.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-card border border-line bg-surface p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  )
}
