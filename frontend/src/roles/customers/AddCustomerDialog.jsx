import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Paperclip, X } from 'lucide-react'
import { supabase } from '../../supabase'
import { Banner, Button, Dialog, DialogClose, Field, IconButton, Input, Textarea } from '../../ui'
import { useT } from '../../i18n/useT'
import { parseDobFromIC } from '../../utils'

const MAX_BYTES = 5 * 1024 * 1024
const EMPTY = {
  fullName: '',
  icNumber: '',
  phoneNumber: '',
  dateOfBirth: '',
  lastSalary: '',
  lastDisbursementDate: '',
  payslipFile: null,
  notes: '',
  reminderDate: '',
  reminderNote: '',
}
const today = () => new Date().toISOString().slice(0, 10)

/**
 * AddCustomerDialog — adds a returning customer, assigned to whoever adds it.
 * Same checks as before: required fields, no duplicate IC or phone, 5 MB file.
 */
export default function AddCustomerDialog({ open, onOpenChange, userEmail, onAdded }) {
  const t = useT()
  const fileRef = useRef(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  function changeOpen(value) {
    if (!value) {
      setForm(EMPTY)
      setErrors({})
      setFormError('')
    }
    onOpenChange(value)
  }

  function validate() {
    const e = {}
    if (!form.fullName.trim()) e.fullName = t('customer.nameRequired')
    if (!form.icNumber.trim()) e.icNumber = t('customer.icRequired')
    if (!form.phoneNumber.trim()) e.phoneNumber = t('customer.phoneRequired')
    if (!form.dateOfBirth) e.dateOfBirth = t('customer.dobRequired')
    return e
  }

  async function submit(event) {
    event.preventDefault()
    const found = validate()
    if (Object.keys(found).length) {
      setErrors(found)
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const cleanIC = form.icNumber.trim()
      const cleanPhone = form.phoneNumber.trim()

      // Stop if this IC or phone number is already a customer.
      const { data: existing, error: checkError } = await supabase
        .from('customers')
        .select('id, full_name, ic_number, phone_number, agent_email')
        .or(`ic_number.eq.${cleanIC},phone_number.eq.${cleanPhone}`)
        .limit(1)
      if (!checkError && existing?.length > 0) {
        const match = existing[0]
        setFormError(
          t('addCustomer.exists', {
            match: match.ic_number === cleanIC ? t('addCustomer.matchIc') : t('addCustomer.matchPhone'),
            name: match.full_name,
            agent: match.agent_email || t('customers.unassigned'),
          })
        )
        setSaving(false)
        return
      }

      const { data: created, error: insertError } = await supabase
        .from('customers')
        .insert([
          {
            full_name: form.fullName.trim(),
            ic_number: cleanIC,
            phone_number: cleanPhone,
            date_of_birth: form.dateOfBirth,
            last_salary: form.lastSalary ? Number(form.lastSalary) : null,
            last_disbursement_date: form.lastDisbursementDate || null,
            agent_email: userEmail,
            created_by: userEmail,
            status: 'New',
          },
        ])
        .select()
        .single()
      if (insertError) throw insertError

      if (form.payslipFile) {
        const filePath = `${created.id}/${form.payslipFile.name}`
        const { error: uploadError } = await supabase.storage.from('customer-documents').upload(filePath, form.payslipFile)
        if (uploadError) throw uploadError
        const { error: docError } = await supabase
          .from('customer_documents')
          .insert([{ customer_id: created.id, doc_type: 'payslip', storage_path: filePath, uploaded_by: userEmail }])
        if (docError) throw docError
      }

      if (form.notes.trim()) {
        const { error: notesError } = await supabase
          .from('customer_notes')
          .insert([{ customer_id: created.id, author_email: userEmail, note_text: form.notes.trim() }])
        if (notesError) throw notesError
      }

      if (form.reminderDate && form.reminderNote.trim()) {
        const { error: reminderError } = await supabase.from('customer_reminders').insert([
          {
            customer_id: created.id,
            agent_email: userEmail,
            reminder_date: form.reminderDate,
            reminder_note: form.reminderNote.trim(),
          },
        ])
        if (reminderError) throw reminderError
      }

      toast.success(t('addCustomer.added', { name: created.full_name }))
      setForm(EMPTY)
      onAdded()
    } catch (err) {
      console.error('Error saving customer:', err)
      setFormError(t('addCustomer.failed', { error: err.message }))
    } finally {
      setSaving(false)
    }
  }

  function chooseFile(event) {
    const file = event.target.files?.[0]
    if (file && file.size > MAX_BYTES) {
      toast.error(t('customer.docTooLarge'))
      event.target.value = ''
      return
    }
    set('payslipFile', file ?? null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={changeOpen}
      title={t('addCustomer.title')}
      description={t('addCustomer.description')}
      size="lg"
      footer={
        <>
          <DialogClose>
            <Button variant="secondary">{t('common.cancel')}</Button>
          </DialogClose>
          <Button type="submit" form="add-customer-form" loading={saving}>
            {t('addCustomer.save')}
          </Button>
        </>
      }
    >
      <form id="add-customer-form" onSubmit={submit} noValidate className="space-y-4 py-2">
        {formError && <Banner tone="danger" scrollIntoView>{formError}</Banner>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('customer.name')} error={errors.fullName} required>
            <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="off" />
          </Field>
          <Field label={t('customer.ic')} error={errors.icNumber} required>
            <Input
              value={form.icNumber}
              placeholder="880212-14-5566"
              inputMode="numeric"
              onChange={(e) => {
                set('icNumber', e.target.value)
                const dob = parseDobFromIC(e.target.value)
                if (dob) set('dateOfBirth', dob)
              }}
            />
          </Field>
          <Field label={t('customer.dob')} hint={t('customer.dobHint')} error={errors.dateOfBirth} required>
            <Input type="date" value={form.dateOfBirth} max={today()} onChange={(e) => set('dateOfBirth', e.target.value)} />
          </Field>
          <Field label={t('customer.phone')} error={errors.phoneNumber} required>
            <Input type="tel" value={form.phoneNumber} placeholder="0123456789" onChange={(e) => set('phoneNumber', e.target.value)} />
          </Field>
          <Field label={`${t('customer.salary')} (RM)`} optional>
            <Input type="number" min="0" step="50" inputMode="decimal" placeholder="3500" value={form.lastSalary} onChange={(e) => set('lastSalary', e.target.value)} />
          </Field>
          <Field label={t('customer.disbursed')} optional>
            <Input type="date" max={today()} value={form.lastDisbursementDate} onChange={(e) => set('lastDisbursementDate', e.target.value)} />
          </Field>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">
            {t('addCustomer.document')} <span className="font-normal text-fg-subtle">· {t('common.optional')}</span>
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/jpg"
            aria-label={t('addCustomer.document')}
            onChange={chooseFile}
            className="sr-only"
            tabIndex={-1}
          />
          {form.payslipFile ? (
            <div className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm">
              <Paperclip className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{form.payslipFile.name}</span>
              <IconButton
                label={t('customer.removeFile')}
                icon={X}
                size="sm"
                onClick={() => {
                  set('payslipFile', null)
                  if (fileRef.current) fileRef.current.value = ''
                }}
              />
            </div>
          ) : (
            <Button variant="secondary" icon={Paperclip} onClick={() => fileRef.current?.click()}>
              {t('lead.chooseFile')}
            </Button>
          )}
          <p className="text-xs text-fg-subtle">{t('addCustomer.docHint')}</p>
        </div>

        <Field label={t('customer.notes')} optional>
          <Textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder={t('customer.notePlaceholder')} />
        </Field>

        <fieldset className="space-y-3 rounded-control border border-line p-3">
          <legend className="px-1 text-sm font-medium">
            {t('addCustomer.reminder')} <span className="font-normal text-fg-subtle">· {t('common.optional')}</span>
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('customer.reminderDate')}>
              <Input type="date" min={today()} value={form.reminderDate} onChange={(e) => set('reminderDate', e.target.value)} />
            </Field>
            <Field label={t('customer.reminderNote')}>
              <Input value={form.reminderNote} onChange={(e) => set('reminderNote', e.target.value)} />
            </Field>
          </div>
          {form.reminderDate && !form.reminderNote.trim() && (
            <p className="text-xs text-warning">{t('customer.reminderNoteNeeded')}</p>
          )}
        </fieldset>
      </form>
    </Dialog>
  )
}
