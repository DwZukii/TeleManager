// Product identity in one place, so the app can be re-branded without a hunt.
export const PRODUCT_NAME = 'Tele Manager'
export const PRODUCT_LOGO = '/favicon.svg'

// "Start calling" (one pending number at a time) is being piloted. Add agent
// emails here to switch it on for them, or '*' for everyone.
export const CALLING_SESSION_PILOT = []

export function inCallingPilot(email) {
  return CALLING_SESSION_PILOT.includes('*') || CALLING_SESSION_PILOT.includes(email)
}
