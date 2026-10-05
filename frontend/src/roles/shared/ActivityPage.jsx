import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bell, Check, ChevronRight, Paperclip } from 'lucide-react'
import { supabase } from '../../supabase'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, IconButton, PageHeader, StatusBadge, cn, focusRing } from '../../ui'
import { useLanguage, useT } from '../../i18n/useT'
import { formatWhen } from '../../i18n/format'
import { formatPhone } from '../../utils'
import { useUndoToast } from '../../hooks/useUndoToast'

// Admin and manager each review separately. A lead's document file is only
// deleted once both have reviewed it.
const FIELDS = {
  admin: { mine: 'admin_reviewed', theirs: 'manager_reviewed', query: 'adminData' },
  manager: { mine: 'manager_reviewed', theirs: 'admin_reviewed', query: 'managerData' },
}

/**
 * ActivityPage — notes, documents and accepted leads waiting for review,
 * grouped by agent. Used by admins (`reviewer="admin"`) and managers.
 */
export default function ActivityPage({ reviewer, activeLeads, people = [], userEmail, confirm }) {
  const t = useT()
  const { lang } = useLanguage()
  const queryClient = useQueryClient()
  const field = FIELDS[reviewer]
  const queryKey = [field.query, userEmail]
  const [open, setOpen] = useState(null)

  const names = useMemo(() => new Map(people.map((p) => [p.email, p.full_name])), [people])
  const systemAlerts = activeLeads.filter((l) => l.type === 'admin_drop')
  const groups = useMemo(() => {
    const byAgent = {}
    for (const lead of activeLeads) {
      if (lead.type === 'admin_drop') continue
      ;(byAgent[lead.assigned_to] ??= []).push(lead)
    }
    // Agents with a document to look at come first.
    return Object.entries(byAgent).sort(([, a], [, b]) => Number(b.some((l) => l.document_url)) - Number(a.some((l) => l.document_url)))
  }, [activeLeads])
  const itemCount = activeLeads.length - systemAlerts.length

  const showUndo = useUndoToast()
  const offerUndo = (undo) => showUndo(t('undo.reviewed'), undo, { id: 'activity-reviewed' })

  async function review(id) {
    const lead = activeLeads.find((l) => l.id === id)
    queryClient.setQueryData(queryKey, (old) => (old ? { ...old, activeLeads: old.activeLeads.filter((l) => l.id !== id) } : null))
    if (lead?.[field.theirs] === true && lead?.document_url) {
      // Both sides have now reviewed it, so the file is deleted. That cannot
      // be undone, so no Undo here.
      await supabase.storage.from('documents').remove([lead.document_url.split('/').pop()])
      await supabase.from('leads').update({ [field.mine]: true, document_url: null }).eq('id', id)
    } else {
      await supabase.from('leads').update({ [field.mine]: true }).eq('id', id)
      if (lead)
        offerUndo(async () => {
          queryClient.setQueryData(queryKey, (old) => (old ? { ...old, activeLeads: [...old.activeLeads, lead] } : null))
          return supabase.from('leads').update({ [field.mine]: false }).eq('id', id)
        })
    }
  }

  async function reviewDrop(notif) {
    queryClient.setQueryData(queryKey, (old) =>
      old ? { ...old, managerNotifications: old.managerNotifications.filter((n) => n.id !== notif.id) } : null
    )
    await supabase.from('leads').update({ manager_reviewed: true }).in('id', notif.ids)
    offerUndo(async () => {
      queryClient.setQueryData(queryKey, (old) => (old ? { ...old, managerNotifications: [...old.managerNotifications, notif] } : null))
      return supabase.from('leads').update({ manager_reviewed: false }).in('id', notif.ids)
    })
  }

  async function reviewAll() {
    if (activeLeads.length === 0) return
    if (!(await confirm(t('activity.reviewAllConfirm', { count: activeLeads.length })))) return
    try {
      const real = activeLeads.filter((l) => l.id && typeof l.id === 'number')
      const withFile = real.filter((l) => l.document_url && l[field.theirs])
      const files = withFile.map((l) => l.document_url.split('/').pop())
      if (files.length > 0) await supabase.storage.from('documents').remove(files)

      const fileIds = withFile.map((l) => l.id)
      const otherIds = real.filter((l) => !l[field.theirs] || !l.document_url).map((l) => l.id)
      for (let i = 0; i < fileIds.length; i += 500) {
        await supabase.from('leads').update({ [field.mine]: true, document_url: null }).in('id', fileIds.slice(i, i + 500))
      }
      for (let i = 0; i < otherIds.length; i += 500) {
        await supabase.from('leads').update({ [field.mine]: true }).in('id', otherIds.slice(i, i + 500))
      }
      queryClient.invalidateQueries({ queryKey })
    } catch (err) {
      toast.error(t('activity.reviewAllFailed', { error: err.message }))
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('activity.title')}
        description={
          itemCount === 0
            ? t('activity.clear')
            : itemCount === 1
              ? t('activity.summary.one')
              : t('activity.summary', { count: itemCount, agents: groups.length })
        }
        actions={
          activeLeads.length > 0 && (
            <Button variant="secondary" icon={Check} onClick={reviewAll}>
              {t('activity.reviewAll')}
            </Button>
          )
        }
      />

      {activeLeads.length === 0 && (
        <Card>
          <EmptyState title={t('activity.emptyTitle')} description={t('activity.emptyBody')} />
        </Card>
      )}

      {systemAlerts.length > 0 && (
        <Card>
          <CardHeader title={t('activity.systemTitle')} />
          <ul>
            {systemAlerts.map((n) => (
              <li key={n.id} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-0 sm:px-5">
                <Bell className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {t('activity.drop', { count: n.ids.length, set: String(n.id).replace(/^admin-/, '') })}
                  </p>
                  {n.createdAt && <p className="mt-0.5 text-xs text-fg-subtle">{formatWhen(n.createdAt, t, lang)}</p>}
                </div>
                <IconButton label={t('activity.review')} icon={Check} size="sm" onClick={() => reviewDrop(n)} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {groups.length > 0 && (
        <Card as="ul">
          {groups.map(([email, leads]) => {
            const isOpen = open === email
            const files = leads.filter((l) => l.document_url).length
            const notes = leads.filter((l) => l.agent_notes && l.agent_notes.trim() !== '').length
            const accepted = leads.filter((l) => l.status === 'Accepted').length
            const meta = [
              t('activity.items', { count: leads.length }),
              files && t('activity.files', { count: files }),
              notes && t('activity.notes', { count: notes }),
              accepted && t('activity.accepted', { count: accepted }),
            ].filter(Boolean)
            const panelId = `activity-${email}`
            return (
              <li key={email} className="border-b border-line last:border-0">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : email)}
                  className={cn('flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken sm:px-5', focusRing)}
                >
                  <Avatar name={names.get(email)} email={email} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{names.get(email) || email}</span>
                    <span className="block truncate text-xs text-fg-subtle">{meta.join(' · ')}</span>
                  </span>
                  {files > 0 && <Paperclip className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />}
                  <ChevronRight
                    className={cn('size-4 shrink-0 text-fg-subtle transition-transform', isOpen && 'rotate-90')}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <ul id={panelId} className="border-t border-line bg-sunken/50">
                    {leads.map((lead) => (
                      <li key={lead.id} className="flex gap-3 border-b border-line px-4 py-3 last:border-0 sm:pl-16 sm:pr-5">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium tabular-nums">{formatPhone(lead.phone_number)}</span>
                            <Badge>{lead.lead_set || 'Set A'}</Badge>
                            <StatusBadge kind="lead" status={lead.status} />
                            {lead.updated_at && (
                              <span className="text-xs text-fg-subtle">{formatWhen(lead.updated_at, t, lang)}</span>
                            )}
                          </div>
                          {lead.agent_notes && (
                            <p className="whitespace-pre-wrap border-l-2 border-line-strong pl-3 text-sm text-fg-muted">
                              {lead.agent_notes}
                            </p>
                          )}
                          {lead.document_url && (
                            <a
                              href={lead.document_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
                            >
                              <Paperclip className="size-4" aria-hidden="true" />
                              {t('activity.viewDoc')}
                            </a>
                          )}
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => review(lead.id)} className="self-start">
                          {t('activity.review')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </Card>
      )}
    </div>
  )
}
