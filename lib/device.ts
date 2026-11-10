export function detectOs(ua: string): string {
  const s = ua.toLowerCase()
  if (/iphone|ipad|ipod/.test(s)) return 'ios'
  if (s.includes('android')) return 'android'
  if (s.includes('windows')) return 'windows'
  if (s.includes('mac os')) return 'macos'
  if (s.includes('linux')) return 'linux'
  return 'other'
}
