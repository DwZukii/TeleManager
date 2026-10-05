import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './supabase'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useVersionCheck } from './hooks/useVersionCheck'
import LanguageProvider from './i18n/LanguageProvider'
import { useT } from './i18n/useT'
import { Banner, Button, Dialog, Field, Input, Toaster } from './ui'
import { PRODUCT_LOGO } from './config'

const queryClient = new QueryClient()

const Login = lazy(() => import('./components/Login'))
const AdminApp = lazy(() => import('./roles/AdminApp'))
const ManagerApp = lazy(() => import('./roles/ManagerApp'))
const StaffApp = lazy(() => import('./roles/StaffApp'))
const GMApp = lazy(() => import('./roles/GMApp'))

export default function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ErrorBoundary>
            <Root />
          </ErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    </LanguageProvider>
  )
}

/** Full-screen placeholder while the session or a role's code loads. */
function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas" aria-busy="true">
      <img src={PRODUCT_LOGO} alt="" className="size-10 animate-pulse motion-reduce:animate-none" />
    </div>
  )
}

function Root() {
  const t = useT()
  const [userRole, setUserRole] = useState(null)
  const [userEmail, setUserEmail] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isProfileComplete, setIsProfileComplete] = useState(false)
  const [isCheckingProfile, setIsCheckingProfile] = useState(true) // true until first check resolves
  const updateAvailable = useVersionCheck()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, contact_number')
          .eq('email', session.user.email)
          .single()
        if (profileData) {
          setUserRole(profileData.role)
          setUserEmail(session.user.email)
          if (profileData.role === 'super_admin') {
            setIsProfileComplete(true)
          } else {
            setIsProfileComplete(!!(profileData.contact_number && profileData.contact_number.trim() !== ''))
          }
          setIsCheckingProfile(false)
        }
      } else {
        setIsCheckingProfile(false)
      }
      setIsCheckingAuth(false)
    }
    checkSession()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserRole(null)
    setUserEmail(null)
    setIsProfileComplete(false)
    setIsCheckingProfile(true)
  }

  const handleLogin = (role, email, contact_number) => {
    setUserRole(role)
    setUserEmail(email)
    setIsCheckingProfile(true)
    if (role === 'super_admin') {
      setIsProfileComplete(true)
    } else {
      setIsProfileComplete(!!(contact_number && contact_number.trim() !== ''))
    }
    setIsCheckingProfile(false)
  }

  // Only show the gate once the role is known, the check is done, and the profile is incomplete.
  const needsGate = userRole && !isCheckingProfile && !isProfileComplete && userRole !== 'super_admin'

  if (isCheckingAuth) return <Splash />

  const props = { userEmail, userRole, onLogout: handleLogout }

  return (
    <Suspense fallback={<Splash />}>
      <Toaster />

      {updateAvailable && (
        <div className="fixed inset-x-4 bottom-4 z-50 font-sans sm:inset-x-auto sm:right-5 sm:w-96">
          <Banner
            tone="info"
            title={t('update.title')}
            action={
              <Button size="sm" onClick={() => window.location.reload()}>
                {t('update.reload')}
              </Button>
            }
            className="shadow-popover"
          >
            {t('update.body')}
          </Banner>
        </div>
      )}

      {/* Dashboards always render underneath; the gate sits on top. */}
      {userRole === 'super_admin' && <AdminApp {...props} />}
      {userRole === 'manager' && <ManagerApp {...props} />}
      {userRole === 'general_manager' && <GMApp {...props} />}
      {userRole === 'agent' && <StaffApp userEmail={userEmail} onLogout={handleLogout} />}
      {!userRole && <Login onLogin={handleLogin} />}

      {needsGate && <ContactGate userEmail={userEmail} onDone={() => setIsProfileComplete(true)} />}
    </Suspense>
  )
}

/** Asks for a contact number before anyone except an admin can carry on. Cannot be dismissed. */
function ContactGate({ userEmail, onDone }) {
  const t = useT()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(event) {
    event.preventDefault()
    if (!phone.trim()) {
      setError(t('gate.required'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const { error: updateError, count } = await supabase
        .from('profiles')
        .update({ contact_number: phone.trim() }, { count: 'exact' })
        .eq('email', userEmail)
      if (updateError) throw updateError
      // count 0 means row-level security quietly refused the write.
      if (count === 0) throw new Error(t('gate.denied'))
      setSaved(true)
      setTimeout(onDone, 1200)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={() => {}}
      dismissible={false}
      size="sm"
      title={t('gate.title')}
      description={t('gate.body')}
      footer={
        !saved && (
          <Button type="submit" form="gate-form" loading={saving} fullWidth>
            {t('gate.save')}
          </Button>
        )
      }
    >
      {saved ? (
        <Banner tone="success" className="mb-2">
          {t('gate.saved')}
        </Banner>
      ) : (
        <form id="gate-form" onSubmit={save} className="space-y-3 py-2">
          <Field label={t('gate.label')} error={error} required>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setError('')
              }}
              placeholder="012-345 6789"
              autoComplete="tel"
            />
          </Field>
          <p className="text-xs text-fg-subtle">{t('user.signedInAs', { email: userEmail })}</p>
        </form>
      )}
    </Dialog>
  )
}
