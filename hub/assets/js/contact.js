/* Atraxia website: Contact page only (loads core.js, never the landing or
   scene code). The form (submit-contact with source 'atraxia', Turnstile,
   every state) and Copy email arrive with the page content in batch 4; this
   file is their home. */
(function () {
  'use strict';
  if (!window.Atx || !document.documentElement.classList.contains('page-contact')) return;
})();
