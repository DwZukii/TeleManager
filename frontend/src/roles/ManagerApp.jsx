import { Suspense, lazy, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'
import { Activity, BarChart3, ClipboardList, Phone, Users } from 'lucide-react'
import { useManagerData } from '../hooks/useManagerData'
import { useConfirm } from '../hooks/useConfirm'
import { PageSkeleton } from '../ui'
import { useT } from '../i18n/useT'
import AppShell from '../shell/AppShell'
import StaffContactDialog from '../shell/StaffContactDialog'
import AgentProfileRoute from './AgentProfileRoute'

const ManagerLeadsPage = lazy(() => import('./manager/ManagerLeadsPage'))
const CustomerPipelineManagerPage = lazy(() => import('../components/pipeline/CustomerPipelineManagerPage'))
const ManagerTeamMatrixTab = lazy(() => import('../components/manager/ManagerTeamMatrixTab'))
const ManagerActivityHub = lazy(() => import('../components/manager/ManagerActivityHub'))
const ManagerDirectoryTab = lazy(() => import('../components/manager/ManagerDirectoryTab'))
const ManagerAgentProfile = lazy(() => import('../components/manager/ManagerAgentProfile'))

export default function ManagerApp({ userEmail, userRole, onLogout }) {
  const t = useT()
  const navigate = useNavigate()
  const { data, isLoading } = useManagerData(userEmail)
  const { confirm, ConfirmDialog } = useConfirm()
  const [contact, setContact] = useState(null)

  const myTeamList = data?.myAgents || []
  const myTeamEmails = data?.teamEmails || []
  const unassignedCounts = data?.unassignedCounts || { 'Set A': 0, 'Set B': 0, 'Set C': 0 }
  const agentStats = data?.agentStats || []
  const activeLeads = [...(data?.managerNotifications || []), ...(data?.activeLeads?.slice(0, 50) || [])]

  const nav = [
    {
      items: [
        { to: '/leads', label: t('nav.leads'), icon: Phone },
        { to: '/performance', label: t('nav.performance'), icon: BarChart3 },
      ],
    },
    {
      label: t('nav.section.work'),
      items: [
        { to: '/activity', label: t('nav.activity'), icon: Activity, count: activeLeads.length },
        { to: '/customers', label: t('nav.customers'), icon: ClipboardList },
        { to: '/team', label: t('nav.team'), icon: Users },
      ],
    },
  ]

  return (
    <AppShell nav={nav} userEmail={userEmail} userRole={userRole} onLogout={onLogout}>
      <ConfirmDialog />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route
            path="/leads"
            element={
              <ManagerLeadsPage
                userEmail={userEmail}
                unassignedCounts={unassignedCounts}
                myTeamEmails={myTeamEmails}
                confirm={confirm}
              />
            }
          />
          <Route
            path="/performance"
            element={
              <ManagerTeamMatrixTab
                agentStats={agentStats}
                userEmail={userEmail}
                confirm={confirm}
                onLoadProfile={(agent) => navigate(`/performance/${encodeURIComponent(agent.email)}`)}
              />
            }
          />
          <Route
            path="/performance/:email"
            element={
              <AgentProfileRoute
                agentStats={agentStats}
                loading={isLoading}
                render={(agent, back) => (
                  <ManagerAgentProfile agent={agent} userEmail={userEmail} confirm={confirm} onBack={back} />
                )}
              />
            }
          />
          <Route
            path="/activity"
            element={<ManagerActivityHub activeLeads={activeLeads} userEmail={userEmail} confirm={confirm} />}
          />
          <Route
            path="/customers"
            element={<CustomerPipelineManagerPage userEmail={userEmail} userRole={userRole} agentsList={myTeamList} />}
          />
          <Route
            path="/team"
            element={<ManagerDirectoryTab userEmail={userEmail} myTeamList={myTeamList} onViewContact={setContact} />}
          />
          <Route path="*" element={<Navigate to="/leads" replace />} />
        </Routes>
      </Suspense>
      <StaffContactDialog person={contact} onClose={() => setContact(null)} />
    </AppShell>
  )
}
