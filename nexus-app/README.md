# Opportunity Intelligence (Nexus version)

This folder is the version of Opportunity Intelligence that runs inside TVB Nexus, at
`test.nexus.theventurebuild.com/opintel` (and later `nexus.theventurebuild.com/opintel`).
It uses the Nexus team login, the Nexus database and the staff-only `opintel-api` backend function.
Who may open it is set per person in Nexus Admin > Team.

- **Branch `test`** auto-deploys to its own AWS Amplify app. The Nexus main site proxies
  `/opintel/*` to that app, so the address stays on the Nexus domain and the login carries over.
- **Promote to production** by merging `test` into `main` only when Somesh approves.
- The app code is in `src/opintel`. The other files in `src` (Supabase client, app access, UI parts,
  styles) are copies from `tvb-nexus-active`; keep them in step with it.
- Sign-in is on the main site (`/auth`), so open the tool through the Nexus domain, not the
  amplifyapp.com address.

```sh
npm install
cp .env.example .env   # public Supabase URL, publishable key and project id (same as the main site)
npm run dev            # http://localhost:8080/opintel/
npm run build          # dist/opintel/
```

Version 0.4.2, moved out of `tvb-nexus-active` (`src/opintel`) on 2026-11-23.
