import { useState } from 'react'
import { Button, Dialog, Field, Input } from '../ui'
import { useT } from '../i18n/useT'

// Messages that delete or take something away get a red confirm button.
const DESTRUCTIVE = /(delete|remove|permanently|pull back|revoke|clear|padam|buang)/i

/**
 * ConfirmModal — the look behind useConfirm(). Callers pass a message, and
 * optionally a `word` that has to be typed before Continue works.
 */
export default function ConfirmModal({ isOpen, message, word, onConfirm, onCancel }) {
  const t = useT()
  const [typed, setTyped] = useState('')
  const destructive = Boolean(word) || DESTRUCTIVE.test(message || '')
  const ready = !word || typed.trim().toUpperCase() === word.toUpperCase()

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onCancel()}
      title={t('confirm.title')}
      description={message}
      size="sm"
      footer={
        <>
          {/* Without a typed word, Cancel takes focus so a stray Enter does nothing harmful. */}
          <Button variant="secondary" onClick={onCancel} data-autofocus={word ? undefined : ''}>
            {t('common.cancel')}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} disabled={!ready}>
            {t('confirm.continue')}
          </Button>
        </>
      }
    >
      {word && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (ready) onConfirm()
          }}
          className="pb-2"
        >
          <Field label={t('confirm.typeToConfirm', { word })}>
            <Input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              data-autofocus=""
            />
          </Field>
        </form>
      )}
    </Dialog>
  )
}
