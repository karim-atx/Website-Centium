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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
