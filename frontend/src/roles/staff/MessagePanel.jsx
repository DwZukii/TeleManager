import { useState } from 'react'
import { Check, Copy, MessageCircle, MessageSquare, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Dialog, DialogClose, Field, SegmentedControl, Textarea } from '../../ui'
import { useT } from '../../i18n/useT'
import { isAndroid, useWaBusiness } from '../../hooks/useWaBusiness'
import { getSmsUrl, getWhatsAppUrl } from './links'
import { SMS_PROMO_SCRIPT, WHATSAPP_PROMO_SCRIPT } from './scripts'

// Same storage keys as before, so every agent keeps their saved scripts.
const key = {
  wa: (email) => `whatsapp_script_${email}`,
  sms: (email) => `sms_script_${email}`,
}

function read(name) {
  try {
    return localStorage.getItem(name)
  } catch {
    return null
  }
}

function write(name, value) {
  try {
    localStorage.setItem(name, value)
  } catch {
    // Private browsing: the choice lasts for this visit only.
  }
}

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
  const [scripts, setScripts] = useState(() => ({ wa: read(key.wa(userEmail)) || '', sms: read(key.sms(userEmail)) || '' }))
  const business = useWaBusiness(userEmail)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)

  const isWa = channel === 'wa'
  const promo = isWa ? WHATSAPP_PROMO_SCRIPT : SMS_PROMO_SCRIPT
  const mine = scripts[channel] || promo
  const status = isWa ? 'WhatsApp Sent' : 'SMS Sent'
  const urlFor = (text) => (isWa ? getWhatsAppUrl(lead.phone_number, text, business) : getSmsUrl(lead.phone_number, text))
  const linkProps = isWa ? { target: '_blank', rel: 'noreferrer' } : {}

  function openEditor() {
    setDraft(scripts[channel])
    setEditing(true)
  }

  function saveScript() {
    write(key[channel](userEmail), draft)
    setScripts((s) => ({ ...s, [channel]: draft }))
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
        <Button variant="ghost" size="sm" icon={Pencil} onClick={openEditor}>
          {t('lead.editMine')}
        </Button>
      </div>
      {!scripts[channel] && <p className="text-xs text-fg-subtle">{t('lead.mineEmpty')}</p>}
      {isWa && isAndroid() && (
        <p className="text-xs text-fg-subtle">
          {t('lead.waOpensIn', { app: business ? t('profile.waBusiness') : t('profile.waPersonal') })}
        </p>
      )}

      <Dialog
        open={editing}
        onOpenChange={setEditing}
        title={isWa ? t('lead.scriptTitleWa') : t('lead.scriptTitleSms')}
        description={t('lead.scriptHint')}
        footer={
          <>
            <DialogClose>
              <Button variant="secondary">{t('common.cancel')}</Button>
            </DialogClose>
            <Button onClick={saveScript}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="py-2">
          <Field label={isWa ? t('lead.scriptTitleWa') : t('lead.scriptTitleSms')}>
            <Textarea
              rows={8}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('lead.scriptPlaceholder')}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  )
}
