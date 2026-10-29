import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// A real HTTP 404 on Cloudflare Pages (landing v29). With a top-level 404.html
// in the output, Pages stops answering every unknown path with index.html and
// 200, and serves 404.html with status 404 instead. This copy of the built
// index.html (same hashed assets, absolute base) boots the same app, so React
// renders the marketing NotFound page through the router's path="*" route;
// the only difference is a robots noindex. public/_redirects lists every real
// route as a 200 rewrite. A build hook (not a postbuild npm script) so it
// runs whatever command the Pages dashboard uses to call vite build.
function notFoundPage(): Plugin {
  return {
    name: 'centium-404-page',
    apply: 'build',
    enforce: 'post',
    writeBundle(options, bundle) {
      const index = bundle['index.html']
      if (!index || index.type !== 'asset' || !options.dir) return
      const html = String(index.source)
      if (!html.includes('</head>')) throw new Error('centium-404-page: index.html has no </head>')
      const page = html.replace('</head>', '\n    <meta name="robots" content="noindex">\n  </head>')
      writeFileSync(join(options.dir, '404.html'), page)
    },
  }
}

// Round E: the lab report reader runs on the device, from Centium's own
// files and never a CDN. tesseract.js (the reader), its wasm core, the English
// model and pdf.js are copied from node_modules into public/ocr/<versions>/
// (git-ignored) whenever dev or build starts, so they are plain static files
// fetched only when someone scans a report. They sit outside assets/, so the
// offline precache below never downloads them and the first load is
// unchanged. The folder name carries the versions, so a cached old worker can
// never meet a newer library.
const pkgVersion = (name: string) =>
  (JSON.parse(readFileSync(join('node_modules', name, 'package.json'), 'utf8')) as { version: string }).version
const OCR_DIR = `ocr/t${pkgVersion('tesseract.js')}-c${pkgVersion('tesseract.js-core')}-p${pkgVersion('pdfjs-dist')}`
const OCR_FILES: [string, string][] = [
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'core/tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'core/tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
  ['pdfjs-dist/build/pdf.min.mjs', 'pdf/pdf.min.mjs'],
  ['pdfjs-dist/build/pdf.worker.min.mjs', 'pdf/pdf.worker.min.mjs'],
]
function ocrFiles(): Plugin {
  return {
    name: 'centium-ocr-files',
    configResolved() {
      rmSync(join('public', 'ocr'), { recursive: true, force: true })
      for (const [from, to] of OCR_FILES) {
        const out = join('public', OCR_DIR, to)
        mkdirSync(dirname(out), { recursive: true })
        copyFileSync(join('node_modules', from), out)
      }
    },
  }
}

// Centium is served from a domain root and only ever from a domain root
// (centium.atraxia.org in production, / in dev), so assets resolve against an
// absolute /. This used to be a relative './' base because one build had to
// work at two different prefixes at once — the raw GitHub Pages URL
// (/Website-Centium/centium/) and the Cloudflare-proxied /centium/ path on
// atraxia.org — with index.html choosing between them at runtime via an
// injected <base> tag. The hub deploys on its own now (see hub/), so there's
// exactly one possible base path and both halves of that mechanism are gone.
// Cache-buster for the app icons. The icon files kept their names when the logo
// was redrawn, so a browser or CDN that already holds the old (broken) files
// would keep serving them; a new query string is a new URL to every cache
// layer, so nothing stale can match it. index.html carries the same `?v=` on
// every icon <link> -- bump both together whenever the icon artwork changes.
const ICON_VERSION = '?v=2'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    notFoundPage(),
    ocrFiles(),
    // PWA scaffolding: an installable manifest and a service worker that
    // exists to receive push notifications. Nothing subscribes to push yet —
    // there is no VAPID key — so this makes the app installable and leaves
    // exactly one piece missing rather than two. See src/sw.ts.
    VitePWA({
      // injectManifest, NOT generateSW: src/sw.ts is written by hand (push,
      // plus the app shell since Round D) and imports no Workbox code.
      // injectManifest compiles it and substitutes the precache list below.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // Round D (D24): THE APP SHELL, so the app opens offline. The page,
        // every script and style, and the barcode / pass wasm. Data is never
        // cached (src/sw.ts). Left out: the map (maplibre and its worker,
        // about 1.5 MB), which needs map tiles from the network anyway, and
        // images, which degrade to their alt text. About 9.5 MB, downloaded
        // once per release.
        globPatterns: ["index.html", "assets/**/*.{js,css,wasm}"],
        globIgnores: ["**/NearbyMap-*", "**/maplibre-gl-worker-*"],
        // The app's pages chunk alone is about 6 MB.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      // The manifest's icons are not needed offline (the installed app keeps
      // its own copies).
      includeManifestIcons: false,
      // The worker calls skipWaiting() and clients.claim() itself (see
      // src/sw.ts), so a new one takes over without waiting for every tab to
      // close. Safe because the shell is versioned: a page load always tries
      // the network first, and hashed files never change under the same URL.
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
        // Handover 2026-09-29, 01 GLOBAL (j): phones are portrait only.
        orientation: 'portrait',
        // Both values are the ones index.html already declares as
        // <meta name="theme-color">, which are themselves --c-primary
        // (174 161 220) and light-mode --c-cream (255 255 255) from
        // src/index.css. A manifest carries one theme_color with no media
        // query, so it takes the light one.
        theme_color: '#AEA1DC',
        background_color: '#FFFFFF',
        icons: [
          { src: `/pwa-192x192.png${ICON_VERSION}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `/pwa-512x512.png${ICON_VERSION}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Full-bleed and more generously inset, because a maskable icon is
          // cropped to whatever shape the platform wants. The 'any' pair keeps
          // its transparent rounded corners, which a mask would cut through.
          {
            src: `/pwa-maskable-512x512.png${ICON_VERSION}`,
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
  // src/sw.ts is bundled separately by vite-plugin-pwa and cannot import from
  // this file, but it also names an icon (the notification icon and badge).
  // Handing it ICON_VERSION as a compile-time constant keeps every icon
  // reference on the one version number above.
  define: { __ICON_VERSION__: JSON.stringify(ICON_VERSION), __OCR_BASE__: JSON.stringify(`/${OCR_DIR}`) },
})
