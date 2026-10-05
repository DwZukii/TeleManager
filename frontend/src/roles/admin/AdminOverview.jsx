import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Card, CardHeader, PageHeader, Stat, StatGroup, cn, focusRing } from '../../ui'
import { useT } from '../../i18n/useT'

const SETS = ['Set A', 'Set B', 'Set C', 'External / Manual']

/**
 * AdminOverview — the admin's landing page. Built only from data the admin
 * screens already load, so it adds no queries.
 */
export default function AdminOverview({ unassignedCounts, activeLeads, newWebLeadCount, unreadFeedbackCount, agentsList, managersList, showWebLeads }) {
  const t = useT()
  const unassigned = SETS.reduce((sum, set) => sum + (unassignedCounts[set] || 0), 0)
  const agentsWithoutPhone = agentsList.filter((a) => !a.contact_number || !a.contact_number.trim()).length

  const attention = [
    activeLeads.length > 0 && { to: '/activity', text: t('overview.attention.review', { count: activeLeads.length }) },
    showWebLeads && newWebLeadCount > 0 && { to: '/web-leads', text: t('overview.attention.webLeads', { count: newWebLeadCount }) },
    unreadFeedbackCount > 0 && { to: '/feedback', text: t('overview.attention.feedback', { count: unreadFeedbackCount }) },
    agentsWithoutPhone > 0 && { to: '/team', text: t('overview.attention.noPhone', { count: agentsWithoutPhone }) },
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader title={t('overview.title')} description={t('overview.description')} />

      <StatGroup>
        <Stat label={t('overview.unassigned')} value={unassigned.toLocaleString()} />
        <Stat
          label={t('overview.awaitingReview')}
          value={activeLeads.length.toLocaleString()}
          tone={activeLeads.length > 0 ? 'warning' : 'default'}
        />
        {showWebLeads && <Stat label={t('overview.newWebLeads')} value={newWebLeadCount.toLocaleString()} />}
        <Stat label={t('overview.newFeedback')} value={unreadFeedbackCount.toLocaleString()} />
      </StatGroup>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title={t('overview.attention')} />
          {attention.length === 0 ? (
            <p className="px-4 py-6 text-sm text-fg-muted sm:px-5">{t('overview.attention.none')}</p>
          ) : (
            <ul>
              {attention.map((item) => (
                <li key={item.to} className="border-b border-line last:border-0">
                  <Link
                    to={item.to}
                    className={cn(
                      'flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-sunken sm:px-5',
                      focusRing
                    )}
                  >
                    <span>{item.text}</span>
                    <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t('overview.pools')} />
          <dl>
            {SETS.map((set) => (
              <div key={set} className="flex items-center justify-between border-b border-line px-4 py-3 text-sm last:border-0 sm:px-5">
                <dt className="text-fg-muted">{set === 'External / Manual' ? t('overview.externalSet') : set}</dt>
                <dd className="font-medium tabular-nums">{(unassignedCounts[set] || 0).toLocaleString()}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-line bg-sunken px-4 py-3 text-sm sm:px-5">
              <dt className="text-fg-muted">
                {t('overview.agents')} · {t('overview.managers')}
              </dt>
              <dd className="font-medium tabular-nums">
                {agentsList.length} · {managersList.length}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  )
}
