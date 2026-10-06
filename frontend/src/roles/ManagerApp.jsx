import { Suspense, lazy, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Activity, BarChart3, ClipboardList, Phone, Settings, Users } from 'lucide-react'
import { supabase } from '../supabase'
import { useManagerData } from '../hooks/useManagerData'
import { useConfirm } from '../hooks/useConfirm'
import { PageSkeleton } from '../ui'
import { useT } from '../i18n/useT'
import AppShell from '../shell/AppShell'
import StaffContactDialog from '../shell/StaffContactDialog'
import AgentProfileRoute from './AgentProfileRoute'

const ManagerLeadsPage = lazy(() => import('./manager/ManagerLeadsPage'))
const ManagerTeamPage = lazy(() => import('./manager/ManagerTeamPage'))
const TeamCustomers = lazy(() => import('./customers/CustomersSection').then((m) => ({ default: m.TeamCustomers })))
const PerformancePage = lazy(() => import('./shared/performance/PerformancePage'))
const ActivityPage = lazy(() => import('./shared/ActivityPage'))
const AgentProfilePage = lazy(() => import('./shared/AgentProfilePage'))
const SettingsPage = lazy(() => import('./shared/SettingsPage'))

export default function ManagerApp({ userEmail, userRole, onLogout }) {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading } = useManagerData(userEmail)
  const { confirm, ConfirmDialog } = useConfirm()
  const [contact, setContact] = useState(null)

  const myTeamList = data?.myAgents || []
  const unassignedCounts = data?.unassignedCounts || { 'Set A': 0, 'Set B': 0, 'Set C': 0 }
  const agentStats = data?.agentStats || []
  const activeLeads = [...(data?.managerNotifications || []), ...(data?.activeLeads?.slice(0, 50) || [])]
  const refreshKey = ['managerData', userEmail]

  const revoke = async (agentEmail, pendingCount) => {
    if (pendingCount === 0) return
    if (!(await confirm(t('perf.revokeConfirm', { count: pendingCount, email: agentEmail })))) return
    const { error } = await supabase.from('leads').update({ assigned_to: 'unassigned' }).eq('assigned_to', agentEmail).eq('status', 'Pending')
    if (error) {
      toast.error(t('perf.revokeFailed', { error: error.message }))
      return
    }
    toast.success(t('perf.revoked', { count: pendingCount }))
    queryClient.invalidateQueries({ queryKey: refreshKey })
  }

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
    { items: [{ to: '/settings', label: t('nav.settings'), icon: Settings }] },
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
                myTeamList={myTeamList}
                confirm={confirm}
              />
            }
          />
          <Route
            path="/performance"
            element={
              <PerformancePage
                description={t('perf.descTeam')}
                agentStats={agentStats}
                onRevoke={revoke}
                onOpenAgent={(agent) => navigate(`/performance/${encodeURIComponent(agent.email)}`)}
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
                  <AgentProfilePage
                    agent={{ ...agent, manager_email: null }}
                    confirm={confirm}
                    onBack={back}
                    refreshKey={refreshKey}
                    ownPool
                  />
                )}
              />
            }
          />
          <Route
            path="/activity"
            element={
              <ActivityPage reviewer="manager" activeLeads={activeLeads} people={myTeamList} userEmail={userEmail} confirm={confirm} />
            }
          />
          <Route
            path="/customers/*"
            element={<TeamCustomers userEmail={userEmail} userRole={userRole} agentsList={myTeamList} confirm={confirm} />}
          />
          <Route
            path="/team"
            element={<ManagerTeamPage userEmail={userEmail} myTeamList={myTeamList} onViewContact={setContact} />}
          />
          <Route path="/settings" element={<SettingsPage userEmail={userEmail} userRole={userRole} onLogout={onLogout} />} />
          <Route path="*" element={<Navigate to="/leads" replace />} />
        </Routes>
      </Suspense>
      <StaffContactDialog person={contact} onClose={() => setContact(null)} />
    </AppShell>
  )
}
