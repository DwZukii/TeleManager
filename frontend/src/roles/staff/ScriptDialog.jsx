import { useState } from 'react'
import { Button, Dialog, DialogClose, Field, Textarea } from '../../ui'
import { useT } from '../../i18n/useT'

/**
 * ScriptDialog — edits one saved message: an agent's WhatsApp or SMS script,
 * or their birthday greeting. `value` is the text to start from; `onSave`
 * gets the edited text.
 */
export default function ScriptDialog({ open, onOpenChange, title, description, hint, value, placeholder, onSave }) {
  const t = useT()
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <DialogClose>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button type="submit" form="script-form">
            {t('common.save')}
          </Button>
        </>
      }
    >
      {/* Mounted only while open, so each opening starts from the saved text. */}
      {open && <ScriptForm title={title} hint={hint} value={value} placeholder={placeholder} onSave={onSave} />}
    </Dialog>
  )
}

function ScriptForm({ title, hint, value, placeholder, onSave }) {
  const [draft, setDraft] = useState(value)
  return (
    <form
      id="script-form"
      className="py-2"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(draft)
      }}
    >
      <Field label={title} hint={hint}>
        <Textarea rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
      </Field>
    </form>
  )
}
