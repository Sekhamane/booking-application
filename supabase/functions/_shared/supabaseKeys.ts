/** Prefer Supabase's current injected key maps, with legacy env names as fallback. */
function getDefaultKey(keyMapName: string, legacyName: string): string {
  const rawKeyMap = Deno.env.get(keyMapName)
  if (rawKeyMap) {
    try {
      const keyMap = JSON.parse(rawKeyMap) as Record<string, unknown>
      const defaultKey = keyMap.default
      if (typeof defaultKey === 'string' && defaultKey) return defaultKey
    } catch {
      // Fall through to the legacy environment variable for older projects.
    }
  }

  const legacyKey = Deno.env.get(legacyName)
  if (legacyKey) return legacyKey
  throw new Error(`Missing Supabase key configuration: ${keyMapName}`)
}

export const getPublishableKey = () => getDefaultKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
export const getSecretKey = () => getDefaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
