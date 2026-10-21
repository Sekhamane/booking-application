import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase, isOffline } from '../../lib/supabase'

const SecurityAuthContext = createContext(null)

export function useSecurityAuth() {
  const value = useContext(SecurityAuthContext)
  if (!value) throw new Error('useSecurityAuth must be used inside SecurityAuthGate')
  return value
}

export default function SecurityAuthGate() {
  const location = useLocation()
  const [status, setStatus] = useState(isOffline ? 'anonymous' : 'checking')
  const [denial, setDenial] = useState('')
  const request = useRef(0)
  const onLogin = location.pathname === '/login'

  useEffect(() => {
    if (isOffline) return undefined
    let active = true
    let authEventSeen = false

    const verifySession = async session => {
      const requestId = ++request.current
      if (!active) return
      if (!session?.user?.id) {
        setStatus('anonymous')
        return
      }

      setStatus('checking')
      try {
        const { data: profile, error } = await supabase.from('profiles')
          .select('id, role').eq('id', session.user.id).maybeSingle()
        if (!active || requestId !== request.current) return
        if (error || profile?.id !== session.user.id || profile.role !== 'security_admin') {
          setDenial('Access denied. This account is not assigned the security_admin role.')
          await supabase.auth.signOut()
          if (active && requestId === request.current) setStatus('denied')
          return
        }
        setDenial('')
        setStatus('authorized')
      } catch (error) {
        if (!active || requestId !== request.current) return
        console.error('Unable to verify security administrator access:', error)
        setDenial('Access denied. This account is not assigned the security_admin role.')
        await supabase.auth.signOut()
        if (active && requestId === request.current) setStatus('denied')
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true
      // Defer database work until Supabase has finished its auth callback.
      queueMicrotask(() => { if (active) void verifySession(session) })
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && !authEventSeen) void verifySession(session)
    }).catch(error => {
      if (!active) return
      console.error('Unable to read the security session:', error)
      setStatus('anonymous')
    })

    return () => {
      active = false
      request.current += 1
      subscription.unsubscribe()
    }
  }, [])

  if (status === 'checking') {
    return <main className="security-login-page"><div className="security-login-card" role="status">Verifying security administrator access...</div></main>
  }

  if (status === 'authorized' && onLogin) return <Navigate to="/" replace />
  if (status !== 'authorized' && !onLogin) {
    return <Navigate to="/login" replace state={{ accessDenied: status === 'denied' }} />
  }

  return <SecurityAuthContext.Provider value={{ denial, status }}><Outlet /></SecurityAuthContext.Provider>
}
