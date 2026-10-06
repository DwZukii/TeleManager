import { useNavigate } from 'react-router'
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react'
import { Avatar, Menu, MenuItem, MenuLabel, MenuSeparator, cn, focusRing } from '../ui'
import { useT } from '../i18n/useT'

/**
 * UserMenu — who is signed in, the way to Settings, and Sign out. Profile,
 * password, language and reporting a problem all live on the Settings page.
 * `variant="sidebar"` is the full-width row at the foot of the sidebar;
 * `variant="avatar"` is the round button in the phone top bar.
 */
export default function UserMenu({ userEmail, userRole, onLogout, variant = 'sidebar' }) {
  const t = useT()
  const navigate = useNavigate()
  const roleLabel = t(`role.${userRole}`, null, userRole)

  const trigger =
    variant === 'sidebar' ? (
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left transition-colors hover:bg-sunken',
          focusRing
        )}
      >
        <Avatar email={userEmail} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-fg">{userEmail}</span>
          <span className="block truncate text-xs text-fg-subtle">{roleLabel}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
      </button>
    ) : (
      <button
        type="button"
        aria-label={t('user.menu')}
        className={cn('inline-flex size-10 items-center justify-center rounded-full', focusRing)}
      >
        <Avatar email={userEmail} />
      </button>
    )

  return (
    <Menu trigger={trigger} align={variant === 'sidebar' ? 'start' : 'end'} className="w-64">
      <MenuLabel>{t('user.signedInAs', { email: userEmail })}</MenuLabel>
      <MenuSeparator />
      <MenuItem icon={Settings} onSelect={() => navigate('/settings')}>
        {t('nav.settings')}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={LogOut} tone="danger" onSelect={onLogout}>
        {t('user.signOut')}
      </MenuItem>
    </Menu>
  )
}
