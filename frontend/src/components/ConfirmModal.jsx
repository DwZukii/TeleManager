import { Button, Dialog } from '../ui'
import { useT } from '../i18n/useT'

// Messages that delete or take something away get a red confirm button.
const DESTRUCTIVE = /(delete|remove|permanently|pull back|revoke|clear|padam|buang)/i

/** ConfirmModal — the look behind useConfirm(). Callers pass only a message. */
export default function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
  const t = useT()
  const destructive = DESTRUCTIVE.test(message || '')

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onCancel()}
      title={t('confirm.title')}
      description={message}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} data-autofocus="">
            {t('common.cancel')}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
            {t('confirm.continue')}
          </Button>
        </>
      }
    />
  )
}
