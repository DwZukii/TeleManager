import { useState, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase'
import DashboardSidebar, { MobileTopBar } from './DashboardSidebar'
import LazySpinner from './LazySpinner'
import { Bell, X, Target, BookOpen, BarChart3, ClipboardList, Bug, Lightbulb, MessageSquare, CheckCircle2, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useManagerData } from '../hooks/useManagerData'
import { useConfirm } from '../hooks/useConfirm'

// ── Eagerly-loaded sub-components (Default landing tab — Overview / Data Centre) ──
import ManagerCleanAdd from './manager/ManagerCleanAdd'
import ManagerDistributeTeam from './manager/ManagerDistributeTeam'

// ── Lazy-loaded secondary tabs & profile detail view ───────────────────────
const CustomerPipelineManagerPage = lazy(() => import('./pipeline/CustomerPipelineManagerPage'))
const ManagerTeamMatrixTab = lazy(() => import('./manager/ManagerTeamMatrixTab'))
const ManagerActivityHub = lazy(() => import('./manager/ManagerActivityHub'))
const ManagerDirectoryTab = lazy(() => import('./manager/ManagerDirectoryTab'))
const ManagerAgentProfile = lazy(() => import('./manager/ManagerAgentProfile'))

export default function ManagerDashboard({ userEmail, userRole, onLogout }) {
  const { data } = useManagerData(userEmail);
  const { confirm, ConfirmDialog } = useConfirm();

  const myTeamList = data?.myAgents || [];
  const myTeamEmails = data?.teamEmails || [];
  const unassignedCounts = data?.unassignedCounts || { 'Set A': 0, 'Set B': 0, 'Set C': 0 };
  const agentStats = data?.agentStats || [];
  const activeLeads = [...(data?.managerNotifications || []), ...(data?.activeLeads?.slice(0, 50) || [])]

  const [activeTab, setActiveTab] = useState('overview')
  const [selectedAgentProfile, setSelectedAgentProfile] = useState(null)

  // ── Feedback modal state ─────────────────────────────────────────────────
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('Bug')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)

  // ── Mobile drawer state ──────────────────────────────────────────────────
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [viewingStaffContact, setViewingStaffContact] = useState(null)


  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) return
    setIsFeedbackSubmitting(true)
    try {
      const { error } = await supabase.from('feedback').insert([{
        user_email: userEmail,
        user_role: userRole,
        type: feedbackType,
        message: feedbackMessage
      }])
      if (error) throw error
      setFeedbackSuccess(true)
      setTimeout(() => {
        setFeedbackSuccess(false)
        setIsFeedbackModalOpen(false)
        setFeedbackMessage('')
        setFeedbackType('Bug')
      }, 2000)
    } catch (error) {
      toast.error("Error submitting feedback: " + error.message)
    } finally {
      setIsFeedbackSubmitting(false)
    }
  }

  const loadAgentProfile = (agent) => {
    setSelectedAgentProfile(agent)
  }

  // ── Render: Agent Profile Detail View ────────────────────────────────────
  if (selectedAgentProfile) {
    return (
      <>
        <ConfirmDialog />
        <Suspense fallback={<LazySpinner label="Loading Profile..." />}>
          <ManagerAgentProfile
            agent={selectedAgentProfile}
            userEmail={userEmail}
            confirm={confirm}
            onBack={() => setSelectedAgentProfile(null)}
          />
        </Suspense>
      </>
    )
  }

  // ── Render: Overview Tab (Data Centre) ───────────────────────────────────
  const renderOverviewTab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <ManagerCleanAdd userEmail={userEmail} />
        <ManagerDistributeTeam
          userEmail={userEmail}
          unassignedCounts={unassignedCounts}
          myTeamEmails={myTeamEmails}
          confirm={confirm}
        />
      </div>
    </div>
  )

  // ── Render: Feedback Modal ───────────────────────────────────────────────
  const renderFeedbackModal = () => (
    <>
      <ConfirmDialog />
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFeedbackModalOpen(false)}></div>
          <div className="bg-white rounded w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 p-6 bg-slate-50">
              <h3 className="text-xl font-extrabold text-slate-800">Submit Feedback</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Found a bug or have a suggestion? Let us know.</p>
            </div>
            {feedbackSuccess ? (
              <div className="p-8 text-center bg-white flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-2">✅</div>
                <h4 className="text-xl font-bold text-slate-800">Received!</h4>
                <p className="text-slate-500 font-medium">Thanks for helping us improve.</p>
              </div>
            ) : (
              <div className="p-6 bg-white space-y-5">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Issue Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button type="button" onClick={() => setFeedbackType('Bug')} className={`flex flex-col items-center justify-center p-3 rounded border-2 transition-all ${feedbackType === 'Bug' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      <Bug className="w-6 h-6 mb-1.5" />
                      <span className="text-xs font-bold">Bug</span>
                    </button>
                    <button type="button" onClick={() => setFeedbackType('Suggestion')} className={`flex flex-col items-center justify-center p-3 rounded border-2 transition-all ${feedbackType === 'Suggestion' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      <Lightbulb className="w-6 h-6 mb-1.5" />
                      <span className="text-xs font-bold">Idea</span>
                    </button>
                    <button type="button" onClick={() => setFeedbackType('Other')} className={`flex flex-col items-center justify-center p-3 rounded border-2 transition-all ${feedbackType === 'Other' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      <MessageSquare className="w-6 h-6 mb-1.5" />
                      <span className="text-xs font-bold">Other</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Message</label>
                  <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} placeholder="Describe what happened or your idea..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded font-medium h-32 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"></textarea>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsFeedbackModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded hover:bg-slate-200 transition">Cancel</button>
                  <button onClick={handleFeedbackSubmit} disabled={isFeedbackSubmitting || !feedbackMessage.trim()} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm border border-indigo-500">{isFeedbackSubmitting ? 'Sending...' : 'Submit'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 lg:flex relative overflow-x-hidden">
      <DashboardSidebar
        subtitle="Manager Console"
        activeTab={activeTab}
        onSelect={setActiveTab}
        userEmail={userEmail}
        userRole={userRole}
        onLogout={onLogout}
        onReportIssue={() => setIsFeedbackModalOpen(true)}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        sections={[
          { items: [
            { id: 'overview', label: 'Data Centre', icon: Target },
            { id: 'data', label: 'My Team Matrix', icon: BarChart3 },
          ]},
          { label: 'Operations', items: [
            { id: 'activity', label: 'Activity Hub', icon: Bell, badge: activeLeads.length > 0 ? (activeLeads.length > 99 ? '99+' : activeLeads.length) : null },
            { id: 'pipeline', label: 'Customer Pipeline', icon: ClipboardList },
          ]},
          { label: 'Administration', items: [
            { id: 'directory', label: 'Directory', icon: BookOpen },
          ]},
        ]}
      />

      <div className="flex-1 min-w-0 flex flex-col">
      <MobileTopBar title="Manager Console" onMenuClick={() => setIsMobileMenuOpen(true)} />
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 pb-8">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'data' && (
          <Suspense fallback={<LazySpinner label="Loading Matrix..." />}>
            <ManagerTeamMatrixTab
              agentStats={agentStats}
              userEmail={userEmail}
              confirm={confirm}
              onLoadProfile={loadAgentProfile}
            />
          </Suspense>
        )}
        {activeTab === 'activity' && (
          <Suspense fallback={<LazySpinner label="Loading Activity..." />}>
            <ManagerActivityHub
              activeLeads={activeLeads}
              userEmail={userEmail}
              confirm={confirm}
            />
          </Suspense>
        )}
        {activeTab === 'directory' && (
          <Suspense fallback={<LazySpinner label="Loading Directory..." />}>
            <ManagerDirectoryTab
              userEmail={userEmail}
              myTeamList={myTeamList}
              onViewContact={setViewingStaffContact}
            />
          </Suspense>
        )}
        {activeTab === 'pipeline' && (
          <Suspense fallback={<LazySpinner label="Loading Pipeline..." />}>
            <CustomerPipelineManagerPage userEmail={userEmail} userRole={userRole} agentsList={myTeamList} />
          </Suspense>
        )}
      </main>
      </div>
      {renderFeedbackModal()}

      {/* Staff Contact Popup */}
      {viewingStaffContact && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setViewingStaffContact(null)} />
          <div className="bg-white rounded w-full max-w-sm shadow-2xl relative z-10 animate-in slide-in-from-bottom-4 duration-300 border border-gray-100 overflow-hidden">
            {(() => {
              const sc = viewingStaffContact;
              const gradients = ['from-blue-500 to-indigo-600','from-violet-500 to-purple-600','from-emerald-500 to-teal-600','from-rose-500 to-pink-600'];
              const grad = gradients[sc.email.charCodeAt(0) % gradients.length];
              return (
                <>
                  <div className={`bg-gradient-to-br ${grad} p-6 text-center relative`}>
                    <button onClick={() => setViewingStaffContact(null)} className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="w-16 h-16 rounded bg-white/20 flex items-center justify-center text-white font-black text-2xl uppercase mx-auto mb-3 shadow-inner">{sc.email.charAt(0)}</div>
                    {sc.full_name ? (
                      <>
                        <h3 className="text-xl font-extrabold text-white leading-tight">{sc.full_name}</h3>
                        <p className="text-white/70 text-sm mt-0.5">{sc.email}</p>
                      </>
                    ) : (
                      <h3 className="text-xl font-extrabold text-white leading-tight">{sc.email}</h3>
                    )}
                    <span className="inline-block mt-2 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">Staff</span>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded border border-slate-100">
                      <div className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Email</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{sc.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded border border-slate-100">
                      <div className="w-8 h-8 bg-indigo-100 rounded-sm flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Contact Number</p>
                        {sc.contact_number ? (
                          <a href={`tel:${sc.contact_number}`} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">{sc.contact_number}</a>
                        ) : (
                          <span className="text-sm font-bold text-amber-600">⚠ Not set yet</span>
                        )}
                      </div>
                    </div>
                    {sc.contact_number && (
                      <a
                        href={`tel:${sc.contact_number}`}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition-all shadow-md shadow-indigo-200 active:scale-[0.98]"
                      >
                        <Phone className="w-4 h-4" />
                        Call {sc.full_name ? sc.full_name.split(' ')[0] : sc.email.split('@')[0]}
                      </a>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
