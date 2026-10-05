import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { BarChart3, Users } from 'lucide-react'
import { useGMData } from '../hooks/useGMData'
import { PageSkeleton } from '../ui'
import { useT } from '../i18n/useT'
import AppShell from '../shell/AppShell'

const GMPerformance = lazy(() => import('./gm/GMPerformance'))
const GMTeam = lazy(() => import('./gm/GMTeam'))

export default function GMApp({ userEmail, userRole, onLogout }) {
  const t = useT()
  const { data } = useGMData(userEmail)
  const managersList = data?.managersList || []
  const agentsList = data?.agentsList || []
  const managerStats = data?.managerStats || []
  const agentStats = data?.agentStats || []

  const nav = [
    {
      items: [
        { to: '/performance', label: t('nav.performance'), icon: BarChart3 },
        { to: '/team', label: t('nav.team'), icon: Users },
      ],
    },
  ]

  // General managers had no "report a problem" entry before; that stays.
  return (
    <AppShell nav={nav} userEmail={userEmail} userRole={userRole} onLogout={onLogout} canReport={false}>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route
            path="/performance"
            element={<GMPerformance agentStats={agentStats} managerStats={managerStats} agentsList={agentsList} />}
          />
          <Route path="/team" element={<GMTeam managersList={managersList} agentsList={agentsList} />} />
          <Route path="*" element={<Navigate to="/performance" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}
