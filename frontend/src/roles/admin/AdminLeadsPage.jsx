import AdminCleanAdd from '../../components/admin/AdminCleanAdd'
import AdminAssignStaff from '../../components/admin/AdminAssignStaff'
import AdminManagerTransfer from '../../components/admin/AdminManagerTransfer'

/** AdminLeadsPage — import, assign to an agent, move to a manager, in that order. */
export default function AdminLeadsPage({ userEmail, unassignedCounts, agentsList, managersList, confirm }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
        <AdminCleanAdd userEmail={userEmail} />
        <AdminAssignStaff userEmail={userEmail} unassignedCounts={unassignedCounts} agentsList={agentsList} confirm={confirm} />
      </div>
      <AdminManagerTransfer userEmail={userEmail} managersList={managersList} unassignedCounts={unassignedCounts} />
    </div>
  )
}
