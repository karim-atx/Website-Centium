import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Centium is served from a domain root and only ever from a domain root
// (centium.atraxia.org in production, / in dev), so assets resolve against an
// absolute /. This used to be a relative './' base because one build had to
// work at two different prefixes at once — the raw GitHub Pages URL
// (/Website-Centium/centium/) and the Cloudflare-proxied /centium/ path on
// atraxia.org — with index.html choosing between them at runtime via an
// injected <base> tag. The hub deploys on its own now (see hub/), so there's
// exactly one possible base path and both halves of that mechanism are gone.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  // Supabase config is authored with NEXT_PUBLIC_ names (see
  // lib/supabase/config.ts). Vite only inlines VITE_-prefixed variables by
  // default, so the prefix list is widened to cover both. The same rule
  // applies to either prefix: anything matching is compiled into the public
  // bundle, so only publishable/anon keys belong here — never a service-role
  // key. See SECURITY.md.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
