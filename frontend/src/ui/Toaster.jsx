import { Toaster as Sonner } from 'sonner'

/** Toaster — one place for where toasts appear and how they look. */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-start gap-2.5 rounded-control border border-line bg-surface px-3.5 py-3 font-sans text-sm text-fg shadow-popover sm:w-[356px]',
          title: 'font-medium',
          description: 'mt-0.5 text-fg-muted',
          icon: 'mt-0.5 shrink-0',
          success: '[&_[data-icon]]:text-success',
          error: '[&_[data-icon]]:text-danger',
          warning: '[&_[data-icon]]:text-warning',
          info: '[&_[data-icon]]:text-info',
          // Undo lives here, so it gets a thumb-sized target on phones.
          actionButton: 'ml-auto -my-1 h-9 shrink-0 rounded-control bg-brand px-3.5 text-sm font-medium text-on-brand sm:my-0 sm:h-7 sm:px-2.5 sm:text-xs',
          cancelButton: 'ml-auto shrink-0 rounded-control px-2.5 py-1 text-xs font-medium text-fg-muted',
        },
      }}
    />
  )
}
