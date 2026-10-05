import { Loader2 } from 'lucide-react'
import { Tooltip } from 'radix-ui'
import { cn, focusRing } from './cn'

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-colors select-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50'

const VARIANTS = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover',
  secondary: 'border border-line-strong bg-surface text-fg hover:bg-sunken',
  ghost: 'text-fg-muted hover:bg-sunken hover:text-fg',
  accent: 'bg-accent text-on-accent hover:bg-accent-hover',
  danger: 'bg-danger text-on-brand hover:bg-danger-hover',
  dangerOutline: 'border border-line-strong bg-surface text-danger hover:border-danger/40 hover:bg-danger-subtle',
}

const SIZES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
}

const ICON_SIZES = { sm: 'size-4', md: 'size-4', lg: 'size-5' }

/**
 * Button — the only way to render a button.
 *
 *  variant : primary | secondary | ghost | accent | danger | dangerOutline
 *  size    : sm (32px) | md (40px) | lg (44px, use on touch-first screens)
 *  icon    : a Lucide component, shown before the label
 *  loading : swaps the icon for a spinner and blocks clicks
 *  as      : render as another element, e.g. as="a" with href
 */
export function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...rest
}) {
  const isButton = Comp === 'button'
  const blocked = disabled || loading

  return (
    <Comp
      type={isButton ? rest.type ?? 'button' : undefined}
      disabled={isButton ? blocked : undefined}
      aria-disabled={!isButton && blocked ? true : undefined}
      aria-busy={loading || undefined}
      className={cn(BASE, focusRing, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading ? (
        <Loader2 className={cn(ICON_SIZES[size], 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
      ) : (
        Icon && <Icon className={ICON_SIZES[size]} aria-hidden="true" />
      )}
      {children}
    </Comp>
  )
}

const ICON_BUTTON_SIZES = { sm: 'size-8', md: 'size-10', lg: 'size-11' }

/**
 * IconButton — an icon with no visible text. `label` is required: it becomes
 * the accessible name and the tooltip.
 */
export function IconButton({ label, icon: Icon, variant = 'ghost', size = 'md', className, ...rest }) {
  return (
    <Tooltip.Provider delayDuration={400}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn(BASE, focusRing, VARIANTS[variant], ICON_BUTTON_SIZES[size], className)}
            {...rest}
          >
            <Icon className={size === 'lg' ? 'size-5' : 'size-4'} aria-hidden="true" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            className="z-50 rounded-control bg-brand px-2 py-1 font-sans text-xs text-on-brand animate-fade-in motion-reduce:animate-none"
          >
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
