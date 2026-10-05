import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../supabase'
import { Button, Dialog, DialogClose, Field, SegmentedControl, Textarea } from '../ui'
import { useT } from '../i18n/useT'

// Stored values stay as they always were; only the labels are new.
const TYPES = ['Bug', 'Suggestion', 'Other']

/** FeedbackDialog — one copy of the "report a problem" form for every role. */
export default function FeedbackDialog({ open, onOpenChange, userEmail, userRole }) {
  const t = useT()
  const [type, setType] = useState('Bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function send(event) {
    event.preventDefault()
    if (!message.trim()) return
    setSending(true)
    try {
      const { error } = await supabase
        .from('feedback')
        .insert([{ user_email: userEmail, user_role: userRole, type, message }])
      if (error) throw error
      toast.success(t('feedback.sent'))
      setMessage('')
      setType('Bug')
      onOpenChange(false)
    } catch (err) {
      toast.error(t('feedback.failed', { error: err.message }))
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('feedback.title')}
      description={t('feedback.description')}
      footer={
        <>
          <DialogClose>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button type="submit" form="feedback-form" loading={sending} disabled={!message.trim()}>
            {t('feedback.send')}
          </Button>
        </>
      }
    >
      <form id="feedback-form" onSubmit={send} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-fg">{t('feedback.type')}</p>
          <SegmentedControl
            label={t('feedback.type')}
            value={type}
            onChange={setType}
            options={TYPES.map((value) => ({ value, label: t(`feedback.type.${value}`) }))}
          />
        </div>
        <Field label={t('feedback.message')}>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('feedback.placeholder')}
            rows={5}
          />
        </Field>
      </form>
    </Dialog>
  )
}
