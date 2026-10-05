import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { Banner, Button, Checkbox, Field, Input, PasswordInput } from '../ui'
import { useLanguage, useT } from '../i18n/useT'
import { PRODUCT_LOGO, PRODUCT_NAME } from '../config'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 30 // seconds

export default function Login({ onLogin }) {
  const t = useT()
  const { lang, setLang } = useLanguage()
  const [email, setEmail] = useState(() => localStorage.getItem('telemanager_remembered_email') || '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('telemanager_remembered_email'))
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Client-side rate limiting
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutTimer, setLockoutTimer] = useState(0)

  useEffect(() => {
    document.title = `${t('login.title')} · ${PRODUCT_NAME}`
  }, [t])

  useEffect(() => {
    let timer
    if (lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setFailedAttempts(0)
            setErrorMsg('')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [lockoutTimer])

  const handleSignIn = async (e) => {
    if (e) e.preventDefault()
    if (lockoutTimer > 0) return

    setIsLoading(true)
    setErrorMsg('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockoutTimer(LOCKOUT_DURATION)
        setErrorMsg(t('login.locked', { seconds: LOCKOUT_DURATION }))
      } else {
        setErrorMsg(authError.message)
      }
      setIsLoading(false)
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, contact_number')
      .eq('email', email)
      .single()
    if (profileError || !profileData) {
      setErrorMsg(t('login.noRole'))
      setIsLoading(false)
      return
    }

    if (rememberMe) {
      localStorage.setItem('telemanager_remembered_email', email)
    } else {
      localStorage.removeItem('telemanager_remembered_email')
    }

    setFailedAttempts(0)
    onLogin(profileData.role, email, profileData.contact_number)
    setIsLoading(false)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas p-4 font-sans text-fg sm:p-6">
      <div className="w-full max-w-sm space-y-6 rounded-card border border-line bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-2.5">
          <img src={PRODUCT_LOGO} alt="" className="size-8" />
          <span className="text-base font-semibold">{PRODUCT_NAME}</span>
        </div>

        <h1 className="text-xl font-semibold">{t('login.title')}</h1>

        {errorMsg && <Banner tone="danger">{errorMsg}</Banner>}

        <form onSubmit={handleSignIn} className="space-y-4">
          <Field label={t('login.email')}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field label={t('login.password')}>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Checkbox label={t('login.remember')} checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
          <Button type="submit" size="lg" fullWidth loading={isLoading} disabled={lockoutTimer > 0}>
            {lockoutTimer > 0 ? t('login.wait', { seconds: lockoutTimer }) : t('login.submit')}
          </Button>
        </form>
      </div>

      <button
        type="button"
        onClick={() => setLang(lang === 'en' ? 'ms' : 'en')}
        className="mt-4 rounded-control px-2 py-1 text-sm text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {t('user.switchLanguage')}
      </button>
    </div>
  )
}
