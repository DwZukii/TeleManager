import { Check, MessageCircle, MessageSquare, Phone, PhoneMissed, PhoneOff, X } from 'lucide-react'

// One place that decides how every status looks. Colour carries the outcome;
// the icon carries the channel. Values are the strings stored in the database.

export const LEAD_STATUSES = [
  'Pending',
  'Called',
  'WhatsApp Sent',
  'SMS Sent',
  'Accepted',
  'Rejected',
  'Invalid Number',
]

export const CUSTOMER_STATUSES = ['New', 'Process', 'Pending', 'Approved', 'Disbursed', 'Rejected']

// Qualified is no longer offered, but old rows that hold it still display.
export const WEB_LEAD_STATUSES = ['New', 'Contacted', 'Converted', 'Junk']

const META = {
  lead: {
    Pending: { tone: 'neutral' },
    Called: { tone: 'info', icon: Phone },
    'Called (No Answer)': { tone: 'info', icon: PhoneMissed },
    'WhatsApp Sent': { tone: 'info', icon: MessageCircle },
    'SMS Sent': { tone: 'info', icon: MessageSquare },
    Accepted: { tone: 'success', icon: Check },
    Rejected: { tone: 'danger', icon: X },
    'Invalid Number': { tone: 'neutral', icon: PhoneOff },
  },
  customer: {
    New: { tone: 'neutral' },
    Process: { tone: 'info' },
    Pending: { tone: 'warning' },
    Approved: { tone: 'success' },
    Disbursed: { tone: 'solid', icon: Check },
    Rejected: { tone: 'danger' },
  },
  webLead: {
    New: { tone: 'accent' },
    Contacted: { tone: 'info' },
    Qualified: { tone: 'success' },
    Converted: { tone: 'solid', icon: Check },
    Junk: { tone: 'neutral' },
  },
}

// Retired values still present on a handful of old rows. They display as the
// status that replaced them.
const ALIASES = {
  lead: { Thinking: 'SMS Sent' },
}

/**
 * @param {'lead'|'customer'|'webLead'} kind
 * @param {string} status  the stored value
 * @returns {{ canonical: string, tone: string, icon: Function|null }}
 */
export function getStatusMeta(kind, status) {
  const canonical = ALIASES[kind]?.[status] ?? status
  const meta = META[kind]?.[canonical]
  return { canonical, tone: meta?.tone ?? 'neutral', icon: meta?.icon ?? null }
}
