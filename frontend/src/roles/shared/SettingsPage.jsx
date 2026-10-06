import { useId, useState } from 'react'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, PageHeader, SegmentedControl } from '../../ui'
import { useLanguage, useT } from '../../i18n/useT'
import { isAndroid, setWaBusiness, useWaBusiness } from '../../hooks/useWaBusiness'
import { useMyScript, writeMyScript } from '../../hooks/useMyScript'
import { TEXT_SIZES, setTextSize, useTextSize } from '../../hooks/useTextSize'
import ProfileDialog from '../../shell/ProfileDialog'
import PasswordDialog from '../../shell/PasswordDialog'
import FeedbackDialog from '../../shell/FeedbackDialog'
import ScriptDialog from '../staff/ScriptDialog'

/** One group of settings: a heading, then its card or cards. */
export function SettingsSection({ title, description, children }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="space-y-2">
      <div className="px-1">
        <h2 id={id} className="text-sm font-medium text-fg-muted">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-fg-subtle">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Row({ title, body, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line px-4 py-4 last:border-0 sm:px-5">
      <div className="min-w-0 flex-1 basis-40">
        <h3 className="text-sm font-medium text-fg">{title}</h3>
        {body && <p className="mt-0.5 text-sm text-fg-muted">{body}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/**
 * SettingsPage — everything about the signed-in person's own account, for
 * every role, in groups: Account, Messages (everyone with a customers page),
 * Display, Help, then Sign out. `children` adds a role's own sections before
 * Sign out (the admin's clean-up jobs).
 */
export default function SettingsPage({ userEmail, userRole, onLogout, canReport = true, children }) {
  const t = useT()
  const { lang, setLang } = useLanguage()
  const textSize = useTextSize()
  const [dialog, setDialog] = useState(null)
  const close = (open) => !open && setDialog(null)
  const action = 'max-sm:h-11'

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t('settings.title')} description={t('user.signedInAs', { email: userEmail })} />

      <SettingsSection title={t('settings.account')}>
        <Card as="div">
          <Row title={t('user.profile')} body={t('settings.profileBody')}>
            <Button variant="secondary" className={action} onClick={() => setDialog('profile')}>
              {t('common.edit')}
            </Button>
          </Row>
          <Row title={t('user.password')} body={t('settings.passwordBody')}>
            <Button variant="secondary" className={action} onClick={() => setDialog('password')}>
              {t('settings.change')}
            </Button>
          </Row>
        </Card>
      </SettingsSection>

      {/* General managers have no customers page, so nothing to send. */}
      {userRole !== 'general_manager' && <MessageSettings userEmail={userEmail} userRole={userRole} action={action} />}

      <SettingsSection title={t('settings.display')}>
        <Card as="div">
          <Row title={t('common.language')} body={t('settings.languageBody')}>
            <SegmentedControl
              label={t('common.language')}
              value={lang}
              onChange={setLang}
              options={[
                { value: 'en', label: t('lang.en') },
                { value: 'ms', label: t('lang.ms') },
              ]}
            />
          </Row>
          <Row title={t('settings.textSize')} body={t('settings.textSizeBody')}>
            <SegmentedControl
              label={t('settings.textSize')}
              value={textSize}
              onChange={setTextSize}
              options={TEXT_SIZES.map((size) => ({ value: size, label: t(`textSize.${size}`) }))}
            />
          </Row>
        </Card>
      </SettingsSection>

      {canReport && (
        <SettingsSection title={t('settings.help')}>
          <Card as="div">
            <Row title={t('user.report')} body={t('settings.reportBody')}>
              <Button variant="secondary" className={action} onClick={() => setDialog('feedback')}>
                {t('settings.report')}
              </Button>
            </Row>
          </Card>
        </SettingsSection>
      )}

      {children}

      <Card as="div">
        <Row title={t('user.signOut')} body={t('settings.signOutBody')}>
          <Button variant="dangerOutline" icon={LogOut} className={action} onClick={onLogout}>
            {t('user.signOut')}
          </Button>
        </Row>
      </Card>

      <ProfileDialog open={dialog === 'profile'} onOpenChange={close} userEmail={userEmail} />
      <PasswordDialog open={dialog === 'password'} onOpenChange={close} userEmail={userEmail} />
      {canReport && <FeedbackDialog open={dialog === 'feedback'} onOpenChange={close} userEmail={userEmail} userRole={userRole} />}
    </div>
  )
}

/**
 * What this person's messages say and which app sends them: the birthday
 * greeting for anyone who can send one, plus an agent's lead scripts. All of
 * it is kept on this device, as the scripts and the WhatsApp choice always were.
 */
function MessageSettings({ userEmail, userRole, action }) {
  const t = useT()
  const business = useWaBusiness(userEmail)
  const scripts = {
    wa: useMyScript('wa', userEmail),
    sms: useMyScript('sms', userEmail),
    birthday: useMyScript('birthday', userEmail),
  }
  const [editing, setEditing] = useState(null)

  // The standard greeting with {name} still in it, so it can be edited.
  const standardGreeting = t('alerts.wishesText')
  const editors = {
    birthday: { title: t('settings.birthday'), body: t('settings.birthdayBody'), hint: t('settings.birthdayHint'), placeholder: standardGreeting },
    // Only agents message leads.
    ...(userRole === 'agent' && {
      wa: { title: t('lead.scriptTitleWa'), body: t('settings.scriptBody'), placeholder: t('lead.scriptPlaceholder') },
      sms: { title: t('lead.scriptTitleSms'), body: t('settings.scriptBody'), placeholder: t('lead.scriptPlaceholder') },
    }),
  }

  function save(kind, text) {
    // Saving the standard greeting unchanged keeps following the app's language.
    const value = kind === 'birthday' && text.trim() === standardGreeting ? '' : text.trim()
    writeMyScript(kind, userEmail, value)
    setEditing(null)
    toast.success(kind === 'birthday' ? t('settings.birthdaySaved') : t('lead.scriptSaved'))
  }

  return (
    <SettingsSection title={t('settings.messages')} description={t('lead.scriptHint')}>
      <Card as="div">
        {/* Only an Android link names the app; elsewhere WhatsApp opens whatever is installed. */}
        {isAndroid() && (
          <Row title={t('profile.waApp')} body={t('settings.waBody')}>
            <SegmentedControl
              label={t('profile.waApp')}
              value={business ? 'business' : 'personal'}
              onChange={(value) => setWaBusiness(userEmail, value === 'business')}
              options={[
                { value: 'personal', label: t('profile.waPersonal') },
                { value: 'business', label: t('profile.waBusiness') },
              ]}
            />
          </Row>
        )}
        {Object.entries(editors).map(([kind, editor]) => (
          <Row key={kind} title={editor.title} body={editor.body}>
            <Button variant="secondary" className={action} onClick={() => setEditing(kind)}>
              {t('common.edit')}
            </Button>
          </Row>
        ))}
      </Card>

      <ScriptDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing ? editors[editing].title : ''}
        hint={editing ? editors[editing].hint : undefined}
        placeholder={editing ? editors[editing].placeholder : undefined}
        value={editing ? scripts[editing] || (editing === 'birthday' ? standardGreeting : '') : ''}
        onSave={(text) => save(editing, text)}
      />
    </SettingsSection>
  )
}
