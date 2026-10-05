import { LogOut, Menu, X } from 'lucide-react'
import UserDropdown from './UserDropdown'

/**
 * DashboardSidebar — left navigation rail shared by the Admin, Manager and GM
 * dashboards. Renders a persistent sidebar on desktop and a slide-in drawer on
 * mobile (paired with <MobileTopBar />, which owns the hamburger button).
 *
 * Props:
 *  - subtitle     : string  — small label under the brand name (e.g. "Admin Console")
 *  - sections     : Array<{ label?: string, items: Array<{ id, label, icon, badge? }> }>
 *                   A section without a label renders its items with no heading.
 *  - activeTab    : string
 *  - onSelect     : (id: string) => void
 *  - userEmail, userRole, onLogout, onReportIssue — passed through to UserDropdown
 *  - isMobileOpen : boolean — drawer state, owned by the parent dashboard
 *  - onMobileClose: () => void
 */
export default function DashboardSidebar({
  subtitle,
  sections = [],
  activeTab,
  onSelect,
  userEmail,
  userRole,
  onLogout,
  onReportIssue,
  isMobileOpen = false,
  onMobileClose = () => {},
}) {
  const handleSelect = (id) => {
    onSelect(id)
    onMobileClose()
  }

  const brand = (
    <div className="flex items-center gap-3 px-5 h-[68px] border-b border-slate-200 flex-shrink-0">
      <img src="/favicon.svg" alt="" className="w-9 h-9 rounded-lg object-contain flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 leading-tight truncate">Tele Manager</p>
        {subtitle && <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {sections.map((section, i) => (
        <div key={section.label || `section-${i}`}>
          {section.label && (
            <p className="px-3 pt-5 pb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide first:pt-0">
              {section.label}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map(item => {
              const Icon = item.icon
              const isActive = item.id === activeTab
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 font-medium hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
                    />
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge != null && (
                    <span className="bg-rose-500 text-white rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold leading-none flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  const footer = (
    <div className="border-t border-slate-200 p-3 flex-shrink-0">
      <p className="px-2 pb-2 text-[11px] font-semibold text-slate-400">Signed in as</p>
      <UserDropdown
        variant="sidebar"
        userEmail={userEmail}
        userRole={userRole}
        onLogout={onLogout}
        onReportIssue={onReportIssue}
      />
      <button
        onClick={onLogout}
        className="mt-1 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
      >
        <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
        <span>Sign out</span>
      </button>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 flex-col">
        {brand}
        {nav}
        {footer}
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      <div
        className={`lg:hidden fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onMobileClose}
      />
      <aside
        className={`lg:hidden fixed left-0 top-0 bottom-0 z-[100] w-72 bg-white border-r border-slate-200 shadow-2xl flex flex-col transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative">
          {brand}
          <button
            onClick={onMobileClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {nav}
        {footer}
      </aside>
    </>
  )
}

/**
 * MobileTopBar — slim header shown only below the `lg` breakpoint, where the
 * sidebar collapses into a drawer.
 */
export function MobileTopBar({ title, onMenuClick }) {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200 h-14 flex items-center gap-3 px-4">
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 text-slate-500 hover:text-slate-900 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <img src="/favicon.svg" alt="" className="w-7 h-7 rounded-md object-contain" />
      <p className="text-sm font-bold text-slate-900 truncate">{title || 'Tele Manager'}</p>
    </header>
  )
}
