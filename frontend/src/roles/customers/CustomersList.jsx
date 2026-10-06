import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search } from 'lucide-react'
import {
  Banner,
  Button,
  CUSTOMER_STATUSES,
  Card,
  Combobox,
  DataTable,
  EmptyState,
  FilterChips,
  Input,
  PageHeader,
  Pagination,
  Stat,
  StatGroup,
} from '../../ui'
import { useLanguage, useT } from '../../i18n/useT'
import { formatPhone } from '../../utils'
import { getBirthdayInfo, isActiveCase, isDoneCase } from './customerUtils'
import CustomerStatusSelect from './CustomerStatusSelect'
import AddCustomerDialog from './AddCustomerDialog'
import BirthdaysCard from './BirthdaysCard'

const PAGE_SIZE = 10
const BIRTHDAYS = 'birthdays'
const TABLE_ID = 'customers-table'
const isUnassigned = (c) => !c.agentEmail || c.agentEmail === 'UNASSIGNED'

/** CustomersList — stats, filters and the table of customers for one scope. */
export default function CustomersList({
  scope,
  customers,
  isLoading,
  isError,
  userEmail,
  agentsList,
  filters,
  setFilters,
  onStatusChange,
  refresh,
}) {
  const t = useT()
  const { lang } = useLanguage()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const showAgent = scope !== 'own'
  const { search, status, agent, page } = filters
  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }))

  const birthdays = useMemo(() => {
    const map = new Map()
    for (const c of customers) {
      const info = getBirthdayInfo(c.dateOfBirth, c.icNumber)
      if (info) map.set(c.id, info)
    }
    return map
  }, [customers])

  const statusCounts = useMemo(() => {
    const counts = {}
    for (const c of customers) counts[c.status || 'New'] = (counts[c.status || 'New'] || 0) + 1
    return counts
  }, [customers])

  const agentName = useMemo(() => {
    const names = new Map(agentsList.map((a) => [a.email, a.full_name]))
    return (email) => names.get(email) || email
  }, [agentsList])

  const agentOptions = useMemo(() => {
    const emails = [...new Set(customers.map((c) => c.agentEmail).filter((e) => e && e !== 'UNASSIGNED'))].sort()
    return [
      { value: 'All', label: `${t('customers.allAgents')} (${emails.length})` },
      { value: 'UNASSIGNED', label: t('customers.unassigned') },
      ...emails.map((email) => ({ value: email, label: agentName(email), description: agentName(email) !== email ? email : undefined })),
    ]
  }, [customers, agentName, t])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const qDigits = q.replace(/[-\s]/g, '')
    let rows = customers.filter((c) => {
      const matchesSearch =
        !q ||
        (c.fullName || '').toLowerCase().includes(q) ||
        (qDigits && (c.icNumber || '').replace(/-/g, '').includes(qDigits)) ||
        (qDigits && (c.phoneNumber || '').includes(qDigits)) ||
        (showAgent && (c.agentEmail || '').toLowerCase().includes(q)) ||
        (showAgent && q === 'unassigned' && isUnassigned(c))
      const matchesAgent = agent === 'All' || (agent === 'UNASSIGNED' ? isUnassigned(c) : c.agentEmail === agent)
      const matchesStatus =
        status === 'All' || (status === BIRTHDAYS ? birthdays.has(c.id) : (c.status || 'New') === status)
      return matchesSearch && matchesAgent && matchesStatus
    })
    if (status === BIRTHDAYS) rows = [...rows].sort((a, b) => birthdays.get(a.id).diffDays - birthdays.get(b.id).diffDays)
    return rows
  }, [customers, search, agent, status, birthdays, showAgent])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const description = { own: t('customers.descOwn'), team: t('customers.descTeam'), all: t('customers.descAll') }[scope]
  const filtersActive = search || status !== 'All' || agent !== 'All'

  function birthdayText(info) {
    if (info.diffDays === 0) return t('birthday.today')
    if (info.diffDays === 1) return t('birthday.tomorrow')
    const date = info.nextDate.toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    return t('birthday.inDays', { days: info.diffDays, date })
  }

  const columns = [
    {
      key: 'fullName',
      header: t('customers.customer'),
      primary: true,
      render: (c) => (
        <span className="block min-w-0">
          <span className="block truncate">{c.fullName}</span>
          <span className="block truncate text-xs font-normal tabular-nums text-fg-subtle">
            {[c.icNumber, c.phoneNumber && formatPhone(c.phoneNumber)].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    },
    ...(status === BIRTHDAYS
      ? [
          {
            key: 'birthday',
            header: t('customers.birthday'),
            render: (c) => {
              const info = birthdays.get(c.id)
              return (
                <span className="block">
                  <span className={info.diffDays === 0 ? 'font-medium text-fg' : 'text-fg'}>{birthdayText(info)}</span>
                  <span className="block text-xs text-fg-subtle">{t('birthday.turning', { age: info.turningAge })}</span>
                </span>
              )
            },
          },
        ]
      : []),
    ...(showAgent
      ? [
          {
            key: 'agentEmail',
            header: t('customers.agent'),
            render: (c) =>
              isUnassigned(c) ? (
                <span className="text-fg-subtle">{t('customers.unassigned')}</span>
              ) : (
                <span className="block max-w-56 truncate">{agentName(c.agentEmail)}</span>
              ),
          },
        ]
      : []),
    {
      key: 'status',
      header: t('customers.status'),
      wide: true,
      mobileLabel: false,
      className: 'w-48',
      render: (c) => (
        <CustomerStatusSelect value={c.status} onChange={(next) => onStatusChange(c.id, next)} aria-label={t('customers.status')} />
      ),
    },
  ]

  const chips = [
    { value: 'All', label: t('common.all'), count: customers.length },
    ...CUSTOMER_STATUSES.map((s) => ({ value: s, label: t(`status.customer.${s}`), count: statusCounts[s] || 0 })),
    { value: BIRTHDAYS, label: t('customers.birthdays'), count: birthdays.size },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('customers.title')}
        description={description}
        actions={
          <Button icon={Plus} onClick={() => setAdding(true)}>
            {t('customers.add')}
          </Button>
        }
      />

      <BirthdaysCard
        customers={customers}
        birthdays={birthdays}
        scope={scope}
        userEmail={userEmail}
        agentName={agentName}
        isLoading={isLoading}
        onViewAll={
          status === BIRTHDAYS
            ? undefined
            : () => {
                set({ search: '', agent: 'All', status: BIRTHDAYS })
                document.getElementById(TABLE_ID)?.scrollIntoView({ block: 'start' })
              }
        }
      />

      <StatGroup>
        <Stat label={t('customers.total')} value={customers.length.toLocaleString()} />
        <Stat label={t('customers.active')} value={customers.filter(isActiveCase).length.toLocaleString()} />
        <Stat label={t('customers.done')} value={customers.filter(isDoneCase).length.toLocaleString()} />
      </StatGroup>

      {isError && !isLoading && <Banner tone="danger">{t('customers.loadFailed')}</Banner>}

      <FilterChips label={t('customers.filterStatus')} value={status} onChange={(v) => set({ status: v })} options={chips} />

      <Card id={TABLE_ID} className="scroll-mt-20">
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:p-4">
          <Input
            icon={Search}
            type="search"
            aria-label={showAgent ? t('customers.searchAll') : t('customers.search')}
            placeholder={showAgent ? t('customers.searchAll') : t('customers.search')}
            value={search}
            onChange={(e) => set({ search: e.target.value })}
            className="sm:max-w-xs sm:flex-1"
          />
          {showAgent && (
            <Combobox
              aria-label={t('customers.filterAgent')}
              options={agentOptions}
              value={agent}
              onChange={(v) => set({ agent: v })}
              className="sm:w-64"
            />
          )}
        </div>
        <DataTable
          label={t('customers.title')}
          rows={pageRows}
          columns={columns}
          loading={isLoading}
          onRowClick={(c) => navigate(String(c.id))}
          empty={
            filtersActive ? (
              <EmptyState
                title={t('customers.noMatchTitle')}
                description={t('customers.noMatchBody')}
                action={
                  <Button variant="secondary" onClick={() => set({ search: '', status: 'All', agent: 'All' })}>
                    {t('customers.clear')}
                  </Button>
                }
              />
            ) : (
              <EmptyState title={t('customers.emptyTitle')} description={t('customers.emptyBody')} />
            )
          }
        />
        {filtered.length > PAGE_SIZE && (
          <div className="border-t border-line px-4 py-3 sm:px-5">
            <Pagination
              page={currentPage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
            />
          </div>
        )}
      </Card>

      <AddCustomerDialog
        open={adding}
        onOpenChange={setAdding}
        userEmail={userEmail}
        onAdded={() => {
          setAdding(false)
          refresh()
        }}
      />
    </div>
  )
}
