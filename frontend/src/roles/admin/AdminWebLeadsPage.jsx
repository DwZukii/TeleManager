import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, MessageCircle, Search, Trash2 } from 'lucide-react'
import { supabase } from '../../supabase'
import {
  Badge,
  Banner,
  Button,
  Card,
  DataTable,
  EmptyState,
  FilterChips,
  IconButton,
  Input,
  PageHeader,
  Select,
  Stat,
  StatGroup,
  WEB_LEAD_STATUSES,
} from '../../ui'
import { useT } from '../../i18n/useT'
import { formatPhone } from '../../utils'
import { useWebLeadsData } from '../../hooks/useWebLeadsData'
import WebLeadDialog from './WebLeadDialog'
import { useRelativeTime } from './useRelativeTime'

/** WebLeadStatusSelect — the four statuses offered, plus an older value if a row still holds one. */
function WebLeadStatusSelect({ value, onChange, ...rest }) {
  const t = useT()
  const options = WEB_LEAD_STATUSES.includes(value) ? WEB_LEAD_STATUSES : [value, ...WEB_LEAD_STATUSES]
  return (
    <Select size="sm" value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {options.map((s) => (
        <option key={s} value={s}>
          {t(`status.webLead.${s}`, null, s)}
        </option>
      ))}
    </Select>
  )
}

/**
 * AdminWebLeadsPage — inbound enquiries from the landing page form. They live
 * in `web_leads`, are never assigned to agents and never enter `leads`. RLS
 * limits the table to super admins; hiding the nav item is only for tidiness.
 */
export default function AdminWebLeadsPage({ confirm }) {
  const t = useT()
  const relative = useRelativeTime()
  const queryClient = useQueryClient()
  const { data: leads = [], isLoading, isError } = useWebLeadsData('super_admin')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [openId, setOpenId] = useState(null)

  const counts = useMemo(() => {
    const c = {}
    for (const l of leads) c[l.status] = (c[l.status] || 0) + 1
    return c
  }, [leads])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter((l) => {
      const matchStatus = status === 'All' || l.status === status
      const matchSearch =
        !q ||
        [l.full_name, l.phone_number, l.email, l.employer_name, l.utm_campaign].some((v) => (v || '').toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [leads, search, status])

  const patchLead = async (id, patch) => {
    queryClient.setQueryData(['webLeads'], (old) => (old || []).map((l) => (l.id === id ? { ...l, ...patch } : l)))
    const { error } = await supabase.from('web_leads').update(patch).eq('id', id)
    if (error) {
      toast.error(t('web.updateFailed', { error: error.message }))
      queryClient.invalidateQueries({ queryKey: ['webLeads'] })
      return false
    }
    return true
  }

  const deleteLead = async (lead) => {
    if (!(await confirm(t('web.deleteConfirm', { name: lead.full_name })))) return
    queryClient.setQueryData(['webLeads'], (old) => (old || []).filter((l) => l.id !== lead.id))
    const { error } = await supabase.from('web_leads').delete().eq('id', lead.id)
    if (error) {
      toast.error(t('web.deleteFailed', { error: error.message }))
      queryClient.invalidateQueries({ queryKey: ['webLeads'] })
    } else {
      toast.success(t('web.deleted'))
      setOpenId(null)
    }
  }

  const chipStatuses = [...WEB_LEAD_STATUSES, ...Object.keys(counts).filter((s) => !WEB_LEAD_STATUSES.includes(s))]
  const openLead = leads.find((l) => l.id === openId)

  return (
    <div className="space-y-5">
      <PageHeader title={t('web.title')} description={t('web.description')} />

      <StatGroup>
        <Stat label={t('web.total')} value={leads.length.toLocaleString()} />
        <Stat label={t('status.webLead.New')} value={(counts.New || 0).toLocaleString()} />
        <Stat label={t('status.webLead.Contacted')} value={(counts.Contacted || 0).toLocaleString()} />
      </StatGroup>

      {isError && <Banner tone="danger">{t('web.loadFailed')}</Banner>}

      <FilterChips
        label={t('web.filter')}
        value={status}
        onChange={setStatus}
        options={[
          { value: 'All', label: t('common.all'), count: leads.length },
          ...chipStatuses.map((s) => ({ value: s, label: t(`status.webLead.${s}`, null, s), count: counts[s] || 0 })),
        ]}
      />

      <Card>
        <div className="border-b border-line p-3 sm:p-4">
          <Input
            icon={Search}
            type="search"
            aria-label={t('web.search')}
            placeholder={t('web.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-md"
          />
        </div>
        <DataTable
          label={t('web.title')}
          rows={filtered}
          loading={isLoading}
          onRowClick={(l) => setOpenId(l.id)}
          columns={[
            {
              key: 'full_name',
              header: t('web.enquirer'),
              primary: true,
              render: (l) => (
                <span className="block min-w-0">
                  <span className="block truncate">{l.full_name}</span>
                  <span className="block truncate text-xs font-normal tabular-nums text-fg-subtle">{formatPhone(l.phone_number)}</span>
                  {l.already_in_pool && (
                    <Badge tone="warning" icon={AlertTriangle} className="mt-1">
                      {t('web.inPool')}
                    </Badge>
                  )}
                </span>
              ),
            },
            { key: 'employer_name', header: t('web.employer'), className: 'max-w-48 truncate' },
            {
              key: 'created_at',
              header: t('web.received'),
              sortable: true,
              render: (l) => <span className="whitespace-nowrap text-fg-muted">{relative(l.created_at)}</span>,
            },
            {
              key: 'status',
              header: t('web.status'),
              wide: true,
              mobileLabel: false,
              className: 'w-44',
              render: (l) => (
                <WebLeadStatusSelect value={l.status} onChange={(next) => patchLead(l.id, { status: next })} aria-label={t('web.status')} />
              ),
            },
          ]}
          actions={(l) => (
            <>
              <Button as="a" href={`https://wa.me/${l.phone_number}`} target="_blank" rel="noreferrer" variant="secondary" size="sm" icon={MessageCircle}>
                {t('web.whatsapp')}
              </Button>
              <IconButton label={t('web.delete')} icon={Trash2} size="sm" onClick={() => deleteLead(l)} />
            </>
          )}
          empty={
            leads.length === 0 ? (
              <EmptyState title={t('web.emptyTitle')} description={t('web.emptyBody')} />
            ) : (
              <EmptyState title={t('web.noMatch')} />
            )
          }
        />
      </Card>

      <WebLeadDialog
        key={openId}
        lead={openLead}
        onClose={() => setOpenId(null)}
        onSave={patchLead}
        onDelete={deleteLead}
        relative={relative}
      />
    </div>
  )
}
