import { PageHeader } from '../../ui'
import { useT } from '../../i18n/useT'
import PoolSummary from '../shared/PoolSummary'
import ImportNumbersCard from '../shared/ImportNumbersCard'
import MoveNumbersCard from '../shared/MoveNumbersCard'

/** AdminLeadsPage — import, assign to an agent, move to a manager, in that order. */
export default function AdminLeadsPage({ userEmail, unassignedCounts, agentsList, managersList, confirm }) {
  const t = useT()
  const refreshKey = ['adminData', userEmail]
  return (
    <div className="space-y-6">
      <PageHeader title={t('leadsAdmin.title')} description={t('leadsAdmin.description')} />
      <PoolSummary unassignedCounts={unassignedCounts} />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <ImportNumbersCard userEmail={userEmail} refreshKey={refreshKey} />
        <div className="space-y-5">
          <MoveNumbersCard
            mode="assign"
            title={t('move.assignTitle')}
            description={t('move.assignDescription')}
            people={agentsList}
            personLabel={t('move.agent')}
            userEmail={userEmail}
            unassignedCounts={unassignedCounts}
            refreshKey={refreshKey}
            confirm={confirm}
            canClear
          />
          <MoveNumbersCard
            mode="transfer"
            title={t('move.transferTitle')}
            description={t('move.transferDescription')}
            people={managersList}
            personLabel={t('move.manager')}
            amounts={[50, 100, 200, 500, 1000]}
            userEmail={userEmail}
            unassignedCounts={unassignedCounts}
            refreshKey={refreshKey}
            confirm={confirm}
          />
        </div>
      </div>
    </div>
  )
}
