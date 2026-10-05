import { useMemo, useState } from 'react'
import { Search, Undo2 } from 'lucide-react'
import {
  Avatar,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  Stat,
  StatGroup,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  sortRows,
} from '../../../ui'
import { useT } from '../../../i18n/useT'
import { ActivityChart, StatusBreakdown } from './Charts'

const PAGE_SIZE = 20

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

  return (
    <div className="space-y-5">
      <PageHeader title={t('perf.title')} description={description} />

      <StatGroup>
        <Stat label={t('perf.assigned')} value={totals.total.toLocaleString()} />
        <Stat label={t('perf.pending')} value={totals.pending.toLocaleString()} />
        <Stat label={t('perf.called')} value={totals.called.toLocaleString()} />
        <Stat label={t('perf.whatsapp')} value={totals.whatsapp.toLocaleString()} />
        <Stat label={t('perf.sms')} value={totals.sms.toLocaleString()} />
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

function AgentsTable({ agentStats, managerNames, showManagerCol, onRevoke, onOpenAgent }) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'total', dir: 'desc' })
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
      render: (a) => (
        <span className="inline-flex min-w-0 items-center gap-2.5">
          <Avatar name={a.full_name} email={a.email} size="sm" />
          <span className="min-w-0">
            <span className="block truncate">{a.full_name || a.email}</span>
            {a.full_name && <span className="block truncate text-xs font-normal text-fg-subtle">{a.email}</span>}
          </span>
        </span>
      ),
    },
    ...(showManagerCol
      ? [{ key: 'manager', header: t('perf.manager'), sortable: true, sortValue: managerLabel, hideOnMobile: true, className: 'whitespace-nowrap', render: managerLabel }]
      : []),
    { key: 'total', header: t('perf.assigned'), numeric: true, sortable: true },
    { key: 'pending', header: t('perf.pending'), numeric: true, sortable: true },
    { key: 'called', header: t('perf.called'), numeric: true, sortable: true },
    { key: 'whatsapp', header: t('perf.whatsapp'), numeric: true, sortable: true },
    { key: 'thinking', header: t('perf.sms'), numeric: true, sortable: true },
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = q
      ? agentStats.filter((a) => a.email.toLowerCase().includes(q) || (a.full_name || '').toLowerCase().includes(q))
      : agentStats
    return sortRows(rows, columns, sort)
    // columns depend only on props already listed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentStats, query, sort, showManagerCol, managerNames])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)

  return (
    <Card>
      <div className="border-b border-line p-3 sm:p-4">
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
          className="sm:max-w-xs"
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
          ((a) => (
            <Button
              variant="secondary"
              size="sm"
              icon={Undo2}
              disabled={a.pending === 0}
              onClick={() => onRevoke(a.email, a.pending)}
            >
              {t('perf.revoke')}
            </Button>
          ))
        }
        empty={
          agentStats.length === 0 ? (
            <EmptyState title={t('perf.noAgents')} description={t('perf.noAgentsBody')} />
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
            render: (m) => (
              <span className="inline-flex min-w-0 items-center gap-2.5">
                <Avatar name={m.full_name} email={m.email} size="sm" />
                <span className="truncate">{m.full_name || m.email}</span>
              </span>
            ),
          },
          { key: 'total_agents', header: t('perf.teamSize'), numeric: true, sortable: true },
          { key: 'unassigned_pool', header: t('perf.pool'), numeric: true, sortable: true },
        ]}
        empty={<EmptyState title={t('perf.noManagers')} />}
      />
    </Card>
  )
}
