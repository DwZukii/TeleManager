import { Suspense, lazy, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, ClipboardList, Phone } from 'lucide-react'
import { supabase } from '../supabase'
import { useStaffData } from '../hooks/useStaffData'
import { usePipelineData } from '../hooks/usePipelineData'
import { useConfirm } from '../hooks/useConfirm'
import { PageSkeleton } from '../ui'
import { useT } from '../i18n/useT'
import AppShell from '../shell/AppShell'
import { inCallingPilot } from '../config'

const OwnCustomers = lazy(() => import('./customers/CustomersSection').then((m) => ({ default: m.OwnCustomers })))
const StaffLeadsPage = lazy(() => import('./staff/StaffLeadsPage'))
const StaffLeadPage = lazy(() => import('./staff/StaffLeadPage'))
const StaffAlertsPage = lazy(() => import('./staff/StaffAlertsPage'))
const CallingSession = lazy(() => import('./staff/CallingSession'))

const EMPTY = { leads: [], staffNotifications: [], reminderNotifications: [] }

// The old staff screen kept its place in ?tab= and ?leadId=. Send those links
// to the new addresses so bookmarks and shared links keep working.
function legacyRedirect(search) {
  const params = new URLSearchParams(search)
  const tab = params.get('tab')
  const leadId = params.get('leadId')
  if (!tab && !leadId) return null
  if (leadId) return `/leads/${leadId}`
  return { pipeline: '/customers', notifications: '/alerts' }[tab] ?? '/leads'
}

export default function StaffApp({ userEmail, onLogout }) {
  const t = useT()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { data: staffData = EMPTY, isLoading } = useStaffData(userEmail)
  const { data: pipelineCustomers = [] } = usePipelineData(userEmail)
  const { confirm, ConfirmDialog } = useConfirm()

  const leads = useMemo(() => staffData.leads ?? [], [staffData.leads])
  const staffNotifications = staffData.staffNotifications ?? []
  const reminderNotifications = staffData.reminderNotifications ?? []

  // Birthday notifications: customers whose birthday is today.
  const birthdayNotifications = useMemo(() => {
    const today = new Date()
    return pipelineCustomers.filter((c) => {
      if (!c.dateOfBirth) return false
      const dob = new Date(c.dateOfBirth + 'T00:00:00')
      return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()
    })
  }, [pipelineCustomers])

  const [dismissedBirthdays, setDismissedBirthdays] = useState(() => new Set())
  const visibleBirthdays = birthdayNotifications.filter((c) => !dismissedBirthdays.has(c.id))
  const totalNotifCount = staffNotifications.length + visibleBirthdays.length + reminderNotifications.length

  // List state lives here so it survives opening a lead and coming back.
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const leadsPerPage = 20

  const handleStatusChange = async (id, newStatus) => {
    queryClient.setQueryData(['staffData', userEmail], (oldData) => {
      if (!oldData) return { leads: [], staffNotifications: [] }
      return { ...oldData, leads: oldData.leads.map((lead) => (lead.id === id ? { ...lead, status: newStatus } : lead)) }
    })
    await supabase.from('leads').update({ status: newStatus, admin_reviewed: false, manager_reviewed: false }).eq('id', id)
  }

  const legacy = legacyRedirect(location.search)
  if (legacy) return <Navigate to={legacy} replace />

  const nav = [
    {
      items: [
        { to: '/leads', label: t('nav.leads'), icon: Phone },
        { to: '/customers', label: t('nav.customers'), icon: ClipboardList },
        { to: '/alerts', label: t('nav.alerts'), icon: Bell, count: totalNotifCount },
      ],
    },
  ]

  return (
    <AppShell nav={nav} bottomTabs userEmail={userEmail} userRole="agent" onLogout={onLogout}>
      <ConfirmDialog />
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route
              path="/leads"
              element={
                <StaffLeadsPage
                  leads={leads}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  leadsPerPage={leadsPerPage}
                  onStatusChange={handleStatusChange}
                  canStartSession={inCallingPilot(userEmail)}
                />
              }
            />
            {inCallingPilot(userEmail) && (
              <Route
                path="/leads/calling"
                element={<CallingSession leads={leads} userEmail={userEmail} onStatusChange={handleStatusChange} />}
              />
            )}
            <Route
              path="/leads/:leadId"
              element={
                <LeadRoute
                  leads={leads}
                  render={(lead) => (
                    <StaffLeadPage lead={lead} userEmail={userEmail} onStatusChange={handleStatusChange} confirm={confirm} />
                  )}
                />
              }
            />
            <Route
              path="/customers/*"
              element={<OwnCustomers userEmail={userEmail} userRole="agent" confirm={confirm} />}
            />
            <Route
              path="/alerts"
              element={
                <StaffAlertsPage
                  staffNotifications={staffNotifications}
                  visibleBirthdays={visibleBirthdays}
                  reminderNotifications={reminderNotifications}
                  totalNotifCount={totalNotifCount}
                  userEmail={userEmail}
                  setDismissedBirthdays={setDismissedBirthdays}
                />
              }
            />
            <Route path="*" element={<Navigate to="/leads" replace />} />
          </Routes>
        </Suspense>
      )}
    </AppShell>
  )
}

/** Finds the lead named in the URL among the agent's own leads. */
function LeadRoute({ leads, render }) {
  const { leadId } = useParams()
  const lead = leads.find((l) => String(l.id) === leadId)
  if (!lead) return <Navigate to="/leads" replace />
  return render(lead)
}
