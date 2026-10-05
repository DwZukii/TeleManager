import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../supabase'
import { Banner, Button, Dialog, DialogClose, Field, Input, SegmentedControl, Skeleton } from '../ui'
import { useT } from '../i18n/useT'
import { isAndroid, setWaBusiness, usesWaBusiness } from '../hooks/useWaBusiness'

/**
 * ProfileDialog — the signed-in person's name and contact number. Agents on
 * Android also choose which WhatsApp app their message links open.
 */
export default function ProfileDialog({ open, onOpenChange, userEmail, userRole }) {
  const t = useT()
  const [fullName, setFullName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [formError, setFormError] = useState('')
  const showWaApp = userRole === 'agent' && isAndroid()
  const [waBusiness, setWaBusinessChoice] = useState(true)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setPhoneError('')
    setFormError('')
    setWaBusinessChoice(usesWaBusiness(userEmail))
    supabase
      .from('profiles')
      .select('full_name, contact_number')
      .eq('email', userEmail)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        setFullName(data?.full_name || '')
        setContactNumber(data?.contact_number || '')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, userEmail])

  async function save(event) {
    event.preventDefault()
    if (!contactNumber.trim()) {
      setPhoneError(t('profile.phoneRequired'))
      return
    }
    setSaving(true)
    setFormError('')
    // Kept on this phone, not in the database, as it always was.
    if (showWaApp) setWaBusiness(userEmail, waBusiness)
    try {
      const { error, count } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), contact_number: contactNumber.trim() }, { count: 'exact' })
        .eq('email', userEmail)
      if (error) throw error
      // count 0 means row-level security quietly refused the write.
      if (count === 0) throw new Error(t('profile.denied'))
      toast.success(t('profile.saved'))
      onOpenChange(false)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('profile.title')}
      footer={
        <>
          <DialogClose>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button type="submit" form="profile-form" loading={saving} disabled={loading}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-4 py-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <form id="profile-form" onSubmit={save} className="space-y-4 py-2">
          {formError && <Banner tone="danger" scrollIntoView>{formError}</Banner>}
          <Field label={t('profile.email')} hint={t('profile.emailHint')}>
            <Input type="email" value={userEmail} readOnly disabled />
          </Field>
          <Field label={t('profile.name')}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label={t('profile.phone')} hint={t('profile.phoneHint')} error={phoneError} required>
            <Input
              type="tel"
              value={contactNumber}
              onChange={(e) => {
                setContactNumber(e.target.value)
                setPhoneError('')
              }}
              placeholder="012-345 6789"
              autoComplete="tel"
            />
          </Field>
          {showWaApp && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t('profile.waApp')}</p>
              <SegmentedControl
                label={t('profile.waApp')}
                value={waBusiness ? 'business' : 'personal'}
                onChange={(value) => setWaBusinessChoice(value === 'business')}
                options={[
                  { value: 'personal', label: t('profile.waPersonal') },
                  { value: 'business', label: t('profile.waBusiness') },
                ]}
              />
              <p className="text-xs text-fg-subtle">{t('profile.waHint')}</p>
            </div>
          )}
        </form>
      )}
    </Dialog>
  )
}
