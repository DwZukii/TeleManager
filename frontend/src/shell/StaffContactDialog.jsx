import { Phone, Trash2 } from 'lucide-react'
import { Avatar, Badge, Button, Dialog } from '../ui'
import { useT } from '../i18n/useT'

/**
 * StaffContactDialog — how to reach someone on the team. Admins also get a
 * delete button (never for their own account).
 */
export default function StaffContactDialog({ person, onClose, canDelete = false, deleting = false, onDelete }) {
  const t = useT()
  const open = Boolean(person)
  const firstName = person ? (person.full_name ? person.full_name.split(' ')[0] : person.email.split('@')[0]) : ''

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={person?.full_name || person?.email || ''}
      size="sm"
    >
      {person && (
        <div className="space-y-4 pb-3">
          <div className="flex items-center gap-3">
            <Avatar name={person.full_name} email={person.email} size="lg" />
            <Badge>{t(`role.${person.role || 'agent'}`, null, person.role)}</Badge>
          </div>
          <dl className="divide-y divide-line rounded-control border border-line">
            <Row label={t('contact.email')}>
              <a href={`mailto:${person.email}`} className="break-all text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
                {person.email}
              </a>
            </Row>
            <Row label={t('contact.phone')}>
              {person.contact_number ? (
                <a href={`tel:${person.contact_number}`} className="tabular-nums text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
                  {person.contact_number}
                </a>
              ) : (
                <span className="text-warning">{t('contact.notSet')}</span>
              )}
            </Row>
            {person.role !== 'manager' && (
              <Row label={t('contact.manager')}>{person.manager_email || '—'}</Row>
            )}
          </dl>
          <div className="flex flex-col gap-2">
            {person.contact_number && (
              <Button as="a" href={`tel:${person.contact_number}`} icon={Phone} size="lg" fullWidth>
                {t('contact.call', { name: firstName })}
              </Button>
            )}
            {canDelete && (
              <Button variant="dangerOutline" icon={Trash2} loading={deleting} onClick={onDelete} fullWidth>
                {t('contact.delete')}
              </Button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3 py-2.5 text-sm">
      <dt className="shrink-0 text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-right text-fg">{children}</dd>
    </div>
  )
}
