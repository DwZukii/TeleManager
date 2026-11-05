import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../supabase'
import { Banner, Button, Checkbox, Combobox, Dialog, DialogClose, Field, Input, PasswordInput, Select } from '../../ui'
import { useT } from '../../i18n/useT'

const ROLES = ['agent', 'manager', 'general_manager']

// The create-user function answers { error, code } when it says no;
// supabase-js hands over the response to read it from.
async function refusal(callError) {
  try {
    return await callError.context.json()
  } catch {
    return { error: callError.message }
  }
}

/**
 * CreateAccountDialog — makes a new login and its profile.
 *
 *   by="manager"  creates an agent on the manager's own team
 *   by="admin"    any role; agents can get a manager, GMs a set of managers
 *
 * Public sign-up is off, so the create-user function (supabase/functions)
 * does the work and checks who is asking. It refuses an email that already
 * has a profile, and saves the email in lower case.
 */
export default function CreateAccountDialog({ open, onOpenChange, by, managersList = [], refreshKey }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('agent')
  const [manager, setManager] = useState('')
  const [gmManagers, setGmManagers] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function changeOpen(value) {
    if (!value) {
      setEmail('')
      setFullName('')
      setPassword('')
      setRole('agent')
      setManager('')
      setGmManagers([])
      setError('')
    }
    onOpenChange(value)
  }

  async function create(event) {
    event.preventDefault()
    const address = email.trim()
    if (!address || password.length < 6) return setError(t('account.missing'))
    setSaving(true)
    setError('')
    try {
      const { data, error: callError } = await supabase.functions.invoke('create-user', {
        body: {
          email: address,
          password,
          // The name is optional here; without one they are asked for it when they first sign in.
          fullName: fullName.trim(),
          // A manager's new account is always an agent on their team; the function sees to that.
          ...(by === 'admin' && {
            role,
            managerEmail: role === 'agent' ? manager || null : null,
            gmManagers: role === 'general_manager' ? gmManagers : [],
          }),
        },
      })

      if (callError) {
        const answer = await refusal(callError)
        if (answer.code === 'gm_link') {
          // The account is made; only the link to its managers failed.
          toast.error(t('account.gmLinkFailed', { email: answer.email, error: answer.error }))
          queryClient.invalidateQueries({ queryKey: refreshKey })
          changeOpen(false)
        } else if (answer.code === 'exists') {
          setError(t('account.exists', { email: answer.email, role: t(`role.${answer.role}`, null, answer.role) }))
        } else if (answer.code === 'bad_manager') {
          setError(t('account.badManager'))
        } else if (answer.code === 'forbidden') {
          setError(t('account.notAllowed'))
        } else {
          setError(t('account.failed', { error: answer.error || callError.message }))
        }
      } else {
        toast.success(t('account.created', { email: data.email }))
        queryClient.invalidateQueries({ queryKey: refreshKey })
        changeOpen(false)
      }
    } catch (err) {
      setError(t('account.failed', { error: err.message }))
    }
    setSaving(false)
  }

  const managerOptions = [
    { value: '', label: t('account.noManager') },
    ...managersList.map((m) => ({ value: m.email, label: m.full_name || m.email, description: m.full_name ? m.email : undefined })),
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={changeOpen}
      title={t('account.title')}
      description={by === 'manager' ? t('account.descManager') : t('account.descAdmin')}
      footer={
        <>
          <DialogClose>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button type="submit" form="create-account-form" loading={saving}>
            {t('account.create')}
          </Button>
        </>
      }
    >
      <form id="create-account-form" onSubmit={create} className="space-y-4 py-2">
        {error && <Banner tone="danger" scrollIntoView>{error}</Banner>}
        <Field label={t('account.email')}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" placeholder="name@company.com" />
        </Field>
        <Field label={t('profile.name')} hint={t('account.nameHint')} optional>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label={t('account.password')} hint={t('account.passwordHint')}>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        {by === 'admin' && (
          <>
            <Field label={t('account.role')}>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`role.${r}`)}
                  </option>
                ))}
              </Select>
            </Field>
            {role === 'agent' && (
              <Field label={t('account.manager')}>
                <Combobox options={managerOptions} value={manager} onChange={setManager} />
              </Field>
            )}
            {role === 'general_manager' && (
              <fieldset className="space-y-2">
                <legend className="mb-1.5 text-sm font-medium">{t('account.gmManagers')}</legend>
                {managersList.length === 0 ? (
                  <p className="text-sm text-fg-muted">{t('account.noManagers')}</p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-control border border-line p-3">
                    {managersList.map((m) => (
                      <Checkbox
                        key={m.email}
                        label={m.full_name || m.email}
                        description={m.full_name ? m.email : undefined}
                        checked={gmManagers.includes(m.email)}
                        onChange={(e) =>
                          setGmManagers((list) => (e.target.checked ? [...list, m.email] : list.filter((x) => x !== m.email)))
                        }
                      />
                    ))}
                  </div>
                )}
              </fieldset>
            )}
          </>
        )}
      </form>
    </Dialog>
  )
}
