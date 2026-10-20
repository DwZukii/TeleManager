import { useMemo, useState } from 'react'
import { Tour } from '../../ui'
import { useT } from '../../i18n/useT'
import { PracticeLeadPanel } from './StaffLeadPage'

// The walk through an agent's day, on the leads page. `target` names the
// data-tour mark of what each step points at; `lead` steps happen inside the
// practice number, which the tour opens and closes by itself.
const STEPS = [
  { id: 'welcome' },
  { id: 'leads', target: 'nav-leads' },
  { id: 'counters', target: 'counters' },
  { id: 'filter', target: ['filter', 'search'], union: true },
  { id: 'call', target: 'row-call' },
  { id: 'details', target: 'row-details' },
  { id: 'status', target: 'lead-status', lead: true },
  { id: 'channel', target: 'lead-channel', lead: true },
  { id: 'promo', target: 'lead-promo', lead: true },
  { id: 'mine', target: 'lead-mine', lead: true },
  { id: 'editScript', target: 'lead-edit-script', lead: true },
  { id: 'notes', target: 'lead-notes', lead: true },
  { id: 'document', target: 'lead-document', lead: true },
  { id: 'close', target: 'dialog-close', lead: true },
  { id: 'customers', target: 'nav-customers' },
  { id: 'alerts', target: 'nav-alerts' },
  // Settings is in the sidebar on a computer, behind the profile button on a phone.
  { id: 'settings', target: ['nav-settings', 'profile'] },
]

/**
 * AgentTour — the guided tour of the agent's screens. It only points and
 * explains: nothing underneath can be pressed while it is open, and the
 * number it opens is a practice one that saves nothing.
 */
export default function AgentTour({ userEmail, onClose }) {
  const t = useT()
  const [step, setStep] = useState(0)
  const steps = useMemo(
    () => STEPS.map((s) => ({ ...s, title: t(`tour.${s.id}.title`), body: t(`tour.${s.id}.body`) })),
    [t]
  )

  return (
    <>
      <PracticeLeadPanel open={Boolean(STEPS[step].lead)} userEmail={userEmail} />
      <Tour open steps={steps} step={step} onStepChange={setStep} onClose={onClose} label={t('tour.label')} />
    </>
  )
}
