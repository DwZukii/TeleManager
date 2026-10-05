import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../supabase'
import { Banner, Button, PageSkeleton, StatusBadge } from '../../ui'
import { useT } from '../../i18n/useT'
import { DetailsCard, DocumentsCard, MoneyCard, NotesCard, RemindersCard } from './CustomerCards'

const MAX_BYTES = 5 * 1024 * 1024

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
          <DetailsCard
            customer={customer}
            editing={editing}
            form={form}
            set={set}
            errors={errors}
            isAdmin={isAdmin}
            agentsList={agentsList}
          />
          <MoneyCard customer={customer} editing={editing} form={form} set={set} />
          <DocumentsCard
            docs={docs}
            editing={editing}
            fileRef={fileRef}
            newDoc={newDoc}
            onChoose={chooseDoc}
            onClear={() => {
              setNewDoc(null)
              if (fileRef.current) fileRef.current.value = ''
            }}
            onOpen={openDoc}
          />
        </div>

        <div className="space-y-5 lg:col-span-2">
          <NotesCard notes={customer.notes} editing={editing} newNote={newNote} onNewNote={setNewNote} />
          <RemindersCard
            reminders={reminders}
            editing={editing}
            date={newReminderDate}
            note={newReminderNote}
            onDate={setNewReminderDate}
            onNote={setNewReminderNote}
            dismissingId={dismissingId}
            onDismiss={dismissReminder}
          />
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
