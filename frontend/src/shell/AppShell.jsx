import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Dialog as RDialog } from 'radix-ui'
import { Menu as MenuIcon, X } from 'lucide-react'
import { CountBadge, IconButton, NavItem, cn, focusRing } from '../ui'
import { useT } from '../i18n/useT'
import { PRODUCT_LOGO, PRODUCT_NAME } from '../config'
import UserMenu from './UserMenu'

function isActive(pathname, to) {
  return pathname === to || pathname.startsWith(`${to}/`)
}

/**
 * AppShell — the frame around every signed-in screen, for every role.
 *
 *   desktop (lg+)  left sidebar
 *   phone          top bar, plus either a slide-in menu (admin, manager, GM)
 *                  or a bottom tab bar (agents, `bottomTabs`)
 *
 * nav: [{ label?, items: [{ to, label, icon, count? }] }]
 */
export default function AppShell({ nav, bottomTabs = false, userEmail, userRole, onLogout, canReport = true, children }) {
  const t = useT()
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const items = nav.flatMap((section) => section.items)
  const current = items.find((item) => isActive(pathname, item.to))
  const roleLabel = t(`role.${userRole}`, null, userRole)

  useEffect(() => {
    document.title = current ? `${current.label} · ${PRODUCT_NAME}` : PRODUCT_NAME
  }, [current])

  const brand = (
    <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
      <img src={PRODUCT_LOGO} alt="" className="size-7 shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-fg">{PRODUCT_NAME}</p>
        <p className="truncate text-xs text-fg-subtle">{roleLabel}</p>
      </div>
    </div>
  )

  const navList = (onNavigate) => (
    <nav aria-label={t('nav.main')} className="flex-1 overflow-y-auto px-3 py-2">
      {nav.map((section, i) => (
        <div key={section.label ?? i} className={cn(i > 0 && 'mt-4')}>
          {section.label && <p className="px-2.5 pb-1 text-xs text-fg-subtle">{section.label}</p>}
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavItem
                key={item.to}
                as={Link}
                to={item.to}
                onClick={onNavigate}
                icon={item.icon}
                label={item.label}
                count={item.count}
                active={isActive(pathname, item.to)}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-dvh bg-canvas font-sans text-fg lg:flex">
      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        {brand}
        {navList()}
        <div className="border-t border-line p-2">
          <UserMenu userEmail={userEmail} userRole={userRole} onLogout={onLogout} canReport={canReport} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Phone top bar ──────────────────────────────────────────────── */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-line bg-surface px-2 lg:hidden">
          {!bottomTabs && (
            <IconButton label={t('nav.openMenu')} icon={MenuIcon} onClick={() => setDrawerOpen(true)} />
          )}
          <img src={PRODUCT_LOGO} alt="" className={cn('size-7 shrink-0', bottomTabs && 'ml-2')} />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{current?.label ?? PRODUCT_NAME}</p>
          <UserMenu
            variant="avatar"
            userEmail={userEmail}
            userRole={userRole}
            onLogout={onLogout}
            canReport={canReport}
          />
        </header>

        <main className={cn('mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 lg:py-8', bottomTabs && 'pb-24 lg:pb-8')}>
          {children}
        </main>
      </div>

      {/* ── Phone slide-in menu ────────────────────────────────────────── */}
      {!bottomTabs && (
        <RDialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <RDialog.Portal>
            <RDialog.Overlay className="fixed inset-0 z-40 bg-brand/40 animate-fade-in motion-reduce:animate-none lg:hidden" />
            <RDialog.Content
              aria-describedby={undefined}
              className="fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col bg-surface font-sans text-fg shadow-dialog animate-drawer-in focus:outline-hidden motion-reduce:animate-none lg:hidden"
            >
              <div className="flex items-center justify-between pr-2">
                {brand}
                <RDialog.Close
                  aria-label={t('nav.closeMenu')}
                  className={cn(
                    'inline-flex size-10 items-center justify-center rounded-control text-fg-muted hover:bg-sunken hover:text-fg',
                    focusRing
                  )}
                >
                  <X className="size-5" aria-hidden="true" />
                </RDialog.Close>
              </div>
              <RDialog.Title className="sr-only">{t('nav.main')}</RDialog.Title>
              {navList(() => setDrawerOpen(false))}
            </RDialog.Content>
          </RDialog.Portal>
        </RDialog.Root>
      )}

      {/* ── Phone bottom tabs (agents) ─────────────────────────────────── */}
      {bottomTabs && (
        <nav
          aria-label={t('nav.main')}
          className="fixed inset-x-0 bottom-0 z-10 grid border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const active = isActive(pathname, item.to)
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors',
                  focusRing,
                  active ? 'font-medium text-brand' : 'text-fg-muted'
                )}
              >
                <span className="relative">
                  <Icon className="size-5" aria-hidden="true" />
                  <CountBadge count={item.count} className="absolute -right-3 -top-2" />
                </span>
                {item.label}
                {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent" aria-hidden="true" />}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}
