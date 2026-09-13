import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
  plugins: [
    react(),
    // PWA scaffolding: an installable manifest and a service worker that
    // exists to receive push notifications. Nothing subscribes to push yet —
    // there is no VAPID key — so this makes the app installable and leaves
    // exactly one piece missing rather than two. See src/sw.ts.
    VitePWA({
      // injectManifest, NOT generateSW, and the choice is the whole point.
      // generateSW writes the worker from Workbox's own template, which is
      // built around precaching and runtime caching strategies; custom code
      // gets bolted on through importScripts. This worker is two handlers and
      // no caching at all, so authoring it directly is both smaller and
      // honest about what it does. injectManifest compiles src/sw.ts and
      // substitutes the precache manifest into it; see below for why that
      // list is all but empty, and src/sw.ts for why it is never used.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // PRECACHES NOTHING, deliberately. An empty glob list means no build
        // output is listed for caching, so every request still goes to the
        // network. Adding an offline strategy is a separate decision with its
        // own staleness questions, and this app reads live health data.
        globPatterns: [],
      },
      // The other half of "precaches nothing". globPatterns alone still left
      // four entries in the injected list, because the plugin adds the
      // manifest's own icons by default. Measured: this takes the build from
      // "precache 4 entries" to "precache 1 entry". The one that remains is
      // manifest.webmanifest, which the plugin always appends and offers no
      // option to drop — harmless, since src/sw.ts discards the whole list and
      // never calls precacheAndRoute, so nothing is cached either way.
      includeManifestIcons: false,
      // The worker calls skipWaiting() and clients.claim() itself (see
      // src/sw.ts), so a new one takes over without waiting for every tab to
      // close. Safe here only because nothing is cached.
      registerType: 'autoUpdate',
      // Registration is explicit in src/main.tsx rather than injected into
      // index.html, so the app's entry point is where you find it.
      injectRegister: null,
      manifest: {
        name: 'Centium',
        short_name: 'Centium',
        description:
          'Centium brings nutrition tracking, workout logging, health tracking, AI-powered guidance and community into one place.',
        // The installed app opens the app, not the marketing site. Someone who
        // installs from the landing page wants /app; an unauthenticated visit
        // still redirects to sign-in, which is the correct destination anyway.
        start_url: '/app',
        // The whole origin, because the marketing site and the app share it
        // and a notification click may land on either.
        scope: '/',
        display: 'standalone',
        // Both values are the ones index.html already declares as
        // <meta name="theme-color">, which are themselves --c-primary
        // (174 161 220) and light-mode --c-cream (255 255 255) from
        // src/index.css. A manifest carries one theme_color with no media
        // query, so it takes the light one.
        theme_color: '#AEA1DC',
        background_color: '#FFFFFF',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Full-bleed and more generously inset, because a maskable icon is
          // cropped to whatever shape the platform wants. The 'any' pair keeps
          // its transparent rounded corners, which a mask would cut through.
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  base: '/',
  // Supabase config is authored with NEXT_PUBLIC_ names (see
  // lib/supabase/config.ts). Vite only inlines VITE_-prefixed variables by
  // default, so the prefix list is widened to cover both. The same rule
  // applies to either prefix: anything matching is compiled into the public
  // bundle, so only publishable/anon keys belong here — never a service-role
  // key. See SECURITY.md.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
