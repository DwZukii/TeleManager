import { useState } from 'react'
import { Dialog as RDialog } from 'radix-ui'
import { X } from 'lucide-react'
import { cn, focusRing } from './cn'
import { Button } from './Button'
import { Field, Input } from './Field'
import { useT } from '../i18n/useT'

const WIDTHS = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }

/**
 * Dialog — a focused task over the page. Centred from `sm` up; a sheet that
 * rises from the bottom on phones, where the thumb is.
 *
 *   <Dialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="Create account"
 *     description="They will get an email to set a password."
 *     footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button>Create</Button></>}
 *   >
 *     ...fields
 *   </Dialog>
 *
 * Pass `trigger` (a single element) to let the dialog manage its own open state.
 * Focus is trapped while open, Escape closes it, and focus returns to whatever
 * opened it.
 */
export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  footer,
  size = 'md',
  dismissible = true,
  className,
  children,
}) {
  const t = useT()
  const block = dismissible ? undefined : (event) => event.preventDefault()

  // Start where the work is: an element marked data-autofocus, else the first
  // field. Without either, Radix focuses the first button (the close button).
  function focusFirst(event) {
    const target = event.currentTarget.querySelector(
      '[data-autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [role="combobox"]:not([disabled])'
    )
    if (target) {
      event.preventDefault()
      target.focus()
    }
  }

  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RDialog.Trigger asChild>{trigger}</RDialog.Trigger>}
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-40 bg-brand/40 animate-fade-in motion-reduce:animate-none" />
        <RDialog.Content
          onOpenAutoFocus={focusFirst}
          onPointerDownOutside={block}
          onEscapeKeyDown={block}
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed z-40 flex max-h-[calc(100dvh-2rem)] flex-col bg-surface font-sans text-fg shadow-dialog',
            // phone: bottom sheet
            'inset-x-0 bottom-0 rounded-t-card pb-[env(safe-area-inset-bottom)] animate-sheet-in',
            // sm and up: centred
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card sm:pb-0 sm:animate-pop-in',
            'motion-reduce:animate-none focus:outline-hidden',
            WIDTHS[size],
            className
          )}
        >
          <div className="flex items-start justify-between gap-4 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
            <div className="min-w-0">
              <RDialog.Title className="text-base font-semibold text-fg">{title}</RDialog.Title>
              {description ? (
                <RDialog.Description className="mt-1 text-sm text-fg-muted">{description}</RDialog.Description>
              ) : null}
            </div>
            {dismissible && (
              <RDialog.Close
                aria-label={t('common.close')}
                className={cn(
                  '-mr-2 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-control text-fg-muted transition-colors hover:bg-sunken hover:text-fg',
                  focusRing
                )}
              >
                <X className="size-4" aria-hidden="true" />
              </RDialog.Close>
            )}
          </div>
          {children && <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 text-sm sm:px-5">{children}</div>}
          {footer && (
            <div className="mt-2 flex flex-col-reverse gap-2 border-t border-line px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
              {footer}
            </div>
          )}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}

/** DialogClose — wrap a footer button so it closes the dialog when pressed. */
export function DialogClose({ children }) {
  return <RDialog.Close asChild>{children}</RDialog.Close>
}

/**
 * ConfirmDialog — asks before something happens.
 *
 *   tone="danger"     red confirm button, for anything that deletes or removes
 *   confirmWord="DELETE"  the confirm button stays disabled until the word is
 *                         typed; use it for bulk actions that cannot be undone
 *
 * `onConfirm` may return a promise. The button shows progress while it runs
 * and the dialog closes when it resolves. If it throws, the dialog stays open
 * so the caller can show the error.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  confirmWord,
  onConfirm,
  children,
}) {
  const t = useT()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [localOpen, setLocalOpen] = useState(false)
  const isOpen = open ?? localOpen

  function setOpen(next) {
    if (busy) return
    if (!next) setTyped('')
    setLocalOpen(next)
    onOpenChange?.(next)
  }

  const wordMatches = !confirmWord || typed.trim() === confirmWord

  async function confirm(event) {
    event.preventDefault()
    if (!wordMatches) return
    setBusy(true)
    try {
      await onConfirm?.()
      setBusy(false)
      setTyped('')
      setLocalOpen(false)
      onOpenChange?.(false)
    } catch {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={setOpen}
      trigger={trigger}
      title={title}
      description={description}
      size="sm"
      dismissible={!busy}
    >
      <form onSubmit={confirm} className="space-y-4 pb-2">
        {children}
        {confirmWord && (
          <Field label={t('confirm.typeToConfirm', { word: confirmWord })}>
            <Input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </Field>
        )}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          {/* Without a typed word, Cancel takes focus so a stray Enter does nothing harmful. */}
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy} data-autofocus={confirmWord ? undefined : ''}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button type="submit" variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} disabled={!wordMatches}>
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
