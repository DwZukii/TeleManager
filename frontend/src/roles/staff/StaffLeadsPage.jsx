import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { Phone, PlayCircle, Search } from 'lucide-react'
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  FilterChips,
  Input,
  LEAD_STATUSES,
  PageHeader,
  Pagination,
  Stat,
  StatGroup,
  getStatusMeta,
} from '../../ui'
import { useLanguage, useT } from '../../i18n/useT'
import { formatWhen } from '../../i18n/format'
import { formatPhone } from '../../utils'
import { PHONE, useMediaQuery } from '../../hooks/useMediaQuery'
import { getCallUrl } from './links'
import LeadStatusSelect from './LeadStatusSelect'

const canonical = (status) => getStatusMeta('lead', status).canonical

// Tells the lead panel it was opened from here, so closing it can go Back.
const FROM_LIST = { fromList: true }

// The four counts agents watch through the day, shown above the filter.
const COUNTERS = ['Pending', 'Called', 'WhatsApp Sent', 'SMS Sent']

/**
 * StaffLeadsPage — the agent's numbers: four counters (pending, called,
 * WhatsApp, SMS), the status filter, then the list. Tapping Call marks the
 * lead "Called", as before.
 */
export default function StaffLeadsPage({
  leads,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  leadsPerPage,
  onStatusChange,
  canStartSession = false,
}) {
  const t = useT()
  const { lang } = useLanguage()
  const navigate = useNavigate()

  const counts = useMemo(() => {
    const c = {}
    for (const lead of leads) c[canonical(lead.status)] = (c[canonical(lead.status)] || 0) + 1
    return c
  }, [leads])

  const filtered = useMemo(
    () =>
      leads.filter((lead) => {
        if (!lead) return false
        const matchesStatus = statusFilter === 'All' || canonical(lead.status) === statusFilter
        const matchesSearch = !searchQuery || String(lead.phone_number ?? '').includes(searchQuery.replace(/\D/g, ''))
        return matchesStatus && matchesSearch
      }),
    [leads, statusFilter, searchQuery]
  )
  // Phones load more rows onto the same list; larger screens page through.
  // On phones currentPage counts the pages loaded so far.
  const isPhone = useMediaQuery(PHONE)
  const pageRows = isPhone
    ? filtered.slice(0, currentPage * leadsPerPage)
    : filtered.slice((currentPage - 1) * leadsPerPage, currentPage * leadsPerPage)
  const remaining = filtered.length - pageRows.length

  const total = leads.length
  const pending = counts.Pending || 0

  // Every status the agent actually has, in the usual order, plus any old ones.
  const chipStatuses = [...LEAD_STATUSES, ...Object.keys(counts).filter((s) => !LEAD_STATUSES.includes(s))]
  const chips = [
    { value: 'All', label: t('common.all'), count: total },
    ...chipStatuses
      .filter((s) => counts[s] || s === statusFilter || s === 'Pending')
      .map((s) => ({ value: s, label: t(`status.lead.${s}`, null, s), count: counts[s] || 0 })),
  ]

  function changeFilter(value) {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const columns = [
    {
      key: 'phone_number',
      header: t('leads.phone'),
      primary: true,
      render: (lead) => <span className="tabular-nums">{formatPhone(lead.phone_number)}</span>,
    },
    {
      key: 'status',
      header: t('leads.status'),
      wide: true,
      mobileLabel: false,
      className: 'w-56',
      render: (lead) => (
        <LeadStatusSelect
          value={lead.status}
          onChange={(status) => onStatusChange(lead.id, status, { undoable: true })}
          aria-label={t('leads.status')}
        />
      ),
    },
    {
      key: 'updated_at',
      header: t('leads.updated'),
      hideOnMobile: true,
      render: (lead) => <span className="text-fg-muted">{formatWhen(lead.updated_at || lead.created_at, t, lang)}</span>,
    },
  ]

  const filteredOut = total > 0

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('leads.title')}
        description={total === 1 ? t('leads.count.one') : t('leads.count', { count: total.toLocaleString() })}
        actions={
          canStartSession &&
          pending > 0 && (
            <Button as={Link} to="/leads/calling" icon={PlayCircle} variant="accent">
              {t('leads.startCalling')}
            </Button>
          )
        }
      />

      {total > 0 && (
        <StatGroup dense>
          {COUNTERS.map((status) => (
            <Stat dense key={status} label={t(`leads.counter.${status}`)} value={(counts[status] || 0).toLocaleString()} />
          ))}
        </StatGroup>
      )}

      <FilterChips label={t('leads.filter')} value={statusFilter} onChange={changeFilter} options={chips} />

      <Card>
        <div className="border-b border-line p-3 sm:p-4">
          <Input
            icon={Search}
            type="search"
            inputMode="numeric"
            aria-label={t('leads.search')}
            placeholder={t('leads.search')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="sm:max-w-xs"
          />
        </div>
        <DataTable
          label={t('leads.title')}
          rows={pageRows}
          columns={columns}
          onRowClick={(lead) => navigate(`/leads/${lead.id}`, { state: FROM_LIST })}
          actions={(lead) => (
            <>
              <Button
                as="a"
                href={getCallUrl(lead.phone_number)}
                onClick={() => onStatusChange(lead.id, 'Called')}
                icon={Phone}
                className="max-md:h-11 max-md:flex-1"
              >
                {t('leads.call')}
              </Button>
              <Button
                as={Link}
                to={`/leads/${lead.id}`}
                state={FROM_LIST}
                variant="secondary"
                className="max-md:h-11 max-md:flex-1"
              >
                {t('leads.details')}
              </Button>
            </>
          )}
          empty={
            <EmptyState
              title={t('leads.empty')}
              description={filteredOut ? t('leads.emptyFiltered') : t('leads.emptyNone')}
              action={
                filteredOut && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      changeFilter('All')
                      setSearchQuery('')
                    }}
                  >
                    {t('leads.clear')}
                  </Button>
                )
              }
            />
          }
        />
        {isPhone && remaining > 0 && (
          <div className="space-y-2 border-t border-line px-4 py-3 text-center">
            <Button variant="secondary" fullWidth size="lg" onClick={() => setCurrentPage(currentPage + 1)}>
              {t('leads.showMore', { count: Math.min(leadsPerPage, remaining) })}
            </Button>
            <p className="text-xs text-fg-subtle">
              {t('leads.showing', { shown: pageRows.length.toLocaleString(), total: filtered.length.toLocaleString() })}
            </p>
          </div>
        )}
        {!isPhone && filtered.length > leadsPerPage && (
          <div className="border-t border-line px-4 py-3 sm:px-5">
            <Pagination
              page={currentPage}
              pageSize={leadsPerPage}
              total={filtered.length}
              onPageChange={(page) => {
                setCurrentPage(page)
                window.scrollTo({ top: 0 })
              }}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
