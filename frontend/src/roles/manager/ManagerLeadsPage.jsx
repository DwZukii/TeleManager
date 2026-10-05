import { PageHeader } from '../../ui'
import { useT } from '../../i18n/useT'
import PoolSummary from '../shared/PoolSummary'
import ImportNumbersCard from '../shared/ImportNumbersCard'
import MoveNumbersCard from '../shared/MoveNumbersCard'

/** ManagerLeadsPage — import numbers, then share them with the team. */
export default function ManagerLeadsPage({ userEmail, unassignedCounts, myTeamList, confirm }) {
  const t = useT()
  const refreshKey = ['managerData', userEmail]
  return (
    <div className="space-y-6">
      <PageHeader title={t('leadsAdmin.title')} description={t('leadsManager.description')} />
      <PoolSummary unassignedCounts={unassignedCounts} />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <ImportNumbersCard userEmail={userEmail} refreshKey={refreshKey} />
        <MoveNumbersCard
          mode="assign"
          title={t('move.distributeTitle')}
          description={t('move.assignDescription')}
          people={myTeamList}
          personLabel={t('move.agent')}
          userEmail={userEmail}
          unassignedCounts={unassignedCounts}
          refreshKey={refreshKey}
          confirm={confirm}
          canClear
        />
      </div>
    </div>
  )
}
