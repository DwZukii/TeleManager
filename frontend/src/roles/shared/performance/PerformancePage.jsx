import { useMemo, useState } from 'react'
import { Search, Undo2 } from 'lucide-react'
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  FilterChips,
  Input,
  PageHeader,
  Pagination,
  Person,
  Stat,
  StatGroup,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  getStatusMeta,
  sortRows,
} from '../../../ui'
import { useT } from '../../../i18n/useT'
import { ActivityChart, StatusBreakdown } from './Charts'
import SplitBar from './SplitBar'

const PAGE_SIZE = 20

// Each status keeps its colour here too: the counters and the table columns.
const toneOf = (status) => getStatusMeta('lead', status).tone

// "Not started": at least this share of an agent's usable numbers is still
// pending. Invalid numbers are left out, as they are in every progress figure.
const NOT_STARTED = 0.9
const notStarted = (a) => {
  const usable = a.total - (a.invalid || 0)
  return usable > 0 && a.pending / usable >= NOT_STARTED
}

/**
 * PerformancePage — one screen for admins, managers and general managers.
 *
 *   managerStats     shows a Managers tab when given
 *   showManagerCol   adds each agent's manager to the agents table
 *   onRevoke         adds "Take back pending" per agent
 *   onOpenAgent      makes each agent open their profile
 */
export default function PerformancePage({
  description,
  agentStats,
  managerStats,
  managerNames,
  showManagerCol = false,
  onRevoke,
  onOpenAgent,
}) {
  const t = useT()
  const [tab, setTab] = useState('agents')
  // Held here so a counter can sort the agents table.
  const [sort, setSort] = useState({ key: 'total', dir: 'desc' })

  const totals = useMemo(
    () =>
      agentStats.reduce(
        (s, a) => ({
          total: s.total + a.total,
          pending: s.pending + a.pending,
          called: s.called + a.called,
          whatsapp: s.whatsapp + a.whatsapp,
          sms: s.sms + a.thinking,
        }),
        { total: 0, pending: 0, called: 0, whatsapp: 0, sms: 0 }
      ),
    [agentStats]
  )

  // Tapping a counter puts the agents with the most of it at the top.
  const sortBy = (key) => ({
    selected: tab === 'agents' && sort.key === key,
    onClick: () => {
      setTab('agents')
      setSort({ key, dir: 'desc' })
    },
  })

  return (
    <div className="space-y-5">
      <PageHeader title={t('perf.title')} description={description} />

      <StatGroup>
        <Stat {...sortBy('total')} label={t('perf.assigned')} value={totals.total.toLocaleString()} />
        <Stat {...sortBy('pending')} tint={toneOf('Pending')} label={t('perf.pending')} value={totals.pending.toLocaleString()} />
        <Stat {...sortBy('called')} tint={toneOf('Called')} label={t('perf.called')} value={totals.called.toLocaleString()} />
        <Stat {...sortBy('whatsapp')} tint={toneOf('WhatsApp Sent')} label={t('perf.whatsapp')} value={totals.whatsapp.toLocaleString()} />
        <Stat {...sortBy('thinking')} tint={toneOf('SMS Sent')} label={t('perf.sms')} value={totals.sms.toLocaleString()} />
      </StatGroup>

      <Tabs value={tab} onValueChange={setTab}>
        <TabList>
          <Tab value="agents" count={agentStats.length}>
            {t('perf.agents')}
          </Tab>
          {managerStats && (
            <Tab value="managers" count={managerStats.length}>
              {t('perf.managers')}
            </Tab>
          )}
          <Tab value="charts">{t('perf.charts')}</Tab>
        </TabList>
        <TabPanel value="agents">
          <AgentsTable
            agentStats={agentStats}
            managerNames={managerNames}
            showManagerCol={showManagerCol}
            onRevoke={onRevoke}
            onOpenAgent={onOpenAgent}
            sort={sort}
            setSort={setSort}
          />
        </TabPanel>
        {managerStats && (
          <TabPanel value="managers">
            <ManagersTable managerStats={managerStats} />
          </TabPanel>
        )}
        <TabPanel value="charts" className="grid grid-cols-1 gap-5 pt-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ActivityChart agentStats={agentStats} />
          </div>
          <div className="lg:col-span-2">
            <StatusBreakdown agentStats={agentStats} />
          </div>
        </TabPanel>
      </Tabs>
    </div>
  )
}

function AgentsTable({ agentStats, managerNames, showManagerCol, onRevoke, onOpenAgent, sort, setSort }) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [show, setShow] = useState('all')
  const [page, setPage] = useState(1)

  const managerLabel = (a) =>
    a.manager_email ? managerNames?.get(a.manager_email) || a.manager_email : t('perf.unassignedManager')

  const columns = [
    {
      key: 'email',
      header: t('perf.agent'),
      primary: true,
      sortable: true,
      sortValue: (a) => a.full_name || a.email,
      // The split bar sits under the name, so it costs the table no width.
      // A long name or email gives way before the table scrolls sideways.
      render: (a) => (
        <span className="block min-w-0">
          <Person shrink name={a.full_name} email={a.email} />
          <span className="mt-1.5 block w-40 max-w-full">
            <SplitBar agent={a} t={t} />
          </span>
        </span>
      ),
    },
    ...(showManagerCol
      ? [{ key: 'manager', header: t('perf.manager'), sortable: true, sortValue: managerLabel, hideOnMobile: true, shrink: true, className: 'min-w-28', render: managerLabel }]
      : []),
    { key: 'total', header: t('perf.assigned'), numeric: true, sortable: true },
    { key: 'pending', header: t('perf.pending'), numeric: true, sortable: true, tone: toneOf('Pending') },
    { key: 'called', header: t('perf.called'), numeric: true, sortable: true, tone: toneOf('Called') },
    { key: 'whatsapp', header: t('perf.whatsapp'), numeric: true, sortable: true, tone: toneOf('WhatsApp Sent') },
    { key: 'thinking', header: t('perf.sms'), numeric: true, sortable: true, tone: toneOf('SMS Sent') },
  ]

  const idleCount = useMemo(() => agentStats.filter(notStarted).length, [agentStats])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = agentStats.filter(
      (a) =>
        (show === 'all' || notStarted(a)) && (!q || a.email.toLowerCase().includes(q) || (a.full_name || '').toLowerCase().includes(q))
    )
    return sortRows(rows, columns, sort)
    // columns depend only on props already listed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentStats, query, show, sort, showManagerCol, managerNames])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <Input
          icon={Search}
          type="search"
          aria-label={t('perf.search')}
          placeholder={t('perf.search')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          className="sm:max-w-xs sm:flex-1"
        />
        <FilterChips
          label={t('perf.show')}
          value={show}
          onChange={(value) => {
            setShow(value)
            setPage(1)
          }}
          options={[
            { value: 'all', label: t('common.all'), count: agentStats.length },
            { value: 'idle', label: t('perf.notStarted'), count: idleCount },
          ]}
        />
      </div>
      <DataTable
        label={t('perf.agents')}
        rows={filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)}
        rowKey="email"
        columns={columns}
        sort={sort}
        onSortChange={(next) => {
          setSort(next)
          setPage(1)
        }}
        onRowClick={onOpenAgent}
        actions={
          onRevoke &&
          // Nothing pending means nothing to take back, so no button at all.
          ((a) =>
            a.pending > 0 ? (
              <Button variant="secondary" size="sm" icon={Undo2} onClick={() => onRevoke(a.email, a.pending)}>
                {t('perf.revoke')}
              </Button>
            ) : null)
        }
        empty={
          agentStats.length === 0 ? (
            <EmptyState title={t('perf.noAgents')} description={t('perf.noAgentsBody')} />
          ) : show === 'idle' && !query.trim() ? (
            <EmptyState title={t('perf.noneIdle')} />
          ) : (
            <EmptyState title={t('perf.noMatch')} />
          )
        }
      />
      {filtered.length > PAGE_SIZE && (
        <div className="border-t border-line px-4 py-3 sm:px-5">
          <Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </div>
      )}
    </Card>
  )
}

function ManagersTable({ managerStats }) {
  const t = useT()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rows = q
    ? managerStats.filter((m) => m.email.toLowerCase().includes(q) || (m.full_name || '').toLowerCase().includes(q))
    : managerStats

  return (
    <Card>
      <div className="border-b border-line p-3 sm:p-4">
        <Input
          icon={Search}
          type="search"
          aria-label={t('perf.searchManagers')}
          placeholder={t('perf.searchManagers')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>
      <DataTable
        label={t('perf.managers')}
        rows={rows}
        rowKey="email"
        initialSort={{ key: 'total_agents', dir: 'desc' }}
        columns={[
          {
            key: 'email',
            header: t('perf.manager'),
            primary: true,
            sortable: true,
            render: (m) => <Person name={m.full_name} email={m.email} showEmail={false} />,
          },
          { key: 'total_agents', header: t('perf.teamSize'), numeric: true, sortable: true },
          { key: 'unassigned_pool', header: t('perf.pool'), numeric: true, sortable: true },
        ]}
        empty={<EmptyState title={t('perf.noManagers')} />}
      />
    </Card>
  )
}
