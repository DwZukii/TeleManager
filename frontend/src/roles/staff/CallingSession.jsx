import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, Phone, X } from 'lucide-react'
import { Button, Card, CardBody, EmptyState, StatusBadge, getStatusMeta } from '../../ui'
import { useT } from '../../i18n/useT'
import { formatPhone } from '../../utils'
import { getCallUrl } from './links'
import MessagePanel from './MessagePanel'

// Outcomes offered as one-tap buttons after a call. Same stored values as the
// status picker; nothing new is written.
const OUTCOMES = ['Accepted', 'Rejected', 'Invalid Number', 'SMS Sent', 'WhatsApp Sent']

/**
 * CallingSession — works through pending numbers one at a time (pilot).
 * The queue is fixed when the session starts, so changing a status does not
 * shuffle the numbers still to come.
 */
export default function CallingSession({ leads, userEmail, onStatusChange }) {
  const t = useT()
  const [queue] = useState(() => leads.filter((l) => l.status === 'Pending').map((l) => l.id))
  const [index, setIndex] = useState(0)

  const lead = leads.find((l) => l.id === queue[index])
  const done = index >= queue.length

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t('session.title')}</h1>
          {!done && (
            <p className="text-sm tabular-nums text-fg-muted">
              {t('session.position', { index: index + 1, total: queue.length })}
            </p>
          )}
        </div>
        <Button as={Link} to="/leads" variant="secondary" icon={X}>
          {t('session.exit')}
        </Button>
      </div>

      {done || !lead ? (
        <Card>
          <EmptyState
            title={t('session.done')}
            action={
              <Button as={Link} to="/leads">
                {t('lead.back')}
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardBody className="space-y-4 text-center">
              <p className="text-3xl font-semibold tabular-nums">{formatPhone(lead.phone_number)}</p>
              <StatusBadge kind="lead" status={lead.status} />
              <Button
                as="a"
                href={getCallUrl(lead.phone_number)}
                onClick={() => onStatusChange(lead.id, 'Called')}
                icon={Phone}
                size="lg"
                fullWidth
              >
                {t('leads.call')}
              </Button>
              <div className="space-y-2 text-left">
                <p className="text-sm font-medium">{t('session.outcome')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {OUTCOMES.map((status) => {
                    const selected = getStatusMeta('lead', lead.status).canonical === status
                    return (
                      <Button
                        key={status}
                        variant={selected ? 'primary' : 'secondary'}
                        aria-pressed={selected}
                        onClick={() => onStatusChange(lead.id, status)}
                        className="h-11"
                      >
                        {t(`status.lead.${status}`)}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <MessagePanel lead={lead} userEmail={userEmail} onStatusChange={onStatusChange} />
            </CardBody>
          </Card>
        </>
      )}

      {!done && (
        <div className="sticky bottom-16 -mx-4 grid grid-cols-2 gap-2 border-t border-line bg-canvas px-4 py-3 sm:-mx-6 sm:px-6 lg:bottom-0">
          <Button variant="secondary" size="lg" icon={ChevronLeft} disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            {t('session.previous')}
          </Button>
          <Button size="lg" onClick={() => setIndex((i) => i + 1)}>
            {t('session.next')}
            <ChevronRight className="size-5" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  )
}
