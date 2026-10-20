import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, FileText, Paperclip, Phone, Trash2 } from 'lucide-react'
import { supabase } from '../../supabase'
import { Badge, Button, Card, CardBody, CardHeader, Dialog, Field, StatusBadge, Textarea } from '../../ui'
import { useT } from '../../i18n/useT'
import { formatPhone } from '../../utils'
import { getCallUrl } from './links'
import LeadStatusSelect from './LeadStatusSelect'
import MessagePanel from './MessagePanel'

const MAX_BYTES = 2 * 1024 * 1024

// A made-up number for the tour. Nothing done to it is ever saved.
const PRACTICE_LEAD = { id: 'practice', phone_number: '60123456789', status: 'Pending', agent_notes: '', document_url: null }
const nothing = () => {}

/** Updates one lead in the agent's cached list without a refetch. */
function usePatchLead(userEmail) {
  const queryClient = useQueryClient()
  return (id, patch) =>
    queryClient.setQueryData(['staffData', userEmail], (old) => {
      if (!old) return { leads: [], staffNotifications: [] }
      return { ...old, leads: old.leads.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)) }
    })
}

/**
 * LeadPanel — one number, opened over the agent's list at /leads/:leadId:
 * a sheet from the bottom on phones, a panel on the right from `sm` up. The
 * list stays mounted behind it, so its filter, rows and scroll are kept.
 */
export default function LeadPanel({ leads, userEmail, onStatusChange, confirm }) {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const lead = leads.find((l) => String(l.id) === leadId)
  if (!lead) return <Navigate to="/leads" replace />

  // Opened from the list: closing is the same as Back. Opened from a link or
  // a bookmark: closing goes to the list without leaving a step behind.
  const close = () => (location.state?.fromList ? navigate(-1) : navigate('/leads', { replace: true }))

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && close()}
      placement="side"
      title={<LeadTitle lead={lead} />}
      bodyClassName={BODY}
    >
      <LeadDetail key={lead.id} lead={lead} userEmail={userEmail} onStatusChange={onStatusChange} confirm={confirm} />
    </Dialog>
  )
}

const BODY = 'mt-2 space-y-4 border-t border-line bg-canvas py-4 sm:py-5'

function LeadTitle({ lead, practice = false }) {
  const t = useT()
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="text-xl tabular-nums">{formatPhone(lead.phone_number)}</span>
      <StatusBadge kind="lead" status={lead.status} />
      {practice && <Badge tone="accent">{t('tour.practice')}</Badge>}
    </span>
  )
}

/**
 * PracticeLeadPanel — the same panel with a made-up number, opened by the
 * tour while it explains each part. The tour keeps control of it, and nothing
 * in it saves: no status, note, file or message.
 */
export function PracticeLeadPanel({ open, userEmail }) {
  return (
    <Dialog open={open} onOpenChange={nothing} modal={false} placement="side" title={<LeadTitle lead={PRACTICE_LEAD} practice />} bodyClassName={BODY}>
      <LeadDetail lead={PRACTICE_LEAD} userEmail={userEmail} onStatusChange={nothing} confirm={nothing} practice />
    </Dialog>
  )
}

function LeadDetail({ lead, userEmail, onStatusChange, confirm, practice = false }) {
  const t = useT()
  return (
    <>
      <Card data-tour="lead-status">
        <CardBody className="space-y-4">
          <Field label={t('lead.statusLabel')}>
            <LeadStatusSelect size="md" value={lead.status} onChange={(status) => onStatusChange(lead.id, status, { undoable: true })} />
          </Field>
          <Button
            as="a"
            href={getCallUrl(lead.phone_number)}
            onClick={() => onStatusChange(lead.id, 'Called')}
            icon={Phone}
            size="lg"
            fullWidth
            data-autofocus=""
          >
            {t('leads.call')}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('lead.message')} />
        <CardBody>
          <MessagePanel lead={lead} userEmail={userEmail} onStatusChange={onStatusChange} />
        </CardBody>
      </Card>

      <NotesCard lead={lead} userEmail={userEmail} practice={practice} />
      <DocumentCard lead={lead} userEmail={userEmail} confirm={confirm} practice={practice} />
    </>
  )
}

/**
 * NotesCard — the agent's notes on this number. Saves on its own when the box
 * loses focus, when the page is left, or when the agent switches to another
 * app, but only if the text changed: every save puts the lead back in the
 * admin and manager review queue, as the Save button always did.
 */
function NotesCard({ lead, userEmail, practice }) {
  const t = useT()
  const patchLead = usePatchLead(userEmail)
  const [note, setNote] = useState(lead.agent_notes || '')
  const [state, setState] = useState({ status: 'idle' }) // idle | saving | saved | error
  const noteRef = useRef(note)
  const savedRef = useRef(lead.agent_notes || '')
  const queue = useRef(Promise.resolve())

  // Saves run one after another, so an older text can never land last.
  const save = () => {
    queue.current = queue.current.then(async () => {
      const text = noteRef.current
      if (practice || text === savedRef.current) return
      setState({ status: 'saving' })
      const { error } = await supabase
        .from('leads')
        .update({ agent_notes: text, admin_reviewed: false, manager_reviewed: false })
        .eq('id', lead.id)
      if (error) {
        setState({ status: 'error' })
        toast.error(t('lead.noteFailed', { error: error.message }))
        return
      }
      savedRef.current = text
      patchLead(lead.id, { agent_notes: text })
      setState({ status: noteRef.current === text ? 'saved' : 'idle' })
    })
    return queue.current
  }

  // Leaving the page or switching to WhatsApp or the dialer saves too.
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && saveRef.current()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      saveRef.current()
    }
  }, [])

  return (
    <Card data-tour="lead-notes">
      <CardHeader title={t('lead.notes')} />
      <CardBody className="space-y-2">
        <Textarea
          aria-label={t('lead.notes')}
          aria-describedby={`note-status-${lead.id}`}
          rows={5}
          value={note}
          onChange={(e) => {
            noteRef.current = e.target.value
            setNote(e.target.value)
            if (state.status === 'saved') setState({ status: 'idle' })
          }}
          onBlur={save}
          placeholder={t('lead.notesPlaceholder')}
        />
        <p id={`note-status-${lead.id}`} aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-xs text-fg-subtle">
          {state.status === 'saving' && t('lead.noteSaving')}
          {state.status === 'saved' && (
            <>
              <Check className="size-3.5 text-success" aria-hidden="true" />
              {t('lead.noteSaved')}
            </>
          )}
          {state.status === 'error' && (
            <span className="text-danger">
              {t('lead.noteNotSaved')}{' '}
              <button type="button" onClick={save} className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-brand">
                {t('lead.noteRetry')}
              </button>
            </span>
          )}
          {state.status === 'idle' && t('lead.noteAuto')}
        </p>
      </CardBody>
    </Card>
  )
}

function DocumentCard({ lead, userEmail, confirm, practice }) {
  const t = useT()
  const patchLead = usePatchLead(userEmail)
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)

  function choose(event) {
    const picked = event.target.files[0]
    if (!picked || practice) return
    if (picked.size > MAX_BYTES) {
      toast.warning(t('lead.tooLarge'))
      event.target.value = null
      return
    }
    setFile(picked)
  }

  async function upload() {
    if (!file || practice) return
    setBusy(true)
    const ext = file.name.split('.').pop()
    const fileName = `${lead.id}-${Math.random()}.${ext}`
    const { error } = await supabase.storage.from('documents').upload(fileName, file)
    if (error) {
      toast.error(t('lead.uploadFailed', { error: error.message }))
      setBusy(false)
      return
    }
    const { data } = supabase.storage.from('documents').getPublicUrl(fileName)
    await supabase
      .from('leads')
      .update({ document_url: data.publicUrl, admin_reviewed: false, manager_reviewed: false })
      .eq('id', lead.id)
    patchLead(lead.id, { document_url: data.publicUrl })
    setFile(null)
    if (inputRef.current) inputRef.current.value = null
    setBusy(false)
  }

  async function remove() {
    if (practice || !(await confirm(t('lead.removeConfirm')))) return
    setBusy(true)
    const fileName = lead.document_url.split('/').pop()
    await supabase.storage.from('documents').remove([fileName])
    await supabase.from('leads').update({ document_url: null, admin_reviewed: false, manager_reviewed: false }).eq('id', lead.id)
    patchLead(lead.id, { document_url: null })
    setBusy(false)
  }

  return (
    <Card data-tour="lead-document">
      <CardHeader title={t('lead.document')} description={t('lead.documentHint')} />
      <CardBody>
        {lead.document_url ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line px-3 py-2.5">
            <a
              href={lead.document_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-2 text-sm text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
            >
              <FileText className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t('lead.view')}</span>
            </a>
            <Button variant="dangerOutline" size="sm" icon={Trash2} loading={busy} onClick={remove}>
              {t('lead.remove')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              id={`lead-file-${lead.id}`}
              type="file"
              accept=".pdf, image/png, image/jpeg"
              aria-label={t('lead.chooseFile')}
              onChange={choose}
              disabled={busy}
              className="sr-only"
              tabIndex={-1}
            />
            <Button variant="secondary" icon={Paperclip} onClick={() => inputRef.current?.click()} disabled={busy}>
              {t('lead.chooseFile')}
            </Button>
            {file && <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">{file.name}</span>}
            {file && (
              <Button onClick={upload} loading={busy}>
                {t('lead.upload')}
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
