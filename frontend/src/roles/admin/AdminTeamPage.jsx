import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, UserPlus } from 'lucide-react'
import { supabase } from '../../supabase'
import {
  Button,
  Card,
  Combobox,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  Person,
  Select,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '../../ui'
import { useT } from '../../i18n/useT'
import ContactNumber from '../shared/ContactNumber'
import CreateAccountDialog from '../shared/CreateAccountDialog'

const PAGE_SIZE = 20

const matches = (person, q) => !q || person.email.toLowerCase().includes(q) || (person.full_name || '').toLowerCase().includes(q)

function SearchBar({ value, onChange, children }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:p-4">
      <Input
        icon={Search}
        type="search"
        aria-label={t('team.search')}
        placeholder={t('team.search')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sm:max-w-xs sm:flex-1"
      />
      {children}
    </div>
  )
}

/**
 * AdminTeamPage — everyone with an account. Agents are moved between managers
 * with a searchable picker; managers are given a general manager in place.
 */
export default function AdminTeamPage({ userEmail, managersList, agentsList, gmList, onViewContact }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('agents')
  const [adding, setAdding] = useState(false)
  const refreshKey = ['adminData', userEmail]
  const refresh = () => queryClient.invalidateQueries({ queryKey: refreshKey })

  const managerName = useMemo(() => {
    const names = new Map(managersList.map((m) => [m.email, m.full_name || m.email]))
    return (email) => names.get(email) || email
  }, [managersList])

  const managerOptions = useMemo(
    () => [
      { value: '', label: t('teamAdmin.noManager') },
      ...managersList.map((m) => ({ value: m.email, label: m.full_name || m.email, description: m.full_name ? m.email : undefined })),
    ],
    [managersList, t]
  )

  async function setManager(agent, email) {
    if ((agent.manager_email || '') === email) return
    const { error } = await supabase.from('profiles').update({ manager_email: email || null }).eq('email', agent.email)
    if (error) {
      toast.error(t('team.reassignFailed', { error: error.message }))
      return
    }
    toast.success(email ? t('team.reassigned', { email: agent.email, manager: managerName(email) }) : t('team.unassignedNow', { email: agent.email }))
    refresh()
  }

  async function setGm(manager, email) {
    const { error } = await supabase.from('profiles').update({ general_manager_email: email || null }).eq('email', manager.email)
    if (error) {
      toast.error(t('team.reassignFailed', { error: error.message }))
      return
    }
    toast.success(t('team.gmChanged', { email: manager.email }))
    refresh()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('team.title')}
        description={t('team.descAdmin')}
        actions={
          <Button icon={UserPlus} onClick={() => setAdding(true)}>
            {t('team.addAccount')}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabList>
          <Tab value="agents" count={agentsList.length}>
            {t('team.agentsTab')}
          </Tab>
          <Tab value="managers" count={managersList.length}>
            {t('team.managersTab')}
          </Tab>
          <Tab value="gms" count={gmList.length}>
            {t('team.gmTab')}
          </Tab>
        </TabList>
        <TabPanel value="agents">
          <AgentsTab
            agentsList={agentsList}
            managerOptions={managerOptions}
            managerName={managerName}
            onSetManager={setManager}
            onViewContact={onViewContact}
          />
        </TabPanel>
        <TabPanel value="managers">
          <ManagersTab managersList={managersList} agentsList={agentsList} gmList={gmList} onSetGm={setGm} onViewContact={onViewContact} />
        </TabPanel>
        <TabPanel value="gms">
          <GmsTab gmList={gmList} managersList={managersList} onViewContact={onViewContact} />
        </TabPanel>
      </Tabs>

      <CreateAccountDialog
        open={adding}
        onOpenChange={setAdding}
        by="admin"
        userEmail={userEmail}
        managersList={managersList}
        refreshKey={refreshKey}
      />
    </div>
  )
}

function AgentsTab({ agentsList, managerOptions, onSetManager, onViewContact }) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [manager, setManager] = useState('All')
  const [page, setPage] = useState(1)

  const filterOptions = useMemo(
    () => [{ value: 'All', label: t('teamAdmin.allManagers') }, ...managerOptions],
    [managerOptions, t]
  )
  const q = query.trim().toLowerCase()
  const rows = agentsList.filter(
    (a) => matches(a, q) && (manager === 'All' || (a.manager_email || '') === manager)
  )
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pages)

  return (
    <Card>
      <SearchBar
        value={query}
        onChange={(v) => {
          setQuery(v)
          setPage(1)
        }}
      >
        <Combobox
          aria-label={t('teamAdmin.filterManager')}
          options={filterOptions}
          value={manager}
          onChange={(v) => {
            setManager(v)
            setPage(1)
          }}
          className="sm:w-64"
        />
      </SearchBar>
      <DataTable
        label={t('team.agentsTab')}
        rows={rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)}
        rowKey="email"
        onRowClick={onViewContact}
        columns={[
          { key: 'email', header: t('team.agent'), primary: true, render: (a) => <Person name={a.full_name} email={a.email} /> },
          { key: 'contact_number', header: t('team.contact'), render: (a) => <ContactNumber number={a.contact_number} warn /> },
          {
            key: 'manager_email',
            header: t('team.manager'),
            wide: true,
            className: 'w-72',
            render: (a) => (
              <Combobox
                aria-label={t('team.manager')}
                options={managerOptions}
                value={a.manager_email || ''}
                onChange={(email) => onSetManager(a, email)}
                placeholder={t('team.chooseManager')}
              />
            ),
          },
        ]}
        empty={<EmptyState title={agentsList.length ? t('team.noMatch') : t('teamAdmin.emptyAgents')} />}
      />
      {rows.length > PAGE_SIZE && (
        <div className="border-t border-line px-4 py-3 sm:px-5">
          <Pagination page={current} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
        </div>
      )}
    </Card>
  )
}

function ManagersTab({ managersList, agentsList, gmList, onSetGm, onViewContact }) {
  const t = useT()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const teamSize = useMemo(() => {
    const sizes = {}
    for (const a of agentsList) if (a.manager_email) sizes[a.manager_email] = (sizes[a.manager_email] || 0) + 1
    return sizes
  }, [agentsList])

  return (
    <Card>
      <SearchBar value={query} onChange={setQuery} />
      <DataTable
        label={t('team.managersTab')}
        rows={managersList.filter((m) => matches(m, q)).map((m) => ({ ...m, team: teamSize[m.email] || 0 }))}
        rowKey="email"
        onRowClick={onViewContact}
        initialSort={{ key: 'team', dir: 'desc' }}
        columns={[
          { key: 'email', header: t('team.manager'), primary: true, sortable: true, sortValue: (m) => m.full_name || m.email, render: (m) => <Person name={m.full_name} email={m.email} /> },
          { key: 'contact_number', header: t('team.contact'), render: (m) => <ContactNumber number={m.contact_number} warn /> },
          { key: 'team', header: t('team.agents'), numeric: true, sortable: true },
          {
            key: 'general_manager_email',
            header: t('team.generalManager'),
            wide: true,
            className: 'w-60',
            render: (m) => (
              <Select size="sm" value={m.general_manager_email || ''} onChange={(e) => onSetGm(m, e.target.value)} aria-label={t('team.generalManager')}>
                <option value="">{t('team.noGm')}</option>
                {gmList.map((gm) => (
                  <option key={gm.email} value={gm.email}>
                    {gm.full_name || gm.email}
                  </option>
                ))}
              </Select>
            ),
          },
        ]}
        empty={<EmptyState title={managersList.length ? t('team.noMatch') : t('teamAdmin.emptyManagers')} />}
      />
    </Card>
  )
}

function GmsTab({ gmList, managersList, onViewContact }) {
  const t = useT()
  return (
    <Card>
      <DataTable
        label={t('team.gmTab')}
        rows={gmList.map((gm) => ({ ...gm, managers: managersList.filter((m) => m.general_manager_email === gm.email).length }))}
        rowKey="email"
        onRowClick={onViewContact}
        columns={[
          { key: 'email', header: t('team.generalManager'), primary: true, render: (g) => <Person name={g.full_name} email={g.email} /> },
          { key: 'contact_number', header: t('team.contact'), render: (g) => <ContactNumber number={g.contact_number} warn /> },
          { key: 'managers', header: t('teamAdmin.managersCount'), numeric: true },
        ]}
        empty={<EmptyState title={t('teamAdmin.emptyGms')} />}
      />
    </Card>
  )
}
