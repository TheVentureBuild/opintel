# Opportunity Intelligence (`src/opintel`)

RFP and grant discovery for TVB staff. Upstream app mounted as is at `/opintel/*`, with its own router (`basename="/opintel"`). Read the root `CLAUDE.md` first.

- **Owns:** everything in this folder (about 196 files). Do not refactor its internals; keep it portable for upstream re-syncs.
- **May import:** only its own files and `@/integrations/supabase/client`. Never import from `huntylst`, `cxoscout` or core site folders, and core code must not import from here (except the lazy entry in `App.tsx`).
- **Backend:** `/__tvb/*` bridge calls go to the `opintel-api` edge function (staff roles owner/admin/editor). It covers TED, USAspending, Grants.gov, EU SEDIA, Find a Tender, GLEIF and SEC searches. Vault write is disabled server-side ("refuses honestly"); keep it that way.
- **Tables:** none directly, apart from a `user_roles` check.
- **Secrets:** none of its own.
- **Env:** `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
