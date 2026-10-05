// Phone links for the agent screens. Numbers are stored as 60XXXXXXXXX.

/**
 * toWaNumber — 60XXXXXXXXX for wa.me. Lead numbers are stored that way
 * already; customer numbers are saved as typed (012-345 6789, +6012...).
 */
export function toWaNumber(phone) {
  let clean = String(phone ?? '').replace(/\D/g, '')
  if (clean.startsWith('0060')) clean = clean.slice(2)
  else if (clean.startsWith('0')) clean = '6' + clean
  else if (clean.startsWith('1') && (clean.length === 9 || clean.length === 10)) clean = '60' + clean
  return clean
}

export function getWhatsAppUrl(rawPhone, text = '', useWaBusiness = false) {
  const phone = toWaNumber(rawPhone)
  const isAndroid = /Android/i.test(navigator.userAgent)
  const encodedText = text ? encodeURIComponent(text) : ''
  const waMeUrl = `https://wa.me/${phone}${text ? `?text=${encodedText}` : ''}`

  if (isAndroid) {
    const pkg = useWaBusiness ? 'com.whatsapp.w4b' : 'com.whatsapp'
    const fallbackUrl = encodeURIComponent(waMeUrl)
    return `intent://send?phone=${phone}${text ? `&text=${encodedText}` : ''}#Intent;scheme=whatsapp;package=${pkg};S.browser_fallback_url=${fallbackUrl};end`
  }
  return waMeUrl
}

export function getSmsUrl(phone, text = '') {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const separator = isIOS ? '&' : '?'
  const encodedText = text ? encodeURIComponent(text) : ''
  return `sms:+${phone}${separator}body=${encodedText}`
}

export function getCallUrl(phone) {
  const local = String(phone).startsWith('60') ? '0' + String(phone).slice(2) : String(phone)
  return `tel:${local}`
}
