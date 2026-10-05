import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Globe, Search, Trash2, X, AlertTriangle, ExternalLink, Save, Inbox } from 'lucide-react'
import { supabase } from '../../supabase'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatPhone } from '../../utils'
import { useWebLeadsData } from '../../hooks/useWebLeadsData'

const STATUSES = ['New', 'Contacted', 'Qualified', 'Converted', 'Junk']

// Only the two statuses worth a headline number; the rest stay in the dropdown.
const SUMMARY_STATUSES = ['New', 'Contacted']

const STATUS_STYLE = {
  New:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  Contacted: 'bg-blue-50 text-blue-700 border-blue-200',
  Qualified: 'bg-violet-50 text-violet-700 border-violet-200',
  Converted: 'bg-teal-50 text-teal-700 border-teal-200',
  Junk:      'bg-slate-100 text-slate-500 border-slate-200',
}

const money = (v) =>
  v == null || v === '' ? '—' : `RM ${Number(v).toLocaleString('en-MY', { maximumFractionDigits: 0 })}`

function relativeTime(iso) {
  if (!iso) return '—'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * AdminWebLeadsTab — inbound enquiries captured by the FZS landing page form.
 *
 * Deliberately styled apart from the indigo cold-call pool screens (emerald
 * accent, "inbound" language) so the two pools are never confused. These rows
 * live in `web_leads`, are never assigned to agents, and never enter `leads`.
 * RLS restricts the table to super_admin; the nav guard is UX only.
 */
export default function AdminWebLeadsTab({ confirm }) {
  const queryClient = useQueryClient()
  const { data: leads = [], isLoading, isError } = useWebLeadsData('super_admin')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [detailLead, setDetailLead] = useState(null)

  const counts = useMemo(() => {
    const c = { total: leads.length }
    STATUSES.forEach(s => { c[s] = leads.filter(l => l.status === s).length })
    return c
  }, [leads])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter(l => {
      const matchStatus = statusFilter === 'All' || l.status === statusFilter
      const matchSearch = !q ||
        (l.full_name || '').toLowerCase().includes(q) ||
        (l.phone_number || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.employer_name || '').toLowerCase().includes(q) ||
        (l.utm_campaign || '').toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [leads, search, statusFilter])

  const patchLead = async (id, patch) => {
    queryClient.setQueryData(['webLeads'], (old) =>
      (old || []).map(l => (l.id === id ? { ...l, ...patch } : l))
    )
    const { error } = await supabase.from('web_leads').update(patch).eq('id', id)
    if (error) {
      toast.error(`Update failed: ${error.message}`)
      queryClient.invalidateQueries({ queryKey: ['webLeads'] })
      return false
    }
    return true
  }

  const handleDelete = async (lead) => {
    if (!(await confirm(`Delete the enquiry from ${lead.full_name}? This cannot be undone.`))) return
    queryClient.setQueryData(['webLeads'], (old) => (old || []).filter(l => l.id !== lead.id))
    const { error } = await supabase.from('web_leads').delete().eq('id', lead.id)
    if (error) {
      toast.error(`Delete failed: ${error.message}`)
      queryClient.invalidateQueries({ queryKey: ['webLeads'] })
    } else {
      toast.success('Enquiry deleted.')
      setDetailLead(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header + stats + filters ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 sm:px-8 py-5 flex items-center gap-4">
          <span className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
            <Globe className="w-6 h-6 text-white" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-white">Web Leads · Landing Page</h2>
            <p className="text-emerald-100/90 text-xs sm:text-sm font-medium mt-0.5">
              Inbound enquiries from the FZS landing page — not cold-call records, and never assigned to agents.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <div className="p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">{counts.total}</p>
          </div>
          {SUMMARY_STATUSES.map(s => (
            <div key={s} className="p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{s}</p>
              <p className={`text-2xl font-black mt-0.5 ${s === 'New' ? 'text-emerald-600' : 'text-slate-800'}`}>{counts[s]}</p>
            </div>
          ))}
        </div>

        <div className="p-4 sm:px-6 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, employer, campaign..."
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-md text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">✕</button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full sm:w-48 p-2 border border-slate-200 rounded-md text-sm font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ── List ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-16 text-center text-slate-400 font-medium">Loading enquiries...</div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 font-bold text-sm">Could not load web leads.</p>
          <p className="text-red-500 text-xs mt-1">This section is restricted to super admins.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-lg p-16 text-center">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-500">{leads.length === 0 ? 'No enquiries yet.' : 'No enquiries match your filters.'}</p>
          {leads.length === 0 && <p className="text-sm text-slate-400 mt-1">Submissions from the landing page form will appear here.</p>}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">

          {/* Mobile cards */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filtered.map(l => (
              <div key={l.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => setDetailLead(l)} className="min-w-0 text-left">
                    <p className="font-bold text-slate-900 text-sm truncate">{l.full_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatPhone(l.phone_number)}</p>
                  </button>
                  <span className="text-[11px] text-slate-400 font-medium flex-shrink-0">{relativeTime(l.created_at)}</span>
                </div>
                {l.employer_name && <p className="text-xs text-slate-600 font-medium truncate">{l.employer_name}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  {l.already_in_pool && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                      <AlertTriangle className="w-3 h-3" /> In cold pool
                    </span>
                  )}
                  {l.deduction_type && (
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      {l.deduction_type === 'bpa' ? 'BPA/Angkasa' : 'Potongan Terus'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={l.status}
                    onChange={e => patchLead(l.id, { status: e.target.value })}
                    className={`flex-1 p-2 border rounded-md text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${STATUS_STYLE[l.status] || ''}`}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <a
                    href={`https://wa.me/${l.phone_number}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-emerald-600 text-white rounded-md text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Received', 'Enquirer', 'Employer', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 font-medium whitespace-nowrap">{relativeTime(l.created_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setDetailLead(l)} className="text-left group">
                        <span className="block text-sm font-bold text-slate-900 whitespace-nowrap group-hover:text-emerald-700 transition-colors">{l.full_name}</span>
                        <span className="block text-xs text-slate-500 whitespace-nowrap">{formatPhone(l.phone_number)}</span>
                      </button>
                      {l.already_in_pool && (
                        <span className="inline-flex items-center gap-1 mt-1 bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                          <AlertTriangle className="w-3 h-3" /> In cold pool
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium max-w-[180px] truncate">{l.employer_name || '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={l.status}
                        onChange={e => patchLead(l.id, { status: e.target.value })}
                        className={`p-1.5 border rounded-md text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${STATUS_STYLE[l.status] || ''}`}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`https://wa.me/${l.phone_number}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open WhatsApp"
                          className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-100 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(l)}
                          title="Delete enquiry"
                          className="p-1.5 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailLead && (
        <WebLeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onSave={patchLead}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

// ─── Detail / notes modal ─────────────────────────────────────────────────────
function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-0.5 break-words">{value == null || value === '' ? '—' : value}</p>
    </div>
  )
}

function WebLeadDetailModal({ lead, onClose, onSave, onDelete }) {
  const [handledBy, setHandledBy] = useState(lead.handled_by || '')
  const [notes, setNotes] = useState(lead.admin_notes || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    const ok = await onSave(lead.id, { handled_by: handledBy.trim() || null, admin_notes: notes })
    setIsSaving(false)
    if (ok) {
      toast.success('Enquiry updated.')
      onClose()
    }
  }

  const hasCalculator = lead.gross_salary != null || lead.estimated_low != null

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative z-10 animate-in slide-in-from-bottom-4 duration-300 border border-slate-200">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-white truncate">{lead.full_name}</h3>
            <p className="text-emerald-100 text-xs font-medium mt-0.5">
              Landing page enquiry · {relativeTime(lead.created_at)}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {lead.already_in_pool && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-amber-800">
                This number already exists in the cold-call pool. Worth checking before calling, so the same person is not contacted twice.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <DetailRow label="Phone" value={formatPhone(lead.phone_number)} />
            <DetailRow label="Email" value={lead.email} />
            <DetailRow label="Employer" value={lead.employer_name} />
            <DetailRow label="Age" value={lead.age} />
            <DetailRow label="Location" value={lead.location === 'luarBandar' ? 'Luar Bandar' : lead.location === 'bandar' ? 'Bandar' : null} />
            <DetailRow label="Language" value={lead.lang === 'en' ? 'English' : 'Bahasa Melayu'} />
          </div>

          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-bold text-slate-700 mb-3">Calculator inputs</p>
            {!hasCalculator ? (
              <p className="text-sm text-slate-400 italic">The visitor submitted without using the calculator.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <DetailRow label="Gross salary" value={money(lead.gross_salary)} />
                <DetailRow label="Existing commitment" value={money(lead.existing_commitment)} />
                <DetailRow label="Deduction" value={lead.deduction_type === 'bpa' ? 'BPA / Angkasa' : lead.deduction_type === 'direct' ? 'Potongan Terus' : null} />
                <DetailRow label="Tenure" value={lead.tenure_years ? `${lead.tenure_years} years` : null} />
                <DetailRow label="Affordable installment" value={money(lead.affordable_installment)} />
                <DetailRow label="Estimated range" value={`${money(lead.estimated_low)} – ${money(lead.estimated_high)}`} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-5">
            <p className="text-xs font-bold text-slate-700 mb-3">Attribution</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DetailRow label="Source" value={lead.utm_source} />
              <DetailRow label="Medium" value={lead.utm_medium} />
              <DetailRow label="Campaign" value={lead.utm_campaign} />
              <DetailRow label="Content" value={lead.utm_content} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Handled by</label>
              <input
                type="text"
                value={handledBy}
                onChange={e => setHandledBy(e.target.value)}
                placeholder="Who is following this up?"
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Admin notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                placeholder="Call outcome, follow-up date, anything worth remembering..."
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-base sm:text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={() => onDelete(lead)}
            className="px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${lead.phone_number}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-bold hover:bg-emerald-700 transition-colors"
            >
              WhatsApp
            </a>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
