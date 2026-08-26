# Security notes for this repo

This repository is public and deploys to GitHub Pages, which serves static
files only — there is no server to hold secrets. Everything in the built
JavaScript bundle is readable by anyone who visits the site.

## Safe to have in this repo

- All current app code and mock/demo data — health metrics, professionals,
  gyms, food items, etc. are fictional placeholders, not real user or
  client data.
- Publishable/anon API keys for services explicitly designed to be used
  from a browser (e.g. a Supabase anon key, a Firebase client config, an
  Auth0 client ID) — these are meant to be public and are only useful
  alongside server-side rules (RLS policies, auth rules) that actually
  enforce access control.
- Non-sensitive configuration (feature flags, public URLs).

## Must never go in this repo

- API keys, tokens or credentials that grant elevated/admin access
  (service-role keys, database passwords, private API secrets, webhook
  signing secrets).
- Real user data of any kind — names, emails, health data, payment info.
  Mock/demo data must stay obviously fictional (see the pattern already
  used in `src/data/`).
- `.env` (git-ignored — copy `.env.example` to `.env` locally and fill in
  real values there, never in a tracked file).

## Auth & backend

This prototype currently has no real authentication or backend — the
onboarding flow just sets a local flag, and all state lives in
`localStorage`. A static site like this one **cannot** hold secrets or run
server-side logic, so real auth and any persistent user data must be
added via an external, secured provider — Supabase, Firebase Auth, or
Auth0 are reasonable options — never by embedding backend credentials in
the shipped bundle or faking authentication client-side.

## Before every commit

Review the diff for anything that looks like a secret, credential,
internal URL, or personal data before pushing — `git diff --staged` after
staging, not just `git status`.

## Dependency vulnerabilities

Run `npm audit` periodically and address high-severity findings before
they ship.
