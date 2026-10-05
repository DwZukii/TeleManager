import { useState } from 'react'
import { Bug, ChevronsUpDown, KeyRound, Languages, LogOut, User } from 'lucide-react'
import { Avatar, Menu, MenuItem, MenuLabel, MenuSeparator, cn, focusRing } from '../ui'
import { useLanguage, useT } from '../i18n/useT'
import ProfileDialog from './ProfileDialog'
import PasswordDialog from './PasswordDialog'
import FeedbackDialog from './FeedbackDialog'

/**
 * UserMenu — account actions. `variant="sidebar"` is the full-width row at the
 * foot of the sidebar; `variant="avatar"` is the round button in the top bar.
 */
export default function UserMenu({ userEmail, userRole, onLogout, canReport = true, variant = 'sidebar' }) {
  const t = useT()
  const { lang, setLang } = useLanguage()
  const [dialog, setDialog] = useState(null)
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
    <>
      <Menu trigger={trigger} align={variant === 'sidebar' ? 'start' : 'end'} className="w-64">
        <MenuLabel>{t('user.signedInAs', { email: userEmail })}</MenuLabel>
        <MenuSeparator />
        <MenuItem icon={User} onSelect={() => setDialog('profile')}>
          {t('user.profile')}
        </MenuItem>
        <MenuItem icon={KeyRound} onSelect={() => setDialog('password')}>
          {t('user.password')}
        </MenuItem>
        {canReport && (
          <MenuItem icon={Bug} onSelect={() => setDialog('feedback')}>
            {t('user.report')}
          </MenuItem>
        )}
        <MenuItem icon={Languages} onSelect={() => setLang(lang === 'en' ? 'ms' : 'en')}>
          {t('user.switchLanguage')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={LogOut} tone="danger" onSelect={onLogout}>
          {t('user.signOut')}
        </MenuItem>
      </Menu>

      <ProfileDialog open={dialog === 'profile'} onOpenChange={(o) => !o && setDialog(null)} userEmail={userEmail} userRole={userRole} />
      <PasswordDialog open={dialog === 'password'} onOpenChange={(o) => !o && setDialog(null)} userEmail={userEmail} />
      {canReport && (
        <FeedbackDialog
          open={dialog === 'feedback'}
          onOpenChange={(o) => !o && setDialog(null)}
          userEmail={userEmail}
          userRole={userRole}
        />
      )}
    </>
  )
}
