import AdminMaintenanceCards from '../../components/admin/AdminMaintenanceCards'

/** AdminSettingsPage — maintenance actions, kept away from the daily screens. */
export default function AdminSettingsPage({ agentStats, userEmail, confirm }) {
  return <AdminMaintenanceCards agentStats={agentStats} userEmail={userEmail} confirm={confirm} />
}
