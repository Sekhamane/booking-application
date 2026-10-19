import { useCallback, useEffect, useState } from 'react'
import { supabase, isOffline } from '../lib/supabase'

/** Supabase Auth session and database-backed application role. */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId || isOffline) {
      setProfile(null)
      return null
    }
    const { data, error } = await supabase.from('profiles')
      .select('id, full_name, phone, role, preferred_language')
      .eq('id', userId).maybeSingle()
    if (error) {
      console.error('Unable to load account profile', error)
      setProfile(null)
      return null
    }
    setProfile(data)
    return data
  }, [])

  useEffect(() => {
    let mounted = true
    if (isOffline) {
      setSession(null)
      setProfile(null)
      setLoading(false)
      return undefined
    }

    supabase.auth.getSession().then(async ({ data: { session: current } }) => {
      if (!mounted) return
      setSession(current)
      if (current?.user) await loadProfile(current.user.id)
      if (mounted) setLoading(false)
    }).catch(() => { if (mounted) setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, current) => {
      setLoading(true)
      setSession(current)
      if (current?.user) {
        queueMicrotask(async () => {
          await loadProfile(current.user.id)
          if (mounted) setLoading(false)
        })
      } else {
        setProfile(null)
        setLoading(false)
      }
    })
    return () => { mounted = false; subscription.unsubscribe() }
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

  const signOut = async () => {
    if (isOffline) return { error: null }
    return supabase.auth.signOut()
  }

  return {
    session, profile, loading, signIn, signUp, signOut,
    isAdmin: profile?.role === 'admin',
    isProvider: profile?.role === 'provider',
    isSecurityAdmin: profile?.role === 'security_admin',
  }
}
