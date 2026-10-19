const securityHost = String(import.meta.env.VITE_SECURITY_HOST || '').trim().toLowerCase()

export const isSecurityHost = Boolean(securityHost) && window.location.hostname.toLowerCase() === securityHost

export const securityPath = (path = '') => {
  const cleanPath = path.replace(/^\/+/, '')
  if (isSecurityHost) return cleanPath ? `/${cleanPath}` : '/'
  return cleanPath ? `/security/${cleanPath}` : '/security'
}
