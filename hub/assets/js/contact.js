/* Atraxia website: Contact page only (loads core.js and this file, nothing
   else). Ported from the reference (source/contact.r26.html: the form script,
   "CN1 v2: keep the active field above the keyboard" and "CN1 v3: the topic
   dropdown"), wired to the real backend instead of the prototype's demo send.

   THE BACKEND is the shared Supabase Edge Function submit-contact (Database
   PR #33, branch atraxia-contact). Its real behaviour, which this file
   follows (DECISIONS_ATRAXIA: not the handover's verification table):
   - POST JSON { topic, name, email, message, turnstileToken, website }.
     verify_jwt is false: no apikey or Authorization header is needed.
   - The site (source 'atraxia') is derived by the function from the
     request's Origin, never read from the body. 'source' is sent anyway as a
     label; the function ignores it.
   - 'website' is the honeypot (always "" from a person). A filled one gets
     200 { ok: true } with nothing stored, so the page short-cuts it to the
     same success without sending. 'elapsed_ms' is NOT read by the function
     (Database DECISIONS: a timing gate silently drops real fast senders), so
     it is not sent and there is no client-side timing gate either.
   - 200 { ok: true, id } once the message is stored, EVEN IF the emails
     failed afterwards: that is a success.
   - 400 { error: "invalid_input" }: flat, no per-field detail.
   - 403 { error: "captcha_failed" }: Turnstile missing, bad, expired or
     solved on another hostname. Tokens are single-use: the widget is reset
     after every attempt.
   - 429 { error: "rate_limited" }: 3 per IP per hour, 5 per address per day.
   - 500 { error: "server_error" }.
   - A disallowed Origin gets NO Access-Control-Allow-Origin header (no 403):
     the browser refuses the response, which reaches this page as a network
     failure (fetch rejects with a TypeError).
   - Topics accepted: general, partnerships, press, ventures (the function
     also takes Centium's two; this select offers Atraxia's four).
   - Limits: name 1..100, email 3..254 matching the function's own pattern,
     message 1..1500 (all after trimming). */
(function () {
  'use strict';
  var de = document.documentElement;
  if (!window.Atx || !de.classList.contains('page-contact')) return;

  /* ---------- configuration ----------
     NOTE FOR KARIM: TURNSTILE_SITEKEY_PROD must be the public site key of the
     Turnstile widget whose hostname list includes atraxia.org (and
     www.atraxia.org). The decision was to add atraxia.org to the existing
     widget's hostnames, so this is the same public key Centium's contact form
     uses (Cloudflare dashboard → Turnstile → the widget → Site Key; it is the
     NEXT_PUBLIC_TURNSTILE_SITEKEY of the Centium Pages project). Site keys are
     public by design. Until it is filled in, the live form cannot send: on
     submit it says the security check could not load and gives the email
     address. */
  var TURNSTILE_SITEKEY_PROD = '';
  /* Cloudflare's published test key: always passes, visible widget. Used only
     on local hosts. */
  var TURNSTILE_SITEKEY_TEST = '1x00000000000000000000AA';
  /* the production function (project mwnkhhyrheprugeornjl; the Worker's CSP
     connect-src allows exactly this origin) */
  var ENDPOINT_PROD = 'https://mwnkhhyrheprugeornjl.supabase.co/functions/v1/submit-contact';
  /* DEV ONLY: the shared local stack serves the function directly on :8000
     (the :54321 gateway adds Access-Control-Allow-Origin: * to everything, so
     CORS could not be tested through it). Its allowed origins are local; on
     the production allow-list only https://atraxia.org and www are Atraxia. */
  var ENDPOINT_LOCAL = 'http://127.0.0.1:8000';
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var ENDPOINT = LOCAL ? ENDPOINT_LOCAL : ENDPOINT_PROD;
  var SITEKEY = LOCAL ? TURNSTILE_SITEKEY_TEST : TURNSTILE_SITEKEY_PROD;
  var TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  var TIMEOUT_MS = 15000;

  var EMAIL = 'support@atraxia.org';
  var MAX = { name: 100, email: 254, message: 1500 };
  var MIN_MESSAGE = 10;
  /* the function's own address pattern (submit-contact EMAIL_SHAPE) */
  var EMAIL_SHAPE = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
  var TOPICS = ['general', 'partnerships', 'press', 'ventures'];
  /* local send counter, mirroring the function's per-IP limit (3 an hour) */
  var LIMIT = 3, WINDOW = 60 * 60 * 1000, KEY = 'atx-contact-sends';

  var MSG = {
    name: 'Please enter your name.',
    email: 'Please enter a valid email address.',
    emailEmpty: 'Please enter your email address.',
    topic: 'Please choose a topic.',
    message: 'Please write a message (at least 10 characters).',
    turnstile: 'Please complete the security check.',
    turnstileFailed: 'The security check couldn’t load. Please reload the page, or email us directly at ' + EMAIL + '.'
  };
  function mail() { return '<a href="mailto:' + EMAIL + '">' + EMAIL + '</a>'; }
  /* the alert, worded per state */
  var ALERT = {
    error: { title: 'We couldn’t send your message.', msg: 'Please try again, or email us directly at ' + mail() + '.', retry: true },
    captcha: { title: 'We couldn’t send your message.', msg: 'The security check didn’t go through. Please try again, or email us directly at ' + mail() + '.', retry: true },
    limited: { title: 'You’ve sent a few messages in a short time.', msg: 'Please try again in a few minutes, or email us directly at ' + mail() + '.', retry: false },
    offline: { title: 'You seem to be offline.', msg: 'Please check your connection and try again, or email us directly at ' + mail() + '.', retry: true },
    invalid: { title: 'We couldn’t send your message.', msg: 'Something in the form wasn’t accepted. Please check your details and try again, or email us directly at ' + mail() + '.', retry: true }
  };

  function init() {
    var form = document.querySelector('.cx-form');
    if (!form) return;
    var body = form.querySelector('.cx-body'), ok = form.querySelector('.cx-success'), alertEl = form.querySelector('.cx-alert');
    var submit = form.querySelector('.cx-submit'), label = form.querySelector('.cx-submit-label'), status = form.querySelector('.cx-status');
    var F = { name: form.querySelector('#cx-name'), email: form.querySelector('#cx-email'), topic: form.querySelector('#cx-topic'), message: form.querySelector('#cx-message') };
    var hp = form.querySelector('#cx-website');
    var tsBox = form.querySelector('#cx-ts'), tsField = form.querySelector('.cx-ts-field'), tsErr = form.querySelector('#cx-turnstile-err');
    var dd = initDropdown(F.topic);

    /* ---------- validation (mirrors the function's checks) ---------- */
    function fieldOf(k) { return form.querySelector('.cx-field[data-f="' + k + '"]'); }
    function setErr(k, msg) {
      var wrap = fieldOf(k), p = wrap.querySelector('.cx-err');
      wrap.classList.toggle('is-invalid', !!msg);
      p.textContent = msg || '';
      if (F[k]) F[k].setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    function check(k) {
      var v = (F[k].value || '').trim();
      if (k === 'name') return v && v.length <= MAX.name ? '' : MSG.name;
      if (k === 'email') return !v ? MSG.emailEmpty : (v.length >= 3 && v.length <= MAX.email && EMAIL_SHAPE.test(v)) ? '' : MSG.email;
      if (k === 'topic') return TOPICS.indexOf(v) > -1 ? '' : MSG.topic;
      if (k === 'message') return v.length >= MIN_MESSAGE && v.length <= MAX.message ? '' : MSG.message;
      return '';
    }
    Object.keys(F).forEach(function (k) {
      F[k].addEventListener('blur', function () { if (F[k].value) setErr(k, check(k)); });
      F[k].addEventListener('input', function () { if (fieldOf(k).classList.contains('is-invalid')) setErr(k, check(k)); });
      F[k].addEventListener('change', function () { if (k === 'topic') setErr(k, check(k)); });
    });

    /* ---------- the character counter ---------- */
    var countEl = form.querySelector('.cx-count'), countN = form.querySelector('.cx-count-n'), countLive = form.querySelector('.cx-count-live');
    var NEAR = MAX.message - 100, lastBand = 0;
    function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    function count() {
      var n = F.message.value.length;
      countN.textContent = fmt(n);
      countEl.classList.toggle('is-near', n >= NEAR && n < MAX.message);
      countEl.classList.toggle('is-full', n >= MAX.message);
      /* announced only when crossing into the last 100 and at the limit */
      var band = n >= MAX.message ? 2 : n >= NEAR ? 1 : 0;
      if (band !== lastBand) {
        countLive.textContent = band === 2 ? 'Character limit reached: 1,500 of 1,500.' : band === 1 ? (MAX.message - n) + ' characters left.' : '';
        lastBand = band;
      }
    }
    F.message.addEventListener('input', count);

    /* ---------- Turnstile (explicit render, one widget, single-use tokens) ---------- */
    var ts = { id: null, token: null, failed: false };
    function tsError(msg) { tsField.classList.toggle('is-invalid', !!msg); tsErr.textContent = msg || ''; }
    function tsRender() {
      if (!window.turnstile || ts.id !== null) return;
      if (!SITEKEY) { ts.failed = true; return; }
      try {
        ts.id = window.turnstile.render(tsBox, {
          sitekey: SITEKEY,
          theme: 'dark',
          /* 'flexible' fills the column (300px minimum); compact below that (the 360px phone) */
          size: tsBox.clientWidth >= 300 ? 'flexible' : 'compact',
          action: 'contact',
          callback: function (t) { ts.token = t; ts.failed = false; tsError(''); },
          'expired-callback': function () { ts.token = null; },
          'timeout-callback': function () { ts.token = null; },
          'error-callback': function () { ts.token = null; ts.failed = true; }
        });
      } catch { ts.failed = true; }
    }
    function tsReset() {
      ts.token = null;
      if (ts.id !== null && window.turnstile) { try { window.turnstile.reset(ts.id); } catch { /* the widget went away */ } }
    }
    (function load() {
      if (window.turnstile) { tsRender(); return; }
      var s = document.createElement('script');
      s.src = TURNSTILE_SRC; s.async = true; s.defer = true;
      s.addEventListener('load', tsRender);
      s.addEventListener('error', function () { ts.failed = true; });
      document.head.appendChild(s);
    })();

    /* ---------- states ---------- */
    function sends() { try { return (JSON.parse(localStorage.getItem(KEY)) || []).filter(function (t) { return Date.now() - t < WINDOW; }); } catch { return []; } }
    function record() { var l = sends(); l.push(Date.now()); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* storage blocked */ } }
    /* the polite status (sending, sent); cleared first so a repeat is announced again */
    var sayT = 0;
    function say(t) { clearTimeout(sayT); status.textContent = ''; if (t) sayT = setTimeout(function () { status.textContent = t; }, 30); }

    /* idle | sending | success | error | limited | offline | invalid */
    function state(st, variant) {
      form.dataset.state = st;
      var sending = st === 'sending', bad = st === 'error' || st === 'limited' || st === 'offline' || st === 'invalid';
      body.hidden = st === 'success';
      ok.hidden = st !== 'success';
      alertEl.hidden = !bad;
      if (bad) {
        var a = ALERT[variant || st];
        alertEl.querySelector('.cx-alert-title').textContent = a.title;
        alertEl.querySelector('.cx-alert-msg').innerHTML = a.msg;
        alertEl.querySelector('.cx-retry').hidden = !a.retry;
      }
      /* aria-disabled, not disabled: a disabled button drops keyboard focus */
      if (sending) submit.setAttribute('aria-disabled', 'true'); else submit.removeAttribute('aria-disabled');
      submit.setAttribute('aria-busy', sending ? 'true' : 'false');
      label.textContent = sending ? 'Sending…' : 'Send message';
      Object.keys(F).forEach(function (k) { F[k].readOnly = sending; });
      F.topic.disabled = sending;
      if (dd) dd.sync();
      if (sending) say('Sending your message…');
      else if (st === 'success') {
        say('Message sent. Thanks, we’ll get back to you soon.');
        setTimeout(function () { try { ok.focus({ preventScroll: false }); } catch { /* ignore */ } }, 30);
      } else say('');
    }

    /* the request: one attempt, with a timeout so 'sending' cannot hang */
    function send(data) {
      var ctl = window.AbortController ? new AbortController() : null, timer = 0;
      if (ctl) timer = setTimeout(function () { ctl.abort(); }, TIMEOUT_MS);
      return fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'omit',
        cache: 'no-store',
        signal: ctl ? ctl.signal : undefined
      }).then(function (r) {
        clearTimeout(timer);
        return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j || {} }; });
      }, function (e) {
        clearTimeout(timer);
        /* no response at all: offline, a timeout, a blocked request, or a
           disallowed origin (no CORS header) */
        return { status: 0, offline: navigator.onLine === false, timeout: !!(e && e.name === 'AbortError') };
      });
    }
    function outcome(r) {
      if (r.status === 200 && r.body && r.body.ok === true) return 'success';
      if (r.status === 0) return r.offline ? 'offline' : 'error';
      if (r.status === 400) return 'invalid';
      if (r.status === 403) return 'captcha';
      if (r.status === 429) return 'limited';
      return 'error'; /* 5xx, an unexpected status, or a 2xx without ok:true */
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.dataset.state === 'sending') return;
      var bad = null;
      Object.keys(F).forEach(function (k) { var m = check(k); setErr(k, m); if (m && !bad) bad = k; });
      if (bad) { state('idle'); focusField(bad); return; }
      /* the honeypot: the function answers 200 and stores nothing, so nothing is sent */
      if (hp.value) { state('success'); return; }
      if (sends().length >= LIMIT) { state('limited'); return; }
      if (navigator.onLine === false) { state('offline'); return; }
      if (!ts.token) {
        tsError(ts.failed || !SITEKEY ? MSG.turnstileFailed : MSG.turnstile);
        state('idle');
        try { tsBox.focus({ preventScroll: false }); } catch { /* ignore */ }
        return;
      }
      tsError('');
      var data = {
        topic: F.topic.value,
        name: F.name.value.trim(),
        email: F.email.value.trim(),
        message: F.message.value.trim(),
        turnstileToken: ts.token,
        website: hp.value,
        source: 'atraxia'
      };
      state('sending');
      send(data).then(function (r) {
        var o = outcome(r);
        tsReset(); /* a token is redeemed by every attempt, success or not */
        if (o === 'success') { record(); state('success'); return; }
        if (o === 'limited') { record(); state('limited'); return; }
        if (o === 'invalid') {
          /* flat 400: re-check the fields so anything the page can name is named */
          Object.keys(F).forEach(function (k) { setErr(k, check(k)); });
          state('invalid');
          return;
        }
        if (o === 'captcha') { state('error', 'captcha'); return; }
        state(o);
      });
    });

    function focusField(k) {
      if (k === 'topic' && dd) { dd.focus(); return; }
      try { F[k].focus(); } catch { /* ignore */ }
    }

    form.querySelector('.cx-again').addEventListener('click', function () {
      form.reset();
      Object.keys(F).forEach(function (k) { setErr(k, ''); });
      tsError(''); count(); state('idle');
      F.name.focus();
    });

    /* ---------- Copy email ---------- */
    var live = document.querySelector('.cx-copied-live');
    function copied(btn, good) {
      var lab = btn.querySelector('[data-copy-label]');
      clearTimeout(btn.__t);
      if (!good) {
        if (live) live.textContent = 'Couldn’t copy. The address is ' + EMAIL + '.';
        btn.__t = setTimeout(function () { if (live) live.textContent = ''; }, 4000);
        return;
      }
      if (btn.hasAttribute('data-tip')) btn.setAttribute('data-tip', 'Copied');
      btn.classList.add('is-copied');
      if (lab) lab.textContent = 'Copied';
      if (live) live.textContent = 'Email address copied';
      btn.__t = setTimeout(function () {
        btn.classList.remove('is-copied');
        if (lab) lab.textContent = 'Copy email';
        if (btn.hasAttribute('data-tip')) btn.setAttribute('data-tip', 'Copy email');
        if (live) live.textContent = '';
      }, 1800);
    }
    function copy(btn) {
      function fallback() {
        var t = document.createElement('textarea'), done = false;
        t.value = EMAIL; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(t); t.select();
        try { done = document.execCommand('copy'); } catch { done = false; }
        t.remove();
        copied(btn, done);
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(EMAIL).then(function () { copied(btn, true); }, fallback);
      else fallback();
    }
    [].forEach.call(document.querySelectorAll('[data-copy]'), function (b) { b.addEventListener('click', function () { copy(b); }); });

    /* ---------- CN1 v2: keep the active field above the on-screen keyboard ---------- */
    var vv = window.visualViewport;
    function keep() {
      var a = document.activeElement;
      if (!a || !form.contains(a) || !vv) return;
      var r = a.getBoundingClientRect(), bottom = vv.height - 16;
      if (r.bottom > bottom) scrollBy({ top: r.bottom - bottom + 24, behavior: Atx.reduced() ? 'instant' : 'smooth' });
    }
    if (vv) vv.addEventListener('resize', keep);
    form.addEventListener('focusin', function () { setTimeout(keep, 280); });

    count();
    state('idle');
  }

  /* ---------- CN1 v3: the topic dropdown ----------
     The native select stays the form value (validation, submit, reset); this
     is its view: a button with a listbox, arrow keys, Home/End, type to jump,
     Enter/Space to pick, Escape to close, a bottom sheet on phones. */
  function initDropdown(sel) {
    if (!sel) return null;
    var host = sel.parentNode, dd = document.createElement('div');
    dd.className = 'cx-dd';
    var opts = [].slice.call(sel.options).filter(function (o) { return !o.disabled; });
    dd.innerHTML = '<button type="button" class="cx-dd-btn is-empty" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="cx-topic-lab cx-dd-val" aria-describedby="cx-topic-err" aria-controls="cx-dd-list" id="cx-dd-btn"><span class="cx-dd-val" id="cx-dd-val"></span><span class="cx-dd-chev" aria-hidden="true"></span></button>' +
      '<div class="cx-dd-scrim" aria-hidden="true"></div><ul class="cx-dd-list" role="listbox" id="cx-dd-list" tabindex="-1" aria-labelledby="cx-topic-lab"><li class="cx-dd-head" aria-hidden="true">Topic</li>' +
      opts.map(function (o, i) { return '<li class="cx-dd-opt" role="option" id="cx-dd-o' + i + '" data-v="' + o.value + '" aria-selected="false">' + o.textContent + '</li>'; }).join('') + '</ul>';
    host.appendChild(dd);
    var lab = document.getElementById('cx-topic-lab');
    if (lab) lab.setAttribute('for', 'cx-dd-btn');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');
    var btn = dd.querySelector('.cx-dd-btn'), val = dd.querySelector('.cx-dd-val'), items = [].slice.call(dd.querySelectorAll('.cx-dd-opt')), act = -1;
    var ph = (sel.options[0] && sel.options[0].disabled) ? sel.options[0].textContent : 'Choose a topic';
    function sync() {
      var v = sel.value;
      val.textContent = v ? sel.options[sel.selectedIndex].textContent : ph;
      btn.classList.toggle('is-empty', !v);
      items.forEach(function (it) { it.setAttribute('aria-selected', it.getAttribute('data-v') === v ? 'true' : 'false'); });
      var inv = sel.getAttribute('aria-invalid');
      if (inv) btn.setAttribute('aria-invalid', inv); else btn.removeAttribute('aria-invalid');
      btn.disabled = sel.disabled;
    }
    function setAct(i) {
      act = i;
      items.forEach(function (it, k) { it.classList.toggle('is-active', k === i); });
      if (i > -1) btn.setAttribute('aria-activedescendant', items[i].id); else btn.removeAttribute('aria-activedescendant');
    }
    function open() {
      if (btn.disabled) return;
      dd.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      var k = items.findIndex(function (it) { return it.getAttribute('aria-selected') === 'true'; });
      setAct(k > -1 ? k : 0);
    }
    function close(f) {
      dd.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      setAct(-1);
      if (f) { try { btn.focus({ preventScroll: true }); } catch { /* ignore */ } }
    }
    function pick(i) {
      sel.value = items[i].getAttribute('data-v');
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      sync();
      close(true);
    }
    btn.addEventListener('click', function () { if (dd.classList.contains('is-open')) close(true); else open(); });
    btn.addEventListener('keydown', function (e) {
      if (dd.classList.contains('is-open')) { listKey(e); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
    function listKey(e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAct(Math.min(items.length - 1, act + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(Math.max(0, act - 1)); }
      else if (e.key === 'Home') { e.preventDefault(); setAct(0); }
      else if (e.key === 'End') { e.preventDefault(); setAct(items.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (act > -1) pick(act); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (e.key === 'Tab') close(false);
      else if (/^[a-z]$/i.test(e.key)) { var k = items.findIndex(function (it) { return it.textContent.toLowerCase()[0] === e.key.toLowerCase(); }); if (k > -1) setAct(k); }
    }
    items.forEach(function (it, i) {
      it.addEventListener('pointerenter', function () { setAct(i); });
      it.addEventListener('click', function () { pick(i); });
    });
    dd.querySelector('.cx-dd-scrim').addEventListener('click', function () { close(true); });
    document.addEventListener('pointerdown', function (e) { if (dd.classList.contains('is-open') && !dd.contains(e.target)) close(false); }, true);
    new MutationObserver(sync).observe(sel, { attributes: true });
    sel.addEventListener('change', sync);
    /* form.reset() changes the value without an event */
    if (sel.form) sel.form.addEventListener('reset', function () { setTimeout(sync, 0); });
    sync();
    return { sync: sync, focus: function () { try { btn.focus(); } catch { /* ignore */ } } };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
