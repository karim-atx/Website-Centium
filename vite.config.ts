import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The built site is reachable at two different prefixes at once: the raw
// GitHub Pages URL (/Website-Centium/) and, proxied through Cloudflare, the
// public /centium/ path on atraxia.org. A single absolute base can only be
// correct for one of those, so the build emits relative asset paths instead
// — index.html then sets the actual <base> at runtime (see the inline
// script there) based on whichever prefix the page was actually loaded
// under. Dev server stays at the root so local URLs don't need any prefix.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? './' : '/',
}))
