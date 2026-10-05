import { parseDobFromIC } from '../../utils'

// Older rows used lower-case statuses before the pipeline was reworked. The
// counts below keep treating them the way the old overview did.
const ACTIVE = new Set(['New', 'Process', 'Pending', 'active', 'contacted', 'applied'])
const DONE = new Set(['Disbursed', 'Approved', 'closed'])

export const isActiveCase = (c) => ACTIVE.has(c.status)
export const isDoneCase = (c) => DONE.has(c.status)

/**
 * Birthday within the next 7 days, or null. Uses the stored date of birth,
 * or reads it from the IC number when there is none.
 */
export function getBirthdayInfo(dobString, icNumber) {
  const actualDob = dobString || parseDobFromIC(icNumber)
  if (!actualDob) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dob = new Date(actualDob + 'T00:00:00')
  if (Number.isNaN(dob.getTime())) return null

  const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)

  const diffDays = Math.round((next - today) / 86_400_000)
  if (diffDays < 0 || diffDays > 7) return null
  return { diffDays, turningAge: next.getFullYear() - dob.getFullYear(), nextDate: next }
}

/** Every query that holds customer rows, so a change shows everywhere. */
export const CUSTOMER_QUERY_KEYS = [['pipelineData'], ['adminPipelineData'], ['managerPipelineData']]
