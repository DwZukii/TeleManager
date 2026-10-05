import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, Cake, Inbox, X } from 'lucide-react'
import { supabase } from '../../supabase'
import { Button, Card, EmptyState, IconButton, PageHeader } from '../../ui'
import { useLanguage, useT } from '../../i18n/useT'
import { formatWhen } from '../../i18n/format'

/** StaffAlertsPage — new leads, customer birthdays and due reminders. */
export default function StaffAlertsPage({
  staffNotifications,
  visibleBirthdays,
  reminderNotifications,
  totalNotifCount,
  userEmail,
  setDismissedBirthdays,
}) {
  const t = useT()
  const { lang } = useLanguage()
  const queryClient = useQueryClient()

  const dismissLeadNotif = async (notifId, ids) => {
    queryClient.setQueryData(['staffData', userEmail], (old) =>
      old ? { ...old, staffNotifications: old.staffNotifications.filter((n) => n.id !== notifId) } : old
    )
    await supabase.from('leads').update({ staff_reviewed: true }).in('id', ids)
  }

  const dismissBirthday = (customerId) => setDismissedBirthdays((prev) => new Set([...prev, customerId]))

  const dismissReminder = async (reminderId) => {
    queryClient.setQueryData(['staffData', userEmail], (old) =>
      old ? { ...old, reminderNotifications: (old.reminderNotifications ?? []).filter((r) => r.id !== reminderId) } : old
    )
    await supabase.from('customer_reminders').update({ dismissed: true }).eq('id', reminderId)
    queryClient.invalidateQueries({ queryKey: ['pipelineData'] })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title={t('alerts.title')}
        description={totalNotifCount > 0 ? t('alerts.unread', { count: totalNotifCount }) : t('alerts.clear')}
      />

      {totalNotifCount === 0 ? (
        <Card>
          <EmptyState title={t('alerts.emptyTitle')} description={t('alerts.emptyBody')} />
        </Card>
      ) : (
        <Card as="ul">
          {staffNotifications.map((n) => (
            <Alert
              key={n.id}
              icon={Inbox}
              title={t('alerts.newLeads')}
              when={formatWhen(n.createdAt, t, lang)}
              body={t('alerts.newLeadsBody', { count: n.ids.length, set: n.leadSet })}
              action={{ to: '/leads', label: t('alerts.viewLeads') }}
              onDismiss={() => dismissLeadNotif(n.id, n.ids)}
            />
          ))}
          {visibleBirthdays.map((c) => (
            <Alert
              key={c.id}
              icon={Cake}
              title={t('alerts.birthday')}
              when={t('alerts.today')}
              body={t('alerts.birthdayBody', { name: c.fullName })}
              action={{ to: '/customers', label: t('alerts.viewCustomers') }}
              onDismiss={() => dismissBirthday(c.id)}
            />
          ))}
          {reminderNotifications.map((r) => (
            <Alert
              key={r.id}
              icon={Bell}
              title={t('alerts.reminder')}
              when={formatWhen(r.createdAt, t, lang)}
              body={
                <>
                  <span className="font-medium text-fg">{r.customerName}</span>
                  {r.note ? ` · ${r.note}` : ''}
                </>
              }
              action={{ to: '/customers', label: t('alerts.viewCustomers') }}
              onDismiss={() => dismissReminder(r.id)}
            />
          ))}
        </Card>
      )}
    </div>
  )
}

function Alert({ icon: Icon, title, when, body, action, onDismiss }) {
  const t = useT()
  return (
    <li className="flex gap-3 border-b border-line px-4 py-4 last:border-0 sm:px-5">
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-fg-muted">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm font-medium">{title}</p>
          {when && <p className="text-xs text-fg-subtle">{when}</p>}
        </div>
        <p className="mt-0.5 text-sm text-fg-muted">{body}</p>
        <Button as={Link} to={action.to} variant="secondary" size="sm" className="mt-3">
          {action.label}
        </Button>
      </div>
      <IconButton label={t('alerts.dismiss')} icon={X} size="sm" onClick={onDismiss} className="-mr-1 -mt-1" />
    </li>
  )
}
