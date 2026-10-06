import { useState } from 'react'
import { Check, Copy, MessageCircle, MessageSquare, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button, SegmentedControl } from '../../ui'
import { useT } from '../../i18n/useT'
import { isAndroid, useWaBusiness } from '../../hooks/useWaBusiness'
import { useMyScript, writeMyScript } from '../../hooks/useMyScript'
import { getSmsUrl, getWhatsAppUrl } from './links'
import { SMS_PROMO_SCRIPT, WHATSAPP_PROMO_SCRIPT } from './scripts'
import ScriptDialog from './ScriptDialog'

function copy(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

/**
 * MessagePanel — WhatsApp or SMS, with the promo script or the agent's own.
 * Sending marks the lead "WhatsApp Sent" or "SMS Sent", as it always has.
 */
export default function MessagePanel({ lead, userEmail, onStatusChange }) {
  const t = useT()
  const [channel, setChannel] = useState('wa')
  // The same saved scripts Settings edits.
  const scripts = { wa: useMyScript('wa', userEmail), sms: useMyScript('sms', userEmail) }
  const business = useWaBusiness(userEmail)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)

  const isWa = channel === 'wa'
  const promo = isWa ? WHATSAPP_PROMO_SCRIPT : SMS_PROMO_SCRIPT
  const mine = scripts[channel] || promo
  const status = isWa ? 'WhatsApp Sent' : 'SMS Sent'
  const urlFor = (text) => (isWa ? getWhatsAppUrl(lead.phone_number, text, business) : getSmsUrl(lead.phone_number, text))
  const linkProps = isWa ? { target: '_blank', rel: 'noreferrer' } : {}

  function saveScript(text) {
    writeMyScript(channel, userEmail, text)
    setEditing(false)
    toast.success(t('lead.scriptSaved'))
  }

  async function copyPromo() {
    await copy(promo)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <SegmentedControl
        label={t('lead.message')}
        value={channel}
        onChange={setChannel}
        options={[
          { value: 'wa', label: t('lead.whatsapp') },
          { value: 'sms', label: t('lead.sms') },
        ]}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          as="a"
          href={urlFor(promo)}
          {...linkProps}
          onClick={() => onStatusChange(lead.id, status)}
          icon={isWa ? MessageCircle : MessageSquare}
          size="lg"
        >
          {t('lead.sendPromo')}
        </Button>
        <Button
          as="a"
          href={urlFor(mine)}
          {...linkProps}
          onClick={() => onStatusChange(lead.id, status)}
          variant="secondary"
          size="lg"
        >
          {t('lead.sendMine')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={copyPromo}>
          {copied ? t('lead.copied') : t('lead.copyPromo')}
        </Button>
        <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
          {t('lead.editMine')}
        </Button>
      </div>
      {!scripts[channel] && <p className="text-xs text-fg-subtle">{t('lead.mineEmpty')}</p>}
      {isWa && isAndroid() && (
        <p className="text-xs text-fg-subtle">
          {t('lead.waOpensIn', { app: business ? t('profile.waBusiness') : t('profile.waPersonal') })}
        </p>
      )}

      <ScriptDialog
        open={editing}
        onOpenChange={setEditing}
        title={isWa ? t('lead.scriptTitleWa') : t('lead.scriptTitleSms')}
        description={t('lead.scriptHint')}
        value={scripts[channel]}
        placeholder={t('lead.scriptPlaceholder')}
        onSave={saveScript}
      />
    </div>
  )
}
