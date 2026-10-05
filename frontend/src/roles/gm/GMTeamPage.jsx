import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Card, CardHeader, DataTable, EmptyState, Input, PageHeader, Person } from '../../ui'
import { useT } from '../../i18n/useT'
import ContactNumber from '../shared/ContactNumber'

/** GMTeamPage — the general manager's managers, and every agent under them. */
export default function GMTeamPage({ managersList, agentsList, onViewContact }) {
  const t = useT()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const names = useMemo(() => new Map(managersList.map((m) => [m.email, m.full_name || m.email])), [managersList])
  const teamSize = (email) => agentsList.filter((a) => a.manager_email === email).length
  const agents = agentsList.filter((a) => !q || a.email.toLowerCase().includes(q) || (a.full_name || '').toLowerCase().includes(q))

  return (
    <div className="space-y-5">
      <PageHeader title={t('team.title')} description={t('team.descGm')} />
      <Card>
        <CardHeader title={t('team.managersTab')} />
        <DataTable
          label={t('team.managersTab')}
          rows={managersList.map((m) => ({ ...m, team: teamSize(m.email) }))}
          rowKey="email"
          onRowClick={onViewContact}
          columns={[
            { key: 'email', header: t('team.manager'), primary: true, render: (m) => <Person name={m.full_name} email={m.email} /> },
            { key: 'contact_number', header: t('team.contact'), render: (m) => <ContactNumber number={m.contact_number} /> },
            { key: 'team', header: t('team.agents'), numeric: true },
          ]}
          empty={<EmptyState title={t('teamAdmin.emptyManagers')} />}
        />
      </Card>
      <Card>
        <CardHeader title={t('team.agentsTab')} />
        <div className="border-b border-line p-3 sm:p-4">
          <Input
            icon={Search}
            type="search"
            aria-label={t('team.search')}
            placeholder={t('team.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-xs"
          />
        </div>
        <DataTable
          label={t('team.agentsTab')}
          rows={agents}
          rowKey="email"
          onRowClick={onViewContact}
          initialSort={{ key: 'manager_email', dir: 'asc' }}
          columns={[
            { key: 'email', header: t('team.agent'), primary: true, render: (a) => <Person name={a.full_name} email={a.email} /> },
            { key: 'contact_number', header: t('team.contact'), render: (a) => <ContactNumber number={a.contact_number} /> },
            {
              key: 'manager_email',
              header: t('team.manager'),
              sortable: true,
              sortValue: (a) => names.get(a.manager_email) || '',
              render: (a) => names.get(a.manager_email) || '—',
            },
          ]}
          empty={<EmptyState title={agentsList.length ? t('team.noMatch') : t('teamAdmin.emptyAgents')} />}
        />
      </Card>
    </div>
  )
}
