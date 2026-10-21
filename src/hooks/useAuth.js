import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, isOffline } from '../lib/supabase'

/** Supabase Auth session and database-backed application role. */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const profileRequest = useRef(0)

  const loadProfile = useCallback(async (userId) => {
    const requestId = ++profileRequest.current
    if (!userId || isOffline) {
      setProfile(null)
      return null
    }
    const { data, error } = await supabase.from('profiles')
      .select('id, full_name, phone, role, preferred_language')
      .eq('id', userId).maybeSingle()
    if (error) {
      console.error('Unable to load account profile', error)
      if (requestId === profileRequest.current) setProfile(null)
      return null
    }
    if (requestId === profileRequest.current) setProfile(data)
    return data
  }, [])

  useEffect(() => {
    let mounted = true
    let receivedAuthEvent = false
    if (isOffline) {
      profileRequest.current += 1
      setSession(null)
      setProfile(null)
      setLoading(false)
      return undefined
    }

    supabase.auth.getSession().then(async ({ data: { session: current } }) => {
      if (!mounted || receivedAuthEvent) return
      setSession(current)
      if (current?.user) {
        const profileLoad = loadProfile(current.user.id)
        const requestId = profileRequest.current
        await profileLoad
        if (requestId !== profileRequest.current) return
      } else {
        profileRequest.current += 1
        setProfile(null)
      }
      if (mounted) setLoading(false)
    }).catch(() => {
      if (mounted && !receivedAuthEvent) {
        profileRequest.current += 1
        setSession(null)
        setProfile(null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, current) => {
      receivedAuthEvent = true
      setLoading(true)
      setSession(current)
      if (current?.user) {
        setProfile(null)
        queueMicrotask(async () => {
          if (!mounted) return
          const profileLoad = loadProfile(current.user.id)
          const requestId = profileRequest.current
          await profileLoad
          if (mounted && requestId === profileRequest.current) setLoading(false)
        })
      } else {
        profileRequest.current += 1
        setProfile(null)
        setLoading(false)
      }
    })
    return () => { mounted = false; profileRequest.current += 1; subscription.unsubscribe() }
  }, [loadProfile])

  const signIn = (email, password) => {
    if (isOffline) return Promise.resolve({ error: new Error('Configure Supabase Auth to sign in.') })
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signUp = (email, password, fullName, phone, privacyNoticeAccepted, marketingConsent) => {
    if (isOffline) return Promise.resolve({ error: new Error('Configure Supabase Auth to create an account.') })
    return supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, phone, privacy_notice_accepted: privacyNoticeAccepted, marketing_consent: marketingConsent } },
    })
  }

  const signOut = useCallback(async () => {
    if (isOffline) return { error: null }
    return supabase.auth.signOut()
  }, [])

  return {
    session, profile, loading, signIn, signUp, signOut,
    isAdmin: profile?.role === 'admin',
    isProvider: profile?.role === 'provider',
    isSecurityAdmin: profile?.role === 'security_admin',
  }
}
