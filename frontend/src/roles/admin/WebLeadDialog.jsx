import { useState } from 'react'
import { toast } from 'sonner'
import { MessageCircle, Trash2 } from 'lucide-react'
import { Banner, Button, Dialog, Field, Input, Textarea } from '../../ui'
import { useT } from '../../i18n/useT'
import { formatPhone } from '../../utils'

const money = (v) => (v == null || v === '' ? null : `RM ${Number(v).toLocaleString('en-MY', { maximumFractionDigits: 0 })}`)

function Row({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{value == null || value === '' ? '—' : value}</dd>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-3 border-t border-line pt-4 first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

/** WebLeadDialog — everything the visitor sent, plus who is following it up. */
export default function WebLeadDialog({ lead, onClose, onSave, onDelete, relative }) {
  const t = useT()
  const [handledBy, setHandledBy] = useState(lead?.handled_by || '')
  const [notes, setNotes] = useState(lead?.admin_notes || '')
  const [saving, setSaving] = useState(false)

  if (!lead) return <Dialog open={false} onOpenChange={onClose} title="" />

  async function save() {
    setSaving(true)
    const ok = await onSave(lead.id, { handled_by: handledBy.trim() || null, admin_notes: notes })
    setSaving(false)
    if (ok) {
      toast.success(t('web.saved'))
      onClose()
    }
  }

  const hasCalculator = lead.gross_salary != null || lead.estimated_low != null
  const deduction = lead.deduction_type === 'bpa' ? t('web.bpa') : lead.deduction_type === 'direct' ? t('web.direct') : null
  const location = lead.location === 'luarBandar' ? t('web.luarBandar') : lead.location === 'bandar' ? t('web.bandar') : null

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={lead.full_name}
      description={`${t('web.received')} ${relative(lead.created_at)}`}
      size="lg"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="dangerOutline" icon={Trash2} onClick={() => onDelete(lead)}>
            {t('web.delete')}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button as="a" href={`https://wa.me/${lead.phone_number}`} target="_blank" rel="noreferrer" variant="secondary" icon={MessageCircle}>
              {t('web.whatsapp')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {lead.already_in_pool && <Banner tone="warning">{t('web.inPoolBody')}</Banner>}

        <Section title={t('web.contact')}>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Row label={t('web.phone')} value={formatPhone(lead.phone_number)} />
            <Row label={t('web.email')} value={lead.email} />
            <Row label={t('web.employer')} value={lead.employer_name} />
            <Row label={t('web.age')} value={lead.age} />
            <Row label={t('web.location')} value={location} />
            <Row label={t('web.language')} value={lead.lang === 'en' ? 'English' : 'Bahasa Melayu'} />
          </dl>
        </Section>

        <Section title={t('web.calculator')}>
          {!hasCalculator ? (
            <p className="text-sm text-fg-muted">{t('web.noCalculator')}</p>
          ) : (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Row label={t('web.salary')} value={money(lead.gross_salary)} />
              <Row label={t('web.commitment')} value={money(lead.existing_commitment)} />
              <Row label={t('web.deduction')} value={deduction} />
              <Row label={t('web.tenure')} value={lead.tenure_years ? t('web.tenureYears', { years: lead.tenure_years }) : null} />
              <Row label={t('web.installment')} value={money(lead.affordable_installment)} />
              <Row
                label={t('web.range')}
                value={lead.estimated_low != null ? `${money(lead.estimated_low)} – ${money(lead.estimated_high) ?? '—'}` : null}
              />
            </dl>
          )}
        </Section>

        <Section title={t('web.attribution')}>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Row label={t('web.source')} value={lead.utm_source} />
            <Row label={t('web.medium')} value={lead.utm_medium} />
            <Row label={t('web.campaign')} value={lead.utm_campaign} />
            <Row label={t('web.content')} value={lead.utm_content} />
          </dl>
        </Section>

        <Section title={t('web.followUp')}>
          <Field label={t('web.handledBy')}>
            <Input value={handledBy} onChange={(e) => setHandledBy(e.target.value)} placeholder={t('web.handledByPlaceholder')} />
          </Field>
          <Field label={t('web.notes')}>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('web.notesPlaceholder')} />
          </Field>
        </Section>
      </div>
    </Dialog>
  )
}
