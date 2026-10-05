import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, Paperclip, Phone, Trash2, Undo2 } from 'lucide-react'
import { supabase } from '../../supabase'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  FilterChips,
  Pagination,
  Stat,
  StatGroup,
  StatusBadge,
} from '../../ui'
import { useT } from '../../i18n/useT'
import { formatPhone } from '../../utils'

const PAGE_SIZE = 10
const SMS = "SMS'd" // filter value kept from the old screen: Thinking and SMS Sent together

/**
 * AgentProfilePage — one agent's numbers and results, for admins and managers.
 * Only the current page of numbers is fetched, filtered on the server.
 *
 *   refreshKey     the dashboard query to refresh after a change
 *   ownPool        true for managers ("return to your pool")
 *   onDeleteUser   given only when the viewer may delete the account
 */
export default function AgentProfilePage({ agent, confirm, onBack, refreshKey, ownPool = false, onDeleteUser, managerName }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState(false)
  const p = agent

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agentProfileLeads', p.email, page, filter],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE
      let query = supabase
        .from('leads')
        .select('id, phone_number, status, agent_notes, document_url', { count: 'exact' })
        .eq('assigned_to', p.email)
      if (filter === SMS) query = query.in('status', ['Thinking', 'SMS Sent'])
      else if (filter !== 'All') query = query.eq('status', filter)
      const { data: rows, count, error } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      return { rows: rows || [], total: count || 0 }
    },
    placeholderData: (prev) => prev,
  })
  const rows = data?.rows || []
  const total = data?.total || 0

  async function returnLead(lead) {
    if (!(await confirm(ownPool ? t('agentProfile.returnConfirmOwn') : t('agentProfile.returnConfirmAll')))) return
    if (lead.document_url) await supabase.storage.from('documents').remove([lead.document_url.split('/').pop()])
    const { error } = await supabase
      .from('leads')
      .update({ assigned_to: 'unassigned', status: 'Pending', agent_notes: '', document_url: null })
      .eq('id', lead.id)
    if (error) {
      toast.error(t('agentProfile.returnFailed', { error: error.message }))
      return
    }
    await refetch()
    queryClient.invalidateQueries({ queryKey: refreshKey })
  }

  async function deleteAccount() {
    setDeleting(true)
    await onDeleteUser(p.email)
    setDeleting(false)
  }

  const workable = p.total - (p.invalid || 0)
  const worked = p.total - p.pending - (p.invalid || 0)
  const percent = workable > 0 ? Math.round((worked / workable) * 100) : 0

  const chips = [
    { value: 'All', label: t('common.all'), count: p.total },
    { value: 'Pending', label: t('status.lead.Pending'), count: p.pending },
    { value: 'Called', label: t('status.lead.Called'), count: p.called },
    { value: 'WhatsApp Sent', label: t('status.lead.WhatsApp Sent'), count: p.whatsapp },
    { value: SMS, label: t('status.lead.SMS Sent'), count: p.thinking },
    { value: 'Accepted', label: t('status.lead.Accepted'), count: p.accepted },
    { value: 'Rejected', label: t('status.lead.Rejected'), count: p.rejected },
    { value: 'Invalid Number', label: t('status.lead.Invalid Number'), count: p.invalid },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={onBack} className="-ml-2">
          {t('agentProfile.back')}
        </Button>
        {onDeleteUser && (
          <Button variant="dangerOutline" size="sm" icon={Trash2} loading={deleting} onClick={deleteAccount}>
            {t('agentProfile.deleteAccount')}
          </Button>
        )}
      </div>

      <header className="flex items-start gap-4">
        <Avatar name={p.full_name} email={p.email} size="lg" />
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-xl font-semibold">{p.full_name || p.email}</h1>
          {p.full_name && <p className="truncate text-sm text-fg-muted">{p.email}</p>}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {p.contact_number ? (
              <a href={`tel:${p.contact_number}`} className="inline-flex items-center gap-1.5 tabular-nums text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
                <Phone className="size-4" aria-hidden="true" />
                {p.contact_number}
              </a>
            ) : (
              <Badge tone="warning">{t('agentProfile.noPhone')}</Badge>
            )}
            {p.manager_email && managerName !== false && (
              <Badge>{t('agentProfile.managerIs', { manager: managerName || p.manager_email })}</Badge>
            )}
          </div>
        </div>
      </header>

      <StatGroup>
        <Stat label={t('agentProfile.assigned')} value={p.total.toLocaleString()} />
        <Stat label={t('agentProfile.worked')} value={`${percent}%`} hint={`${worked.toLocaleString()} / ${workable.toLocaleString()}`} />
        <Stat label={t('agentProfile.accepted')} value={p.accepted.toLocaleString()} />
        <Stat label={t('agentProfile.rejected')} value={p.rejected.toLocaleString()} />
      </StatGroup>

      <Card>
        <CardHeader title={t('agentProfile.numbers')} />
        <div className="border-b border-line px-3 py-2 sm:px-4">
          <FilterChips
            label={t('agentProfile.filter')}
            value={filter}
            onChange={(v) => {
              setFilter(v)
              setPage(1)
            }}
            options={chips}
          />
        </div>
        <DataTable
          label={t('agentProfile.numbers')}
          rows={rows}
          loading={isLoading}
          columns={[
            {
              key: 'phone_number',
              header: t('agentProfile.phone'),
              primary: true,
              render: (l) => <span className="tabular-nums">{formatPhone(l.phone_number)}</span>,
            },
            { key: 'status', header: t('agentProfile.status'), render: (l) => <StatusBadge kind="lead" status={l.status} /> },
            {
              key: 'agent_notes',
              header: t('agentProfile.notes'),
              wide: true,
              className: 'max-w-80',
              render: (l) =>
                l.agent_notes ? <span className="line-clamp-2 text-fg-muted">{l.agent_notes}</span> : <span className="text-fg-subtle">—</span>,
            },
            {
              key: 'document_url',
              header: t('agentProfile.document'),
              render: (l) =>
                l.document_url ? (
                  <a href={l.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
                    <Paperclip className="size-3.5" aria-hidden="true" />
                    {t('agentProfile.view')}
                  </a>
                ) : (
                  <span className="text-fg-subtle">—</span>
                ),
            },
          ]}
          actions={(l) => (
            <Button variant="secondary" size="sm" icon={Undo2} onClick={() => returnLead(l)}>
              {t('agentProfile.return')}
            </Button>
          )}
          empty={<EmptyState title={t('agentProfile.none')} />}
        />
        {total > PAGE_SIZE && (
          <div className="border-t border-line px-4 py-3 sm:px-5">
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  )
}
