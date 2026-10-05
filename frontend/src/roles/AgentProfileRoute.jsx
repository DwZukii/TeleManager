import { useNavigate, useParams } from 'react-router'
import { Banner, Button, PageSkeleton } from '../ui'
import { useT } from '../i18n/useT'

/**
 * AgentProfileRoute — resolves /performance/:email to an agent from the stats
 * the dashboard already holds, then renders the role's profile screen.
 */
export default function AgentProfileRoute({ agentStats, loading, backTo = '/performance', render }) {
  const t = useT()
  const navigate = useNavigate()
  const { email } = useParams()
  const agent = agentStats.find((a) => a.email === decodeURIComponent(email))
  const back = () => navigate(backTo)

  if (!agent) {
    if (loading) return <PageSkeleton />
    return (
      <div className="space-y-4">
        <Banner tone="warning">{t('agent.notFound')}</Banner>
        <Button variant="secondary" onClick={back}>
          {t('common.back')}
        </Button>
      </div>
    )
  }
  return render(agent, back)
}
