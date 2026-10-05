import ManagerCleanAdd from '../../components/manager/ManagerCleanAdd'
import ManagerDistributeTeam from '../../components/manager/ManagerDistributeTeam'

/** ManagerLeadsPage — import numbers, then share them out to the team. */
export default function ManagerLeadsPage({ userEmail, unassignedCounts, myTeamEmails, confirm }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
      <ManagerCleanAdd userEmail={userEmail} />
      <ManagerDistributeTeam
        userEmail={userEmail}
        unassignedCounts={unassignedCounts}
        myTeamEmails={myTeamEmails}
        confirm={confirm}
      />
    </div>
  )
}
