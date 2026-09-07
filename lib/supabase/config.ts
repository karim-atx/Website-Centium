// Resolves which Supabase project the app talks to. Both credential pairs are
// baked into the bundle at build time; NEXT_PUBLIC_APP_ENV selects between
// them. Staging is the default so that a misconfigured build points at
// throwaway data rather than production.

export type AppEnv = 'staging' | 'prod'

export interface SupabaseConfig {
  url: string
  anonKey: string
  env: AppEnv
}

const DEFAULT_ENV: AppEnv = 'staging'

function resolveEnv(): AppEnv {
  const raw = import.meta.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase()

  if (!raw) {
    console.warn(
      `[supabase] NEXT_PUBLIC_APP_ENV is not set — defaulting to "${DEFAULT_ENV}". ` +
        'Set it in .env.local to silence this warning.',
    )
    return DEFAULT_ENV
  }

  if (raw !== 'staging' && raw !== 'prod') {
    console.warn(
      `[supabase] NEXT_PUBLIC_APP_ENV="${raw}" is not a recognised environment ` +
        `— expected "staging" or "prod". Defaulting to "${DEFAULT_ENV}".`,
    )
    return DEFAULT_ENV
  }

  return raw
}

export function getSupabaseConfig(): SupabaseConfig {
  const env = resolveEnv()

  const url =
    env === 'prod'
      ? import.meta.env.NEXT_PUBLIC_SUPABASE_URL_PROD
      : import.meta.env.NEXT_PUBLIC_SUPABASE_URL_STAGING

  const anonKey =
    env === 'prod'
      ? import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD
      : import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_STAGING

  const suffix = env === 'prod' ? 'PROD' : 'STAGING'

  // Failing here beats handing the client an `undefined` URL, which surfaces
  // much later as an opaque fetch error.
  if (!url) {
    throw new Error(
      `[supabase] Missing NEXT_PUBLIC_SUPABASE_URL_${suffix}. ` +
        'Add it to .env.local (see .env.example) and restart the dev server.',
    )
  }

  if (!anonKey) {
    throw new Error(
      `[supabase] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY_${suffix}. ` +
        'Add it to .env.local (see .env.example) and restart the dev server.',
    )
  }

  return { url, anonKey, env }
}
