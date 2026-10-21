import { useState } from 'react'
import { Button, Dialog, DialogClose, Field, Textarea } from '../../ui'
import { useT } from '../../i18n/useT'

/**
 * ScriptDialog — edits one saved message: a person's WhatsApp or SMS script or
 * birthday greeting, or one of the company's. `value` is the text to start
 * from; `onSave` gets the edited text and may be async. If it throws, the
 * dialog stays open with the text as typed, so nothing is lost.
 */
export default function ScriptDialog({ open, onOpenChange, title, description, hint, value, placeholder, onSave }) {
  const t = useT()
  const [saving, setSaving] = useState(false)
  async function save(text) {
    setSaving(true)
    try {
      await onSave(text)
    } catch {
      // the caller has said what went wrong
    } finally {
      setSaving(false)
    }
  }
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
          <Button type="submit" form="script-form" loading={saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      {/* Mounted only while open, so each opening starts from the saved text. */}
      {open && <ScriptForm title={title} hint={hint} value={value} placeholder={placeholder} onSave={save} />}
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
