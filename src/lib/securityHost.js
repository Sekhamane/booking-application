// Keep the dedicated Vercel security project fail-closed if its environment
// variable is accidentally omitted from a production build. Deployments with a
// custom security domain can still set VITE_SECURITY_HOST explicitly.
export const securityHost = String(import.meta.env.VITE_SECURITY_HOST || 'booking-security.vercel.app').trim().toLowerCase()

export const isSecurityHost = Boolean(securityHost) && window.location.hostname.toLowerCase() === securityHost

export const securityPath = (path = '') => {
  const cleanPath = path.replace(/^\/+/, '')
  if (isSecurityHost) return cleanPath ? `/${cleanPath}` : '/'
  if (securityHost) {
    const localSecurityHost = securityHost.endsWith('.localhost')
    const protocol = localSecurityHost ? window.location.protocol : 'https:'
    const port = localSecurityHost && window.location.port ? `:${window.location.port}` : ''
    return `${protocol}//${securityHost}${port}${cleanPath ? `/${cleanPath}` : '/'}`
  }
  return cleanPath ? `/security/${cleanPath}` : '/security'
}
