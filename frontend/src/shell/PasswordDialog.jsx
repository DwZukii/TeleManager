import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../supabase'
import { Banner, Button, Dialog, DialogClose, Field, PasswordInput } from '../ui'
import { useT } from '../i18n/useT'

/** PasswordDialog — checks the current password, then sets a new one. */
export default function PasswordDialog({ open, onOpenChange, userEmail }) {
  const t = useT()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function reset() {
    setCurrent('')
    setNext('')
    setRepeat('')
    setError('')
  }

  function changeOpen(value) {
    if (!value) reset()
    onOpenChange(value)
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    if (!current || !next || !repeat) return setError(t('password.missing'))
    if (next !== repeat) return setError(t('password.mismatch'))
    if (next.length < 6) return setError(t('password.short'))

    setSaving(true)
    try {
      // Signing in again is how Supabase checks the current password.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: userEmail, password: current })
      if (signInError) throw new Error(t('password.wrong'))
      const { error: updateError } = await supabase.auth.updateUser({ password: next })
      if (updateError) throw updateError
      toast.success(t('password.saved'))
      changeOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={changeOpen}
      title={t('password.title')}
      size="sm"
      footer={
        <>
          <DialogClose>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button type="submit" form="password-form" loading={saving}>
            {t('password.update')}
          </Button>
        </>
      }
    >
      <form id="password-form" onSubmit={save} className="space-y-4 py-2">
        {error && <Banner tone="danger" scrollIntoView>{error}</Banner>}
        <Field label={t('password.current')}>
          <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label={t('password.new')} hint={t('password.newHint')}>
          <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label={t('password.confirm')}>
          <PasswordInput value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
        </Field>
      </form>
    </Dialog>
  )
}
