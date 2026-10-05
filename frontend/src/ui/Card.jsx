import { cn } from './cn'

/** Card — a bordered surface. No shadow; cards sit on the page, they do not float. */
export function Card({ as: Comp = 'section', className, children, ...rest }) {
  return (
    <Comp className={cn('min-w-0 rounded-card border border-line bg-surface', className)} {...rest}>
      {children}
    </Comp>
  )
}

export function CardHeader({ title, description, actions, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 sm:px-5',
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, children }) {
  return <div className={cn('p-4 sm:p-5', className)}>{children}</div>
}

export function CardFooter({ className, children }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5', className)}>
      {children}
    </div>
  )
}

/** PageHeader — one per screen: what this is, and the main thing you can do here. */
export function PageHeader({ title, description, actions, className }) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-x-4 gap-y-3', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
