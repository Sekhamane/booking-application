// Keep the dedicated Vercel security project fail-closed if its environment
// variable is accidentally omitted from a production build. Deployments with a
// custom security domain can still set VITE_SECURITY_HOST explicitly.
const productionSecurityHosts = [
  'book-security.netlify.app',
  'booking-security.netlify.app',
  'booking-security.vercel.app',
]
const defaultSecurityHost = productionSecurityHosts[0]

export const securityHost = String(import.meta.env.VITE_SECURITY_HOST || defaultSecurityHost).trim().toLowerCase()

const currentHost = window.location.hostname.toLowerCase()
export const isSecurityHost = currentHost === securityHost || productionSecurityHosts.includes(currentHost)

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
