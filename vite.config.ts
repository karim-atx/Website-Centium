import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed behind a Cloudflare reverse proxy at atraxia.org/centium — the
// built site needs every asset/route path prefixed with /centium so it
// resolves correctly once proxied. Dev server stays at the root so local
// URLs don't need the prefix.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/centium/' : '/',
}))
