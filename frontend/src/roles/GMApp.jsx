import { Suspense, lazy, useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { BarChart3, Settings, Users } from 'lucide-react'
import { useGMData } from '../hooks/useGMData'
import { PageSkeleton } from '../ui'
import { useT } from '../i18n/useT'
import AppShell from '../shell/AppShell'
import StaffContactDialog from '../shell/StaffContactDialog'

const PerformancePage = lazy(() => import('./shared/performance/PerformancePage'))
const GMTeamPage = lazy(() => import('./gm/GMTeamPage'))
const SettingsPage = lazy(() => import('./shared/SettingsPage'))

const NONE = []

export default function GMApp({ userEmail, userRole, onLogout }) {
  const t = useT()
  const { data } = useGMData(userEmail)
  const [contact, setContact] = useState(null)
  const managersList = data?.managersList ?? NONE
  const agentsList = data?.agentsList ?? NONE
  const managerStats = data?.managerStats ?? NONE
  const agentStats = data?.agentStats ?? NONE
  const managerNames = useMemo(() => new Map(managersList.map((m) => [m.email, m.full_name || m.email])), [managersList])

  const nav = [
    {
      items: [
        { to: '/performance', label: t('nav.performance'), icon: BarChart3 },
        { to: '/team', label: t('nav.team'), icon: Users },
      ],
    },
    { items: [{ to: '/settings', label: t('nav.settings'), icon: Settings }] },
  ]

  return (
    <AppShell nav={nav} userEmail={userEmail} userRole={userRole} onLogout={onLogout}>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route
            path="/performance"
            element={
              <PerformancePage
                description={t('perf.descGm')}
                agentStats={agentStats}
                managerStats={managerStats}
                managerNames={managerNames}
                showManagerCol
              />
            }
          />
          <Route path="/team" element={<GMTeamPage managersList={managersList} agentsList={agentsList} onViewContact={setContact} />} />
          {/* General managers had no "report a problem" entry before; that stays. */}
          <Route
            path="/settings"
            element={<SettingsPage userEmail={userEmail} userRole={userRole} onLogout={onLogout} canReport={false} />}
          />
          <Route path="*" element={<Navigate to="/performance" replace />} />
        </Routes>
      </Suspense>
      <StaffContactDialog person={contact} onClose={() => setContact(null)} />
    </AppShell>
  )
}
