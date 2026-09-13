/// <reference types="vite/client" />

// Vite's own ImportMetaEnv carries an `any` index signature, so these would
// type-check without being declared. Naming them explicitly is what makes a
// typo like NEXT_PUBLIC_SUPABSE_URL_PROD a compile error instead of an
// `undefined` that only surfaces at runtime.
interface ImportMetaEnv {
  readonly NEXT_PUBLIC_SUPABASE_URL_STAGING?: string
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY_STAGING?: string
  readonly NEXT_PUBLIC_SUPABASE_URL_PROD?: string
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD?: string
  readonly NEXT_PUBLIC_APP_ENV?: string
  // Not Supabase, but this is the app's only ImportMetaEnv declaration and the
  // reason for naming things here applies equally: src/services/push reads it,
  // and a typo would otherwise be an `undefined` that only shows up when a
  // subscription silently fails. The VAPID *public* key is designed to ship in
  // the bundle; its private counterpart must never carry an exposed prefix.
  readonly VITE_VAPID_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
