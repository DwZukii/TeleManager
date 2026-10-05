import { Stat, StatGroup } from '../../ui'
import { useT } from '../../i18n/useT'

const SETS = ['Set A', 'Set B', 'Set C']

/** PoolSummary — your unassigned numbers per set, shown once above the cards. */
export default function PoolSummary({ unassignedCounts }) {
  const t = useT()
  return (
    <section aria-label={t('pool.title')} className="space-y-2">
      <h2 className="text-sm text-fg-muted">{t('pool.title')}</h2>
      <StatGroup>
        {SETS.map((set) => (
          <Stat key={set} label={set} value={(unassignedCounts[set] || 0).toLocaleString()} />
        ))}
      </StatGroup>
    </section>
  )
}
