import { Bell, Check, ExternalLink, Paperclip, Plus, X } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, Combobox, Field, IconButton, Input, StatusBadge, Textarea } from '../../ui'
import { useLanguage, useT } from '../../i18n/useT'
import { formatDate } from '../../i18n/format'
import { formatPhone, getWhatsAppUrl, parseDobFromIC } from '../../utils'
import CustomerStatusSelect from './CustomerStatusSelect'

// The cards on a customer's page. Each one shows the saved values, or the
// form fields while the page is in edit mode. State and saving live in
// CustomerPage.

const MAX_DOCS = 5
const today = () => new Date().toISOString().slice(0, 10)

function Info({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-fg">{children}</dd>
    </div>
  )
}

export function DetailsCard({ customer, editing, form, set, errors, isAdmin, agentsList }) {
  const t = useT()
  const { lang } = useLanguage()
  const agentLabel = agentsList.find((a) => a.email === customer.agentEmail)?.full_name || customer.agentEmail
  const agentOptions = [
    { value: '', label: t('customers.unassigned') },
    ...agentsList.map((a) => ({ value: a.email, label: a.full_name || a.email, description: a.full_name ? a.email : undefined })),
  ]

  return (
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
  )
}

export function MoneyCard({ customer, editing, form, set }) {
  const t = useT()
  const { lang } = useLanguage()
  const money =
    customer.lastSalary == null
      ? '—'
      : `RM ${Number(customer.lastSalary).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`

  return (
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
  )
}

export function DocumentsCard({ docs, editing, fileRef, newDoc, onChoose, onClear, onOpen }) {
  const t = useT()
  return (
    <Card>
      <CardHeader title={t('customer.documents')} description={editing ? t('customer.docHint') : undefined} />
      <CardBody className="space-y-2">
        {docs.length === 0 && !editing && <p className="text-sm text-fg-muted">{t('customer.noDocs')}</p>}
        {docs.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => onOpen(doc)}
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
                aria-label={t('customer.addDoc')}
                className="sr-only"
                tabIndex={-1}
                onChange={onChoose}
              />
              {newDoc ? (
                <div className="flex items-center gap-2 rounded-control border border-dashed border-line-strong px-3 py-2 text-sm">
                  <Paperclip className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{newDoc.name}</span>
                  <IconButton label={t('customer.removeFile')} icon={X} size="sm" onClick={onClear} />
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
  )
}

export function NotesCard({ notes, editing, newNote, onNewNote }) {
  const t = useT()
  const { lang } = useLanguage()
  return (
    <Card>
      <CardHeader title={t('customer.notes')} />
      <CardBody className="space-y-3">
        {editing && (
          <Field label={t('customer.newNote')}>
            <Textarea rows={3} value={newNote} onChange={(e) => onNewNote(e.target.value)} placeholder={t('customer.notePlaceholder')} />
          </Field>
        )}
        {notes?.length ? (
          <ul className="space-y-3">
            {notes.map((note) => (
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
  )
}

export function RemindersCard({ reminders, editing, date, note, onDate, onNote, dismissingId, onDismiss }) {
  const t = useT()
  const { lang } = useLanguage()
  return (
    <Card>
      <CardHeader title={t('customer.reminders')} />
      <CardBody className="space-y-3">
        {editing && (
          <div className="space-y-3 rounded-control border border-line p-3">
            <p className="text-sm font-medium">{t('customer.newReminder')}</p>
            <Field label={t('customer.reminderDate')}>
              <Input type="date" min={today()} value={date} onChange={(e) => onDate(e.target.value)} />
            </Field>
            <Field label={t('customer.reminderNote')}>
              <Input value={note} onChange={(e) => onNote(e.target.value)} />
            </Field>
            {date && !note.trim() && <p className="text-xs text-warning">{t('customer.reminderNoteNeeded')}</p>}
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
                      onClick={() => onDismiss(r.id)}
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
  )
}
