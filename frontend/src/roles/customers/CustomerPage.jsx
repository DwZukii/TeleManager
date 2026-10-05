import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bell, Check, ChevronLeft, ExternalLink, Paperclip, Pencil, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../../supabase'
import {
  Badge,
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  Combobox,
  Field,
  IconButton,
  Input,
  PageSkeleton,
  StatusBadge,
  Textarea,
} from '../../ui'
import { useLanguage, useT } from '../../i18n/useT'
import { formatDate } from '../../i18n/format'
import { formatPhone, getWhatsAppUrl, parseDobFromIC } from '../../utils'
import CustomerStatusSelect from './CustomerStatusSelect'

const MAX_DOCS = 5
const MAX_BYTES = 5 * 1024 * 1024
const today = () => new Date().toISOString().slice(0, 10)

const formFrom = (c) => ({
  fullName: c.fullName || '',
  icNumber: c.icNumber || '',
  phoneNumber: c.phoneNumber || '',
  dateOfBirth: c.dateOfBirth || '',
  status: c.status || 'New',
  lastSalary: c.lastSalary != null ? String(c.lastSalary) : '',
  lastDisbursementDate: c.lastDisbursementDate || '',
  agentEmail: c.agentEmail || '',
})

/** CustomerPage — one customer, at /customers/:customerId. */
export default function CustomerPage({ customers, isLoading, userRole, agentsList, onDelete, confirm, refresh }) {
  const t = useT()
  const { customerId } = useParams()
  const customer = customers.find((c) => String(c.id) === customerId)

  if (!customer) {
    if (isLoading) return <PageSkeleton />
    return (
      <div className="space-y-4">
        <Banner tone="warning">{t('customers.notFound')}</Banner>
        <Button as={Link} to=".." relative="path" variant="secondary" icon={ChevronLeft}>
          {t('customers.back')}
        </Button>
      </div>
    )
  }

  return (
    <CustomerView
      key={customer.id}
      customer={customer}
      userRole={userRole}
      agentsList={agentsList}
      onDelete={onDelete}
      confirm={confirm}
      refresh={refresh}
    />
  )
}

function CustomerView({ customer, userRole, agentsList, onDelete, confirm, refresh }) {
  const t = useT()
  const { lang } = useLanguage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileRef = useRef(null)

  const isAdmin = userRole === 'admin' || userRole === 'super_admin'
  const docs = customer.documents ?? []
  const reminders = customer.reminders ?? []

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState(() => formFrom(customer))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newDoc, setNewDoc] = useState(null)
  const [newReminderDate, setNewReminderDate] = useState('')
  const [newReminderNote, setNewReminderNote] = useState('')
  const [dismissingId, setDismissingId] = useState(null)

  const set = (field) => (value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  function resetExtras() {
    setNewNote('')
    setNewDoc(null)
    setNewReminderDate('')
    setNewReminderNote('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function startEdit() {
    setForm(formFrom(customer))
    setErrors({})
    setFormError('')
    setEditing(true)
  }

  function cancelEdit() {
    setForm(formFrom(customer))
    resetExtras()
    setErrors({})
    setFormError('')
    setEditing(false)
  }

  async function save() {
    const found = {}
    if (!form.fullName.trim()) found.fullName = t('customer.nameRequired')
    if (!form.icNumber.trim()) found.icNumber = t('customer.icRequired')
    if (!form.phoneNumber.trim() && customer.phoneNumber) found.phoneNumber = t('customer.phoneRequired')
    if (Object.keys(found).length) {
      setErrors(found)
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const { data: auth } = await supabase.auth.getSession()
      const me = auth?.session?.user?.email
      if (!me) throw new Error('Could not authenticate user')

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          full_name: form.fullName.trim(),
          ic_number: form.icNumber.trim(),
          phone_number: form.phoneNumber.trim() || null,
          date_of_birth: form.dateOfBirth || null,
          status: form.status,
          last_salary: form.lastSalary !== '' ? parseFloat(form.lastSalary) : null,
          last_disbursement_date: form.lastDisbursementDate || null,
          last_updated_at: new Date().toISOString(),
          ...(isAdmin ? { agent_email: form.agentEmail || null } : {}),
        })
        .eq('id', customer.id)
      if (updateError) throw updateError

      if (newNote.trim()) {
        const { error } = await supabase
          .from('customer_notes')
          .insert({ customer_id: customer.id, note_text: newNote.trim(), author_email: me })
        if (error) throw error
      }

      if (newDoc) {
        const storagePath = `${customer.id}/${Date.now()}_${newDoc.name.replace(/\s+/g, '_')}`
        const { error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(storagePath, newDoc, { upsert: false })
        if (uploadError) throw uploadError
        const { error: docError } = await supabase
          .from('customer_documents')
          .insert({ customer_id: customer.id, doc_type: 'payslip', storage_path: storagePath, uploaded_by: me })
        if (docError) throw docError
      }

      if (newReminderDate && newReminderNote.trim()) {
        const { error } = await supabase.from('customer_reminders').insert({
          customer_id: customer.id,
          agent_email: form.agentEmail || customer.agentEmail || me,
          reminder_date: newReminderDate,
          reminder_note: newReminderNote.trim(),
        })
        if (error) throw error
      }

      toast.success(t('customer.saved'))
      resetExtras()
      setEditing(false)
      refresh()
    } catch (err) {
      console.error('Save error:', err)
      setFormError(t('customer.saveFailed', { error: err.message }))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!(await confirm(t('customer.deleteConfirm', { name: customer.fullName })))) return
    setDeleting(true)
    const ok = await onDelete(customer.id)
    setDeleting(false)
    if (ok) navigate('..', { relative: 'path' })
  }

  async function dismissReminder(id) {
    setDismissingId(id)
    try {
      await supabase.from('customer_reminders').update({ dismissed: true }).eq('id', id)
      refresh()
      queryClient.invalidateQueries({ queryKey: ['staffData'] })
    } finally {
      setDismissingId(null)
    }
  }

  async function openDoc(doc) {
    try {
      const { data, error } = await supabase.storage.from('customer-documents').createSignedUrl(doc.storagePath, 3600)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (err) {
      toast.error(t('customer.docOpenFailed', { error: err.message || 'Permission denied' }))
    }
  }

  function chooseDoc(event) {
    const file = event.target.files?.[0]
    if (file && file.size > MAX_BYTES) {
      toast.error(t('customer.docTooLarge'))
      event.target.value = ''
      return
    }
    setNewDoc(file || null)
  }

  const agentOptions = [
    { value: '', label: t('customers.unassigned') },
    ...agentsList.map((a) => ({ value: a.email, label: a.full_name || a.email, description: a.full_name ? a.email : undefined })),
  ]
  const agentLabel = agentsList.find((a) => a.email === customer.agentEmail)?.full_name || customer.agentEmail
  const money =
    customer.lastSalary == null
      ? '—'
      : `RM ${Number(customer.lastSalary).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Button as={Link} to=".." relative="path" variant="ghost" size="sm" icon={ChevronLeft} className="-ml-2">
        {t('customers.back')}
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{customer.fullName}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <StatusBadge kind="customer" status={customer.status || 'New'} />
            <span className="tabular-nums">{customer.icNumber}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {editing ? (
            <>
              <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={save} loading={saving}>
                {t('customer.save')}
              </Button>
            </>
          ) : (
            <Button variant="secondary" icon={Pencil} onClick={startEdit}>
              {t('customer.edit')}
            </Button>
          )}
        </div>
      </header>

      {editing && <Banner tone="info">{t('customer.editHint')}</Banner>}
      {formError && <Banner tone="danger" scrollIntoView>{formError}</Banner>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Card>
            <CardHeader title={t('customer.details')} />
            <CardBody>
              {editing ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label={t('customer.name')} error={errors.fullName} required>
                    <Input value={form.fullName} onChange={(e) => set('fullName')(e.target.value)} />
                  </Field>
                  <Field label={t('customer.ic')} error={errors.icNumber} required>
                    <Input
                      value={form.icNumber}
                      inputMode="numeric"
                      onChange={(e) => {
                        set('icNumber')(e.target.value)
                        const dob = parseDobFromIC(e.target.value)
                        if (dob) set('dateOfBirth')(dob)
                      }}
                    />
                  </Field>
                  <Field label={t('customer.dob')} hint={t('customer.dobHint')}>
                    <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth')(e.target.value)} />
                  </Field>
                  <Field label={t('customer.phone')} error={errors.phoneNumber}>
                    <Input type="tel" value={form.phoneNumber} onChange={(e) => set('phoneNumber')(e.target.value)} />
                  </Field>
                  <Field label={t('customer.status')}>
                    <CustomerStatusSelect size="md" value={form.status} onChange={set('status')} />
                  </Field>
                  <dl>
                    <Info label={t('customer.added')}>{formatDate(customer.createdAt, lang) || '—'}</Info>
                  </dl>
                  {isAdmin && agentsList.length > 0 && (
                    <Field label={t('customer.agent')} className="sm:col-span-2">
                      <Combobox options={agentOptions} value={form.agentEmail} onChange={set('agentEmail')} />
                    </Field>
                  )}
                </div>
              ) : (
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Info label={t('customer.name')}>{customer.fullName}</Info>
                  <Info label={t('customer.ic')}>
                    <span className="tabular-nums">{customer.icNumber}</span>
                  </Info>
                  <Info label={t('customer.dob')}>{formatDate(customer.dateOfBirth, lang) || '—'}</Info>
                  <Info label={t('customer.phone')}>
                    {customer.phoneNumber ? (
                      <a
                        href={getWhatsAppUrl(customer.phoneNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t('customer.whatsapp')}
                        className="inline-flex items-center gap-1.5 tabular-nums text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
                      >
                        {formatPhone(customer.phoneNumber)}
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      '—'
                    )}
                  </Info>
                  <Info label={t('customer.status')}>
                    <StatusBadge kind="customer" status={customer.status || 'New'} />
                  </Info>
                  <Info label={t('customer.added')}>{formatDate(customer.createdAt, lang) || '—'}</Info>
                  {isAdmin && customer.agentEmail && <Info label={t('customer.agent')}>{agentLabel}</Info>}
                </dl>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('customer.money')} />
            <CardBody>
              {editing ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label={`${t('customer.salary')} (RM)`}>
                    <Input type="number" inputMode="decimal" value={form.lastSalary} onChange={(e) => set('lastSalary')(e.target.value)} />
                  </Field>
                  <Field label={t('customer.disbursed')}>
                    <Input type="date" value={form.lastDisbursementDate} onChange={(e) => set('lastDisbursementDate')(e.target.value)} />
                  </Field>
                </div>
              ) : (
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Info label={t('customer.salary')}>
                    <span className="tabular-nums">{money}</span>
                  </Info>
                  <Info label={t('customer.disbursed')}>{formatDate(customer.lastDisbursementDate, lang) || '—'}</Info>
                </dl>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('customer.documents')} description={editing ? t('customer.docHint') : undefined} />
            <CardBody className="space-y-2">
              {docs.length === 0 && !editing && <p className="text-sm text-fg-muted">{t('customer.noDocs')}</p>}
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => openDoc(doc)}
                  className="flex w-full items-center gap-2 rounded-control border border-line px-3 py-2.5 text-left text-sm text-brand hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Paperclip className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{doc.fileName}</span>
                  <ExternalLink className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                </button>
              ))}
              {editing &&
                (docs.length >= MAX_DOCS ? (
                  <p className="text-sm text-warning">{t('customer.docLimit')}</p>
                ) : (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="sr-only"
                      tabIndex={-1}
                      onChange={chooseDoc}
                    />
                    {newDoc ? (
                      <div className="flex items-center gap-2 rounded-control border border-dashed border-line-strong px-3 py-2 text-sm">
                        <Paperclip className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{newDoc.name}</span>
                        <IconButton
                          label={t('customer.removeFile')}
                          icon={X}
                          size="sm"
                          onClick={() => {
                            setNewDoc(null)
                            if (fileRef.current) fileRef.current.value = ''
                          }}
                        />
                      </div>
                    ) : (
                      <Button variant="secondary" icon={Plus} onClick={() => fileRef.current?.click()}>
                        {t('customer.addDoc')}
                      </Button>
                    )}
                  </>
                ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title={t('customer.notes')} />
            <CardBody className="space-y-3">
              {editing && (
                <Field label={t('customer.newNote')}>
                  <Textarea rows={3} value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={t('customer.notePlaceholder')} />
                </Field>
              )}
              {customer.notes?.length ? (
                <ul className="space-y-3">
                  {customer.notes.map((note) => (
                    <li key={note.id} className="border-l-2 border-line-strong pl-3">
                      <p className="whitespace-pre-wrap text-sm">{note.note_text}</p>
                      <p className="mt-1 text-xs text-fg-subtle">{formatDate(note.created_at, lang)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                !editing && <p className="text-sm text-fg-muted">{t('customer.noNotes')}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('customer.reminders')} />
            <CardBody className="space-y-3">
              {editing && (
                <div className="space-y-3 rounded-control border border-line p-3">
                  <p className="text-sm font-medium">{t('customer.newReminder')}</p>
                  <Field label={t('customer.reminderDate')}>
                    <Input type="date" min={today()} value={newReminderDate} onChange={(e) => setNewReminderDate(e.target.value)} />
                  </Field>
                  <Field label={t('customer.reminderNote')}>
                    <Input value={newReminderNote} onChange={(e) => setNewReminderNote(e.target.value)} />
                  </Field>
                  {newReminderDate && !newReminderNote.trim() && (
                    <p className="text-xs text-warning">{t('customer.reminderNoteNeeded')}</p>
                  )}
                </div>
              )}
              {reminders.length ? (
                <ul className="divide-y divide-line">
                  {reminders.map((r) => {
                    const due = r.reminder_date === today() && !r.dismissed
                    const overdue = r.reminder_date < today() && !r.dismissed
                    return (
                      <li key={r.id} className={`flex items-start gap-3 py-2.5 first:pt-0 last:pb-0 ${r.dismissed ? 'opacity-60' : ''}`}>
                        <Bell className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${r.dismissed ? 'line-through' : ''}`}>{r.reminder_note}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs tabular-nums text-fg-subtle">{formatDate(r.reminder_date, lang)}</span>
                            {due && <Badge tone="accent">{t('customer.due')}</Badge>}
                            {overdue && <Badge tone="danger">{t('customer.overdue')}</Badge>}
                            {r.dismissed && <Badge>{t('customer.dismissed')}</Badge>}
                          </div>
                        </div>
                        {!r.dismissed && (
                          <IconButton
                            label={t('customer.markDone')}
                            icon={Check}
                            size="sm"
                            disabled={dismissingId === r.id}
                            onClick={() => dismissReminder(r.id)}
                          />
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                !editing && <p className="text-sm text-fg-muted">{t('customer.noReminders')}</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="border-t border-line pt-5">
        <Button variant="dangerOutline" icon={Trash2} onClick={remove} loading={deleting} disabled={saving}>
          {t('customer.delete')}
        </Button>
      </div>
    </div>
  )
}

function Info({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-fg">{children}</dd>
    </div>
  )
}
