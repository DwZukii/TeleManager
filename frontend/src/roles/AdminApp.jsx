import { Suspense, lazy, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Activity, BarChart3, ClipboardList, Globe, LayoutDashboard, MessageSquareText, Phone, Settings, Users } from 'lucide-react'
import { supabase } from '../supabase'
import { useAdminData } from '../hooks/useAdminData'
import { useWebLeadsData } from '../hooks/useWebLeadsData'
import { useConfirm } from '../hooks/useConfirm'
import { PageSkeleton } from '../ui'
import { useT } from '../i18n/useT'
import AppShell from '../shell/AppShell'
import StaffContactDialog from '../shell/StaffContactDialog'
import AgentProfileRoute from './AgentProfileRoute'
import AdminOverview from './admin/AdminOverview'

const AdminLeadsPage = lazy(() => import('./admin/AdminLeadsPage'))
const AdminSettingsPage = lazy(() => import('./admin/AdminSettingsPage'))
const GlobalMatrixTab = lazy(() => import('../components/admin/GlobalMatrixTab'))
const AllCustomers = lazy(() => import('./customers/CustomersSection').then((m) => ({ default: m.AllCustomers })))
const AdminActivityHub = lazy(() => import('../components/admin/AdminActivityHub'))
const AdminDirectoryTab = lazy(() => import('../components/admin/AdminDirectoryTab'))
const AdminFeedbackTab = lazy(() => import('../components/admin/AdminFeedbackTab'))
const AdminWebLeadsTab = lazy(() => import('../components/admin/AdminWebLeadsTab'))
const AdminAgentProfile = lazy(() => import('../components/admin/AdminAgentProfile'))

export default function AdminApp({ userEmail, userRole, onLogout }) {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading } = useAdminData(userEmail, userRole)
  const { confirm, ConfirmDialog } = useConfirm()

  const allFeedback = data?.allFeedback || []
  const unassignedCounts = data?.unassignedCounts || { 'Set A': 0, 'Set B': 0, 'Set C': 0 }
  const managersList = data?.managersList || []
  const agentsList = data?.agentsList || []
  const gmList = data?.gmList || []
  const managerStats = data?.managerStats || []
  const agentStats = data?.agentStats || []
  const activeLeads = data?.activeLeads || []

  const [contact, setContact] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)

  const unreadFeedbackCount = allFeedback.filter((f) => f.status === 'New').length

  // Landing-page enquiries live in their own super_admin-only pool (web_leads).
  // RLS is the real boundary; this flag just keeps the nav item hidden for others.
  const isSuperAdmin = userRole === 'super_admin'
  const { data: webLeads = [] } = useWebLeadsData(userRole)
  const newWebLeadCount = webLeads.filter((l) => l.status === 'New').length

  const handleRevokeLeads = async (agentEmail, pendingCount) => {
    if (pendingCount === 0) return
    if (!(await confirm(`Pull back ${pendingCount} pending numbers from ${agentEmail}?`))) return
    const { error } = await supabase
      .from('leads')
      .update({ assigned_to: 'unassigned' })
      .eq('assigned_to', agentEmail)
      .eq('status', 'Pending')
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Revoked ${pendingCount} leads.`)
    queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] })
  }

  const handleDeleteUser = async (targetEmail) => {
    const confirmed = await confirm(
      `Delete ${targetEmail}? Their account is removed and all their leads go back to the unassigned pool. This cannot be undone.`
    )
    if (!confirmed) return

    setDeletingUser(targetEmail)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ emailToDelete: targetEmail }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      queryClient.invalidateQueries({ queryKey: ['adminData', userEmail] })
      setContact(null)
      navigate('/performance')
      toast.success(`${targetEmail} deleted`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeletingUser(null)
    }
  }

  const openProfile = (agent) => navigate(`/performance/${encodeURIComponent(agent.email)}`)

  const nav = [
    {
      items: [
        { to: '/overview', label: t('nav.overview'), icon: LayoutDashboard },
        { to: '/leads', label: t('nav.leads'), icon: Phone },
        { to: '/performance', label: t('nav.performance'), icon: BarChart3 },
      ],
    },
    {
      label: t('nav.section.work'),
      items: [
        { to: '/activity', label: t('nav.activity'), icon: Activity, count: activeLeads.length },
        { to: '/customers', label: t('nav.customers'), icon: ClipboardList },
        ...(isSuperAdmin ? [{ to: '/web-leads', label: t('nav.webLeads'), icon: Globe, count: newWebLeadCount }] : []),
      ],
    },
    {
      label: t('nav.section.admin'),
      items: [
        { to: '/team', label: t('nav.team'), icon: Users },
        { to: '/feedback', label: t('nav.feedback'), icon: MessageSquareText, count: unreadFeedbackCount },
        { to: '/settings', label: t('nav.settings'), icon: Settings },
      ],
    },
  ]

  return (
    <AppShell nav={nav} userEmail={userEmail} userRole={userRole} onLogout={onLogout}>
      <ConfirmDialog />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route
            path="/overview"
            element={
              <AdminOverview
                unassignedCounts={unassignedCounts}
                activeLeads={activeLeads}
                newWebLeadCount={newWebLeadCount}
                unreadFeedbackCount={unreadFeedbackCount}
                agentsList={agentsList}
                managersList={managersList}
                showWebLeads={isSuperAdmin}
              />
            }
          />
          <Route
            path="/leads"
            element={
              <AdminLeadsPage
                userEmail={userEmail}
                unassignedCounts={unassignedCounts}
                agentsList={agentsList}
                managersList={managersList}
                confirm={confirm}
              />
            }
          />
          <Route
            path="/performance"
            element={
              <GlobalMatrixTab
                agentStats={agentStats}
                managerStats={managerStats}
                onRevoke={handleRevokeLeads}
                onLoadProfile={openProfile}
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
                  <AdminAgentProfile
                    agent={agent}
                    userEmail={userEmail}
                    userRole={userRole}
                    confirm={confirm}
                    onBack={back}
                    onDeleteUser={handleDeleteUser}
                  />
                )}
              />
            }
          />
          <Route
            path="/activity"
            element={<AdminActivityHub activeLeads={activeLeads} userEmail={userEmail} confirm={confirm} />}
          />
          <Route
            path="/customers/*"
            element={<AllCustomers userEmail={userEmail} userRole={userRole} agentsList={agentsList} confirm={confirm} />}
          />
          {isSuperAdmin && <Route path="/web-leads" element={<AdminWebLeadsTab confirm={confirm} />} />}
          <Route
            path="/team"
            element={
              <AdminDirectoryTab
                userEmail={userEmail}
                managersList={managersList}
                agentsList={agentsList}
                gmList={gmList}
                onViewContact={setContact}
              />
            }
          />
          <Route
            path="/feedback"
            element={
              <AdminFeedbackTab allFeedback={allFeedback} userRole={userRole} userEmail={userEmail} confirm={confirm} />
            }
          />
          <Route
            path="/settings"
            element={<AdminSettingsPage agentStats={agentStats} userEmail={userEmail} confirm={confirm} />}
          />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </Suspense>

      <StaffContactDialog
        person={contact}
        onClose={() => setContact(null)}
        canDelete={isSuperAdmin && contact?.email !== userEmail}
        deleting={deletingUser === contact?.email}
        onDelete={() => handleDeleteUser(contact.email)}
      />
    </AppShell>
  )
}
