import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bell, ClipboardList, Phone, Settings } from 'lucide-react'
import { supabase } from '../supabase'
import { useStaffData } from '../hooks/useStaffData'
import { usePipelineData } from '../hooks/usePipelineData'
import { useConfirm } from '../hooks/useConfirm'
import { useUndoToast } from '../hooks/useUndoToast'
import { PageSkeleton, getStatusMeta } from '../ui'
import { useT } from '../i18n/useT'
import AppShell from '../shell/AppShell'
import { inCallingPilot } from '../config'
import { hasSeenTour, markTourSeen } from '../hooks/agentTour'

const OwnCustomers = lazy(() => import('./customers/CustomersSection').then((m) => ({ default: m.OwnCustomers })))
const StaffLeadsPage = lazy(() => import('./staff/StaffLeadsPage'))
const LeadPanel = lazy(() => import('./staff/StaffLeadPage'))
const StaffAlertsPage = lazy(() => import('./staff/StaffAlertsPage'))
const CallingSession = lazy(() => import('./staff/CallingSession'))
const SettingsPage = lazy(() => import('./shared/SettingsPage'))
const AgentTour = lazy(() => import('./staff/AgentTour'))

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

/**
 * `ready` is false while the sign-in prompt for a name and number is up; the
 * tour waits for it.
 */
export default function StaffApp({ userEmail, onLogout, ready = true }) {
  const t = useT()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: staffData = EMPTY, isLoading, isError } = useStaffData(userEmail)
  const { data: pipelineCustomers = [] } = usePipelineData(userEmail)
  const { confirm, ConfirmDialog } = useConfirm()
  const showUndo = useUndoToast()

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

  const setLeadStatus = (id, status) =>
    queryClient.setQueryData(['staffData', userEmail], (oldData) => {
      if (!oldData) return { leads: [], staffNotifications: [] }
      return { ...oldData, leads: oldData.leads.map((lead) => (lead.id === id ? { ...lead, status } : lead)) }
    })

  // Every status change, including Call, WhatsApp and SMS, writes the same as
  // before. Picking a status by hand also offers Undo, which puts back the
  // old status and review flags exactly.
  const handleStatusChange = async (id, newStatus, { undoable = false } = {}) => {
    const before = leads.find((lead) => lead.id === id)
    setLeadStatus(id, newStatus)
    const { error } = await supabase.from('leads').update({ status: newStatus, admin_reviewed: false, manager_reviewed: false }).eq('id', id)
    if (error) {
      if (before) setLeadStatus(id, before.status)
      toast.error(t('undo.statusFailed', { error: error.message }))
      return
    }
    if (!undoable || !before || before.status === newStatus) return
    showUndo(
      t('undo.leadStatus', { status: t(`status.lead.${getStatusMeta('lead', newStatus).canonical}`, null, newStatus) }),
      async () => {
        setLeadStatus(id, before.status)
        const result = await supabase
          .from('leads')
          .update({ status: before.status, admin_reviewed: before.admin_reviewed, manager_reviewed: before.manager_reviewed })
          .eq('id', id)
        if (result.error) setLeadStatus(id, newStatus)
        return result
      },
      { id: 'lead-status' }
    )
  }

  // The tour starts by itself once on this device for an agent who hasn't
  // worked a number yet, on the leads page, after the sign-in prompt. Settings
  // can start it again at any time.
  // 'off', 'asked' (from Settings, waiting for the leads page) or 'on'.
  const [tour, setTour] = useState('off')
  const onLeads = location.pathname === '/leads'
  // Numbers that failed to load look like none at all, so only a list that
  // loaded counts as new.
  const fresh = useMemo(
    () => !isLoading && !isError && leads.every((lead) => getStatusMeta('lead', lead.status).canonical === 'Pending'),
    [isLoading, isError, leads]
  )
  useEffect(() => {
    if (!ready || tour !== 'off' || !onLeads || !fresh || hasSeenTour(userEmail)) return undefined
    const timer = setTimeout(() => {
      markTourSeen(userEmail)
      setTour('on')
    }, 800)
    return () => clearTimeout(timer)
  }, [ready, tour, onLeads, fresh, userEmail])

  // The tour runs on the leads page only: it begins once the page is showing,
  // and leaving the page (the phone's back button, say) ends it.
  if (tour === 'asked' && onLeads) setTour('on')
  if (tour === 'on' && !onLeads) setTour('off')

  function startTour() {
    markTourSeen(userEmail)
    setStatusFilter('All')
    setSearchQuery('')
    setCurrentPage(1)
    setTour('asked')
    navigate('/leads')
  }

  const legacy = legacyRedirect(location.search)
  if (legacy) return <Navigate to={legacy} replace />

  const nav = [
    {
      items: [
        { to: '/leads', label: t('nav.leads'), icon: Phone, tour: 'nav-leads' },
        { to: '/customers', label: t('nav.customers'), icon: ClipboardList, tour: 'nav-customers' },
        { to: '/alerts', label: t('nav.alerts'), icon: Bell, count: totalNotifCount, tour: 'nav-alerts' },
        // Three bottom tabs is enough on a phone; Settings opens from the profile button there.
        { to: '/settings', label: t('nav.settings'), icon: Settings, tab: false, tour: 'nav-settings' },
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
              path="/leads/*"
              element={
                <>
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
                  {/* A lead opens over the list, which stays mounted underneath. */}
                  <Suspense fallback={null}>
                    <Routes>
                      <Route
                        path=":leadId"
                        element={
                          <LeadPanel leads={leads} userEmail={userEmail} onStatusChange={handleStatusChange} confirm={confirm} />
                        }
                      />
                    </Routes>
                  </Suspense>
                </>
              }
            />
            {inCallingPilot(userEmail) && (
              <Route
                path="/leads/calling"
                element={<CallingSession leads={leads} userEmail={userEmail} onStatusChange={handleStatusChange} />}
              />
            )}
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
            <Route
              path="/settings"
              element={<SettingsPage userEmail={userEmail} userRole="agent" onLogout={onLogout} onStartTour={startTour} />}
            />
            <Route path="*" element={<Navigate to="/leads" replace />} />
          </Routes>
          {tour === 'on' && onLeads && (
            <Suspense fallback={null}>
              <AgentTour userEmail={userEmail} onClose={() => setTour('off')} />
            </Suspense>
          )}
        </Suspense>
      )}
    </AppShell>
  )
}
