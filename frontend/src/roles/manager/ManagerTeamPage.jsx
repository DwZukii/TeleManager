import { useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { Button, Card, DataTable, EmptyState, Input, PageHeader, Person } from '../../ui'
import { useT } from '../../i18n/useT'
import ContactNumber from '../shared/ContactNumber'
import CreateAccountDialog from '../shared/CreateAccountDialog'

/** ManagerTeamPage — the manager's agents, how to reach them, and adding one. */
export default function ManagerTeamPage({ userEmail, myTeamList, onViewContact }) {
  const t = useT()
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rows = q
    ? myTeamList.filter((a) => a.email.toLowerCase().includes(q) || (a.full_name || '').toLowerCase().includes(q))
    : myTeamList

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('team.title')}
        description={t('team.descManager')}
        actions={
          <Button icon={UserPlus} onClick={() => setAdding(true)}>
            {t('team.add')}
          </Button>
        }
      />
      <Card>
        {myTeamList.length > 0 && (
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
        )}
        <DataTable
          label={t('team.title')}
          rows={rows}
          rowKey="email"
          initialSort={{ key: 'email', dir: 'asc' }}
          onRowClick={onViewContact}
          columns={[
            {
              key: 'email',
              header: t('team.agent'),
              primary: true,
              sortable: true,
              sortValue: (a) => a.full_name || a.email,
              render: (a) => <Person name={a.full_name} email={a.email} />,
            },
            {
              key: 'contact_number',
              header: t('team.contact'),
              render: (a) => <ContactNumber number={a.contact_number} warn />,
            },
          ]}
          empty={
            myTeamList.length === 0 ? (
              <EmptyState title={t('team.empty')} description={t('team.emptyBody')} />
            ) : (
              <EmptyState title={t('team.noMatch')} />
            )
          }
        />
      </Card>
      <CreateAccountDialog
        open={adding}
        onOpenChange={setAdding}
        by="manager"
        userEmail={userEmail}
        refreshKey={['managerData', userEmail]}
      />
    </div>
  )
}
