import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../../supabase'
import { Banner, Button, Checkbox, Combobox, Dialog, DialogClose, Field, Input, PasswordInput, Select } from '../../ui'
import { useT } from '../../i18n/useT'

const ROLES = ['agent', 'manager', 'general_manager']

/**
 * CreateAccountDialog — signs up a new login and gives it a profile.
 *
 *   by="manager"  creates an agent on the manager's own team
 *   by="admin"    any role; agents can get a manager, GMs a set of managers
 *
 * Same steps as before: refuse an email that already has a profile, sign up
 * with a throwaway client so the admin stays signed in, then add the profile.
 */
export default function CreateAccountDialog({ open, onOpenChange, by, userEmail, managersList = [], refreshKey }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('agent')
  const [manager, setManager] = useState('')
  const [gmManagers, setGmManagers] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function changeOpen(value) {
    if (!value) {
      setEmail('')
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
      const newRole = by === 'manager' ? 'agent' : role
      const newManager = by === 'manager' ? userEmail : newRole === 'manager' ? null : manager || null

      const { data: existing } = await supabase.from('profiles').select('email, role').eq('email', address).single()
      if (existing) {
        setError(t('account.exists', { email: address, role: t(`role.${existing.role}`, null, existing.role) }))
        setSaving(false)
        return
      }

      const fresh = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      })
      let { error: signUpError } = await fresh.auth.signUp({ email: address, password })
      // An auth user without a profile can be finished off; that is not an error.
      if (signUpError?.message?.toLowerCase().includes('already registered')) signUpError = null
      if (signUpError) throw signUpError

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ email: address, role: newRole, manager_email: newManager }])
      if (profileError) throw profileError

      if (newRole === 'general_manager' && gmManagers.length > 0) {
        const { error: gmError } = await supabase.from('profiles').update({ general_manager_email: address }).in('email', gmManagers)
        if (gmError) throw gmError
      }

      toast.success(t('account.created', { email: address }))
      queryClient.invalidateQueries({ queryKey: refreshKey })
      changeOpen(false)
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
