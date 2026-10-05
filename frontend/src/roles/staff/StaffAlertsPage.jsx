import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, Cake, Inbox, MessageCircle, X } from 'lucide-react'
import { supabase } from '../../supabase'
import { Button, Card, EmptyState, IconButton, PageHeader } from '../../ui'
import { useLanguage, useT } from '../../i18n/useT'
import { formatDate } from '../../i18n/format'
import { useWaBusiness } from '../../hooks/useWaBusiness'
import { useUndoToast } from '../../hooks/useUndoToast'
import { getWhatsAppUrl } from './links'

const LOCALES = { en: 'en-MY', ms: 'ms-MY' }

/** Local calendar day as YYYY-MM-DD, for grouping. */
function dayOf(value) {
  const d = String(value).length === 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(d.getTime())) return dayOf(new Date().toISOString())
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function timeOf(value, lang) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString(LOCALES[lang] ?? LOCALES.en, { hour: '2-digit', minute: '2-digit' })
}

/**
 * StaffAlertsPage — new leads, customer birthdays and due reminders, grouped
 * by day, newest first. Birthdays can be answered with a WhatsApp greeting.
 */
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
  const business = useWaBusiness(userEmail)
  const showUndo = useUndoToast()
  const key = ['staffData', userEmail]
  const offerUndo = (undo) => showUndo(t('undo.alertDismissed'), undo, { id: 'alert-dismissed' })

  // Each dismissal can be undone: the alert comes back and the flag is reset.
  const dismissLeadNotif = async (notif) => {
    queryClient.setQueryData(key, (old) =>
      old ? { ...old, staffNotifications: old.staffNotifications.filter((n) => n.id !== notif.id) } : old
    )
    await supabase.from('leads').update({ staff_reviewed: true }).in('id', notif.ids)
    offerUndo(async () => {
      queryClient.setQueryData(key, (old) => (old ? { ...old, staffNotifications: [...old.staffNotifications, notif] } : old))
      return supabase.from('leads').update({ staff_reviewed: false }).in('id', notif.ids)
    })
  }

  const dismissBirthday = (customerId) => {
    setDismissedBirthdays((prev) => new Set([...prev, customerId]))
    offerUndo(() =>
      setDismissedBirthdays((prev) => {
        const next = new Set(prev)
        next.delete(customerId)
        return next
      })
    )
  }

  const dismissReminder = async (reminder) => {
    queryClient.setQueryData(key, (old) =>
      old ? { ...old, reminderNotifications: (old.reminderNotifications ?? []).filter((r) => r.id !== reminder.id) } : old
    )
    await supabase.from('customer_reminders').update({ dismissed: true }).eq('id', reminder.id)
    queryClient.invalidateQueries({ queryKey: ['pipelineData'] })
    offerUndo(async () => {
      queryClient.setQueryData(key, (old) =>
        old ? { ...old, reminderNotifications: [...(old.reminderNotifications ?? []), reminder] } : old
      )
      const result = await supabase.from('customer_reminders').update({ dismissed: false }).eq('id', reminder.id)
      queryClient.invalidateQueries({ queryKey: ['pipelineData'] })
      return result
    })
  }

  const today = dayOf(new Date().toISOString())
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = dayOf(yesterdayDate.toISOString())

  // One flat list with a day and a sort time for each alert, then grouped.
  const alerts = [
    ...staffNotifications.map((n) => ({
      key: `lead-${n.id}`,
      day: dayOf(n.createdAt),
      sort: new Date(n.createdAt).getTime() || 0,
      icon: Inbox,
      title: t('alerts.newLeads'),
      meta: timeOf(n.createdAt, lang),
      body: t('alerts.newLeadsBody', { count: n.ids.length, set: n.leadSet }),
      actions: [{ to: '/leads', label: t('alerts.viewLeads') }],
      onDismiss: () => dismissLeadNotif(n),
    })),
    ...visibleBirthdays.map((c) => ({
      key: `birthday-${c.id}`,
      day: today,
      sort: Number.MAX_SAFE_INTEGER,
      icon: Cake,
      title: t('alerts.birthday'),
      body: t('alerts.birthdayBody', { name: c.fullName }),
      actions: [
        ...(c.phoneNumber
          ? [
              {
                href: getWhatsAppUrl(c.phoneNumber, t('alerts.wishesText', { name: c.fullName }), business),
                label: t('alerts.sendWishes'),
                icon: MessageCircle,
              },
            ]
          : []),
        { to: `/customers/${c.id}`, label: t('alerts.viewCustomer') },
      ],
      onDismiss: () => dismissBirthday(c.id),
    })),
    ...reminderNotifications.map((r) => ({
      key: `reminder-${r.id}`,
      day: dayOf(r.date || r.createdAt),
      sort: 0,
      icon: Bell,
      title: t('alerts.reminder'),
      meta: dayOf(r.date || r.createdAt) < today ? t('customer.overdue') : t('customer.due'),
      metaTone: dayOf(r.date || r.createdAt) < today ? 'text-danger' : 'text-fg-subtle',
      body: (
        <>
          <span className="font-medium text-fg">{r.customerName}</span>
          {r.note ? ` · ${r.note}` : ''}
        </>
      ),
      actions: [{ to: r.customerId ? `/customers/${r.customerId}` : '/customers', label: t('alerts.viewCustomer') }],
      onDismiss: () => dismissReminder(r),
    })),
  ]

  const groups = []
  for (const alert of [...alerts].sort((a, b) => (a.day === b.day ? b.sort - a.sort : a.day < b.day ? 1 : -1))) {
    const last = groups[groups.length - 1]
    if (last?.day === alert.day) last.items.push(alert)
    else groups.push({ day: alert.day, items: [alert] })
  }
  const dayLabel = (day) => (day === today ? t('alerts.dayToday') : day === yesterday ? t('alerts.dayYesterday') : formatDate(day, lang))

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
        groups.map((group) => (
          <section key={group.day} aria-labelledby={`alerts-${group.day}`} className="space-y-2">
            <h2 id={`alerts-${group.day}`} className="px-1 text-sm font-medium text-fg-muted">
              {dayLabel(group.day)}
            </h2>
            <Card as="ul">
              {group.items.map(({ key, ...alert }) => (
                <Alert key={key} {...alert} />
              ))}
            </Card>
          </section>
        ))
      )}
    </div>
  )
}

function Alert({ icon: Icon, title, meta, metaTone = 'text-fg-subtle', body, actions, onDismiss }) {
  const t = useT()
  return (
    <li className="flex gap-3 border-b border-line px-4 py-4 last:border-0 sm:px-5">
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-fg-muted">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm font-medium">{title}</p>
          {meta && <p className={`text-xs ${metaTone}`}>{meta}</p>}
        </div>
        <p className="mt-0.5 text-sm text-fg-muted">{body}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action) =>
            action.href ? (
              <Button key={action.label} as="a" href={action.href} target="_blank" rel="noreferrer" size="sm" icon={action.icon}>
                {action.label}
              </Button>
            ) : (
              <Button key={action.label} as={Link} to={action.to} variant="secondary" size="sm">
                {action.label}
              </Button>
            )
          )}
        </div>
      </div>
      <IconButton label={t('alerts.dismiss')} icon={X} size="sm" onClick={onDismiss} className="-mr-1 -mt-1" />
    </li>
  )
}
