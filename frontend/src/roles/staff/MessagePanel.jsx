import { useState } from 'react'
import { Check, Copy, MessageCircle, MessageSquare, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button, SegmentedControl, getStatusMeta } from '../../ui'
import { useT } from '../../i18n/useT'
import { isAndroid, useWaBusiness } from '../../hooks/useWaBusiness'
import { useMyScript, useSaveScript, useStandardScript } from '../../hooks/useMyScript'
import { getSmsUrl, getWhatsAppUrl } from './links'
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
  // The company's promo scripts, as an admin last set them.
  const promos = { wa: useStandardScript('wa', userEmail), sms: useStandardScript('sms', userEmail) }
  const saveScript = useSaveScript()
  const business = useWaBusiness(userEmail)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)

  const isWa = channel === 'wa'
  const promo = promos[channel]
  const mine = scripts[channel] || promo
  const status = isWa ? 'WhatsApp Sent' : 'SMS Sent'
  // The send button takes the colour of the status it sets.
  const tone = getStatusMeta('lead', status).tone
  const urlFor = (text) => (isWa ? getWhatsAppUrl(lead.phone_number, text, business) : getSmsUrl(lead.phone_number, text))
  const linkProps = isWa ? { target: '_blank', rel: 'noreferrer' } : {}

  async function saveMine(text) {
    try {
      await saveScript(userEmail, channel, text)
    } catch (error) {
      toast.error(t('lead.scriptFailed', { error: error.message }))
      throw error
    }
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
        data-tour="lead-channel"
        label={t('lead.message')}
        value={channel}
        onChange={setChannel}
        options={[
          { value: 'wa', label: t('lead.whatsapp'), tone: getStatusMeta('lead', 'WhatsApp Sent').tone },
          { value: 'sms', label: t('lead.sms'), tone: getStatusMeta('lead', 'SMS Sent').tone },
        ]}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          as="a"
          href={urlFor(promo)}
          {...linkProps}
          onClick={() => onStatusChange(lead.id, status)}
          icon={isWa ? MessageCircle : MessageSquare}
          tone={tone}
          size="lg"
          data-tour="lead-promo"
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
          data-tour="lead-mine"
        >
          {t('lead.sendMine')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={copyPromo}>
          {copied ? t('lead.copied') : t('lead.copyPromo')}
        </Button>
        <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(true)} data-tour="lead-edit-script">
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
        onSave={saveMine}
      />
    </div>
  )
}
