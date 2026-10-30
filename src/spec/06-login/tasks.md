# Tasks — Feature 06: Supabase Login & RBAC

## Track Separation

Two parallel tracks exist but have a hard dependency at the integration gate (Phase 4).  
The **Supabase track** must reach Phase 3 before the PWA track can be tested end-to-end.

```
SUPABASE TRACK                           PWA TRACK
─────────────────                        ────────────────────────────────
Phase 1: DB Schema                       Phase 2: TypeScript Foundation
Phase 3: Supabase Project Config         Phase 4 (parallel): Services + UI
                   ↘                    ↙
                Phase 5: Integration & E2E
                Phase 6: CI/CD Pipeline
                Phase 7: Production Go-Live
```

---

## SUPABASE TRACK

### Phase 1 — Database Schema & Seed

These tasks produce everything needed in Supabase's PostgreSQL before any frontend code runs.

#### S1.1 — Create migration file skeleton
- Create `supabase/migrations/20261026120000_create_users_roles_permissions.sql`
- Confirm the `supabase/` directory exists in the repo root; create it if not
- Add `supabase/` to `.gitignore` exclusion allowlist (i.e. **do not** gitignore it — migrations are committed)
- **Deliverable:** empty migration file at the correct path

#### S1.2 — Write table DDL (users, roles, permissions, role_permissions)
Implement in the migration file from S1.1:
- `roles` table: `id uuid PK`, `name text UNIQUE NOT NULL`
- `permissions` table: `id uuid PK`, `name text UNIQUE NOT NULL`
- `role_permissions` join table: `role_id uuid FK→roles`, `permission_id uuid FK→permissions`, composite PK
- `users` table: `id uuid PK` (matches `auth.users.id`), `role_id uuid FK→roles ON DELETE SET NULL`, `created_at timestamptz`
- All tables use `CREATE TABLE IF NOT EXISTS`
- **Deliverable:** runnable DDL in the migration file

#### S1.3 — Add Row Level Security policies
Add to the same migration file (after the DDL):
```sql
-- roles, permissions, role_permissions: public SELECT
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles: read by all" ON roles FOR SELECT USING (true);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions: read by all" ON permissions FOR SELECT USING (true);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions: read by all" ON role_permissions FOR SELECT USING (true);

-- users: each user owns their row only
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users: own row only" ON users FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```
- **Deliverable:** RLS policies inside the migration file

#### S1.4 — Write seed file
- Create `supabase/seed.sql`
- Insert three roles: `student`, `sys-admin`, `guest` (use `gen_random_uuid()` for IDs or fixed UUIDs for repeatability)
- Insert three permissions: `play-fight-list`, `edit-fight-list`, `share-fight-list`
- Wire `role_permissions`:
  - `student` → `play-fight-list`, `edit-fight-list`
  - `sys-admin` → all three
  - `guest` → (none)
- All inserts use `ON CONFLICT DO NOTHING` for idempotency
- **Deliverable:** `supabase/seed.sql` runnable against a clean or existing DB

#### S1.5 — Apply migration + seed to SFT-DEV and verify
- Install Supabase CLI: `npm install --save-dev supabase` (pin version in package.json)
- Add convenience scripts to `package.json`:
  ```json
  "migrate:dev":  "supabase db push --db-url $SFT_DEV_DB_URL",
  "seed:dev":     "psql $SFT_DEV_DB_URL -f supabase/seed.sql"
  ```
- Run migration and seed against SFT-DEV
- Verify in Supabase dashboard: four tables exist, seed data is present, RLS is enabled
- **Deliverable:** SFT-DEV schema live and verified

---

### Phase 3 — Supabase Project Configuration

> Phase 3 is numbered after Phase 2 (PWA Foundation) because the two phases run in parallel. Phase 3 produces the Supabase-side config that Phase 4 integration depends on.

#### S3.1 — Enable Google OAuth in SFT-DEV
- In the SFT-DEV Supabase dashboard → Authentication → Providers → Google
- Create a Google Cloud OAuth client (if not already done): set Authorised redirect URI to `https://<sft-dev-project-id>.supabase.co/auth/v1/callback`
- Paste Client ID and Client Secret into the Supabase Google provider form
- Also add `http://localhost:5173` to Supabase → Authentication → URL Configuration → Redirect URLs
- **Deliverable:** Google OAuth working in SFT-DEV; test with the Supabase "Test OAuth" button

#### S3.2 — Enable Google OAuth in SFT (production)
- Mirror S3.1 for the SFT Supabase project
- Set redirect URLs to the production domain (Vercel URL or custom domain)
- **Deliverable:** Google OAuth working in SFT (production)

#### S3.3 — Apply migration + seed to SFT (production)
- Run the same migration and seed against SFT
- Verify in SFT dashboard: four tables, seed data, RLS enabled
- **Deliverable:** SFT (production) schema live and verified

---

## PWA TRACK

### Phase 2 — TypeScript Foundation

These tasks create the type contracts and pure-logic utilities before anything touches Supabase.

#### P2.1 — Create `src/types/auth.ts`
Implement all types and interfaces as defined in `design.md §2`:
- `AuthState` type
- `Permission` union type
- `Role` interface
- `AppUser` interface
- `AuthStateChangedPayload` interface
- `AuthStateObserver` interface
- `IAuthReader` interface
- `IAuthCommands` interface
- `IPermissionReader` interface
- `IPermissionWriter` interface
- `IUserRepository` interface
- `IAuthProvider` interface
- **Deliverable:** `src/types/auth.ts` compiles with zero errors; `npm run type-check` passes

#### P2.2 — Create `PermissionService` (`src/services/PermissionService.ts`)
- Implement `PermissionServiceImpl` (private class)
- Export `permissionReader: IPermissionReader` and `permissionWriter: IPermissionWriter`
- Both references share the same singleton instance
- Logic: `setPermissions`, `hasPermission`, `getPermissions`
- No Supabase imports — pure in-memory
- **Deliverable:** file compiles; manual smoke-test: `permissionWriter.setPermissions(['play-fight-list'])` → `permissionReader.hasPermission('play-fight-list')` returns `true`

#### P2.3 — Create `AuthEventBus` (`src/services/AuthEventBus.ts`)
- Implement `subscribe(observer): () => void` and `emit(payload)` methods
- Use a `Set<AuthStateObserver>` internally
- No Supabase imports
- **Deliverable:** file compiles; `npm run type-check` passes

#### P2.4 — Install `@supabase/supabase-js`
- `npm install --save-exact @supabase/supabase-js` (pin exact version)
- Verify the package appears in `package.json` `dependencies` (not `devDependencies`)
- **Deliverable:** package installed; `import { createClient } from '@supabase/supabase-js'` compiles

#### P2.5 — Create `.env.example`
- Create `.env.example` at the repo root:
  ```
  VITE_SUPABASE_URL=https://<project-id>.supabase.co
  VITE_SUPABASE_ANON_KEY=<your-anon-key>
  ```
- Commit this file
- Update `.gitignore` to include `.env.development` and `.env.production` (not just `.env.local` variants)
- **Deliverable:** `.env.example` committed; `.gitignore` updated; real credentials never in source control

---

### Phase 4 — Services & UI Components

Dependencies: Phase 2 complete, SFT-DEV has schema (S1.5) and Google OAuth enabled (S3.1).  
P4 tasks can start before S3.2/S3.3 — production Supabase config is only needed for Phase 7.

#### P4.1 — Create `SupabaseClientFactory` (`src/services/SupabaseClientFactory.ts`)
- Implement `static create(): SupabaseClient` as in `design.md §3`
- Validates both env vars; throws a descriptive error if either is missing
- **Deliverable:** factory compiles; missing env var test: set one var empty → confirm error message in console

#### P4.2 — Create `GoogleAuthProvider` (`src/services/GoogleAuthProvider.ts`)
- Implements `IAuthProvider`
- `getSession()`, `signIn()` (Google OAuth with redirect), `signOut()`, `onAuthEvent()`
- `signIn()` passes `options: { redirectTo: window.location.origin }`
- **Deliverable:** file compiles; can be constructed in browser console (`new GoogleAuthProvider(supabase)`) without errors

#### P4.3 — Create `SupabaseUserRepository` (`src/services/SupabaseUserRepository.ts`)
- Implements `IUserRepository`
- `upsertUser(userId)`: resolve student role id, upsert row with `ignoreDuplicates: true`
- `loadPermissionsForUser(userId)`: nested join `users → roles → role_permissions → permissions`
- `loadGuestPermissions()`: guest role join query
- **Deliverable:** file compiles; calling `upsertUser` with a real SFT-DEV userId (from a test login) inserts a row; calling `loadPermissionsForUser` returns `['play-fight-list', 'edit-fight-list']`

#### P4.4 — Create `UserService` (`src/services/UserService.ts`)
- Implements `ensureUser(user)` and `loadGuestRole()`
- `ensureUser` calls `repo.upsertUser` then `repo.loadPermissionsForUser`; on error falls back to `STUDENT_FALLBACK_PERMISSIONS`
- `loadGuestRole` calls `repo.loadGuestPermissions`; on error falls back to `[]`
- **Deliverable:** file compiles with all types satisfied

#### P4.5 — Create `AuthService` (`src/services/AuthService.ts`)
- Implements `IAuthReader`, `IAuthCommands`
- `init()`: registers `onAuthEvent` listener, calls `getSession()` for returning users
- `signInWithGoogle()`, `signOut()`, `notifyGuestDismissed()`
- `emitCurrentState()` private helper
- `destroy()` unregisters listener
- **Deliverable:** file compiles; no circular imports; `npm run type-check` passes

#### P4.6 — Create `AuthServiceFactory` (`src/services/AuthServiceFactory.ts`)
- Wires all concrete dependencies: `SupabaseClientFactory → GoogleAuthProvider → SupabaseUserRepository → UserService → AuthEventBus → AuthService`
- Returns `{ authService, eventBus }`
- `app.ts` imports only this factory and interface types
- **Deliverable:** file compiles; wiring is the only place concrete types are imported together

#### P4.7 — Create `LoginModal` component (`src/components/LoginModal.ts`)
- Bootstrap 5 modal markup (consistent with `ConfirmModal.ts` pattern)
- Title, Google sign-in button (`btn btn-danger`), ✕ close button
- Non-dismissible backdrop (`data-bs-backdrop="static"`)
- Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-label="Close"`
- On sign-in click: call `IAuthCommands.signInWithGoogle()`, show loading indicator, show inline `alert-danger` on error
- On ✕ click: call `IAuthCommands.notifyGuestDismissed()`, close modal
- Implements `AuthStateObserver` → hides itself when payload `state === 'authenticated'`
- **Deliverable:** modal renders and opens/closes correctly; backdrop does not close it

#### P4.8 — Create `LoginButton` component (`src/components/LoginButton.ts`)
- Guest state: `btn btn-outline-light btn-sm` with "Sign In" + `fa-sign-in-alt` icon
- Authenticated state: display name (max 16 chars + ellipsis) + `fa-user-circle` icon (no sign-out button here — that is handled by `LogoutButton`)
- Max 200px width; `position: absolute; top: 50%; left: 1rem; transform: translateY(-50%)`
- `aria-label` reflects current state
- Implements `AuthStateObserver`
- **Deliverable:** button renders correctly in both states; updates without page reload

#### P4.8b — Create `LogoutButton` component (`src/components/LogoutButton.ts`)
- Rendered in the top-right corner of `<header>` via the `#logout-button-container` hook element
- Visible only when auth state is `authenticated`; renders empty (`innerHTML = ''`) when guest
- Markup: `btn btn-outline-light btn-sm` + `fa-sign-out-alt` icon + "Logout" text label
- `aria-label="Log out"` for screen reader accessibility
- Max 120px width; positioning controlled by `#logout-button-container` inline styles in `index.html` (`position: absolute; top: 50%; right: 1rem; transform: translateY(-50%)`)
- On click: calls `IAuthCommands.signOut()` via injected `onLogout` callback
- Implements `AuthStateObserver`: `show()` on `authenticated`, `hide()` on `guest`
- **Deliverable:** button appears immediately after sign-in and disappears immediately after sign-out, without a page reload; hidden on all guest states

#### P4.9 — Create `GuestPromoBar` component (`src/components/GuestPromoBar.ts`)
- Full-width bar below `<header>`: `alert alert-info alert-dismissible text-center`, zero border-radius
- Text: "Please log in to discover more features" + "Sign In" link/button
- Dismiss (✕) button: `aria-label="Dismiss"`; hides for session (no `localStorage` persistence)
- Implements `AuthStateObserver` → removes from DOM on `state === 'authenticated'`
- **Deliverable:** bar renders when guest; disappears on sign-in without reload

#### P4.10 — Create `AuthUIManager` (`src/managers/AuthUIManager.ts`)
- Constructs `LoginModal`, `LoginButton`, `LogoutButton`, and `GuestPromoBar` from DOM hook elements
- Registers all four components as observers on `AuthEventBus`
- Reads initial auth state from `IAuthReader` for first render (LoginButton and LogoutButton both call their `render()` on init)
- Exposes `showLoginModal()` for `app.ts` to call post-init
- **Deliverable:** `authUIManager.init()` wires all components without errors; LogoutButton is hidden on first render when auth state is guest

#### P4.11 — Update `index.html`
- Add `<div id="auth-controls"></div>` inside `<header>` with left-anchor inline styles
- Add `<div id="logout-button-container"></div>` inside `<header>` with right-anchor inline styles (`position: absolute; top: 50%; right: 1rem; transform: translateY(-50%); max-width: 120px`)
- Add `<div id="guest-promo-bar"></div>` immediately below `<header>`
- Add `<div id="login-modal-container"></div>` anywhere in `<body>`
- Add `style="position: relative;"` to the `<header>` element to anchor both absolute-positioned containers
- **Deliverable:** `index.html` has all four hook elements; existing centered title layout unchanged on desktop and mobile

#### P4.12 — Update `src/app.ts`
- Import `AuthServiceFactory` and `AuthUIManager`
- Early in `init()`: call `AuthServiceFactory.create()`, then `await authService.init()` (before `FightListUIManager.init()`)
- After full init: if `authService.getAuthState() === 'guest'` call `authUIManager.showLoginModal()`
- **Deliverable:** `app.ts` boots with auth; permission set is ready before any UI manager initialises

---

## Phase 5 — Integration Testing (Dev Environment)

Dependencies: Phases 2, 3 (S1.5 + S3.1), and 4 all complete.

#### I5.1 — Full OAuth flow on localhost
- Run `npm run dev` with `.env.development` pointing to SFT-DEV
- Confirm: LoginModal appears on first load
- Click "Sign in with Google" → Google OAuth → redirect back → modal closes, LoginButton shows name, promo bar disappears
- Confirm in Supabase dashboard: a row exists in `users` with correct `role_id`

#### I5.2 — Returning user (session persistence)
- Reload the page after sign-in
- Confirm: LoginModal does NOT appear; LoginButton shows authenticated state immediately

#### I5.3 — Sign-out flow
- Click the **Logout** button in the top-right corner of the header
- Confirm: `LogoutButton` disappears immediately, `LoginButton` reverts to "Sign In" state, promo bar re-appears
- Confirm: no page reload required

#### I5.4 — Guest flow
- Open in incognito (fresh session)
- Dismiss LoginModal with ✕
- Confirm: guest state, promo bar visible, no `users` row created
- Confirm: `permissionReader.hasPermission('play-fight-list')` returns `false` (guest has no permissions)

#### I5.5 — Permission gate smoke-test
- Sign in as student
- In browser console: `window.__permissionReader.hasPermission('edit-fight-list')` → `true`
- `window.__permissionReader.hasPermission('share-fight-list')` → `false`
- (Expose `permissionReader` on `window` temporarily for this check only, remove before Phase 7)

#### I5.6 — Fallback permissions on DB error
- Temporarily misconfigure DB URL in `.env.development` to simulate connection failure
- Sign in → confirm login still completes; `permissionReader.getPermissions()` returns `['play-fight-list', 'edit-fight-list']` (hardcoded fallback)
- Restore correct URL

---

## Phase 6 — CI/CD Pipeline

Dependencies: Phase 5 complete, GitHub repo has Actions, Vercel/Netlify project connected.

#### C6.1 — Create CI workflow (`.github/workflows/ci.yml`)
- Triggers: `pull_request` and `push` to `main`
- Steps: `npm ci` → `npm run lint` → `npm run type-check` → `npm run test:run`
- **No Supabase credentials in CI** — tests mock `IAuthProvider` and `IUserRepository`
- **Deliverable:** CI passes on a clean PR with no secrets

#### C6.2 — Add GitHub Secrets
Add to repository Settings → Secrets → Actions:

| Secret | Value |
|---|---|
| `SFT_DEV_DB_URL` | Supabase direct DB connection string (SFT-DEV) |
| `SFT_DB_URL` | Supabase direct DB connection string (SFT) |
| `SFT_SUPABASE_URL` | Production project URL |
| `SFT_SUPABASE_ANON_KEY` | Production anon key |
| `NETLIFY_SITE_ID` | Netlify site ID (or Vercel equivalent) |
| `NETLIFY_AUTH_TOKEN` | Netlify deploy token (or Vercel equivalent) |

- **Deliverable:** all six secrets present in GitHub repository settings

#### C6.3 — Create deploy workflow (`.github/workflows/deploy.yml`)
- Trigger: `push` to `main`
- Steps in order:
  1. `npm ci` + lint + type-check + test
  2. `supabase db push` → SFT-DEV (smoke-test)
  3. `supabase db push` → SFT (production)
  4. `npm run build` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from secrets
  5. Deploy `dist/` to Netlify/Vercel
- **Deliverable:** merging a trivial change to `main` runs the full pipeline end-to-end; production is updated

#### C6.4 — Configure Vercel/Netlify preview env vars
- In the hosting dashboard: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Preview environments to SFT-DEV values
- For Production environment: set to SFT values
- **Deliverable:** PR preview builds connect to SFT-DEV; production builds connect to SFT

---

## Phase 7 — Production Go-Live

Dependencies: Phase 6 complete, SFT has schema and Google OAuth (S3.2, S3.3).

#### G7.1 — Final production smoke-test
- Navigate to the production URL
- Perform the full sign-in flow (Google OAuth on SFT project)
- Confirm user row in SFT `users` table
- Confirm sign-out and guest flow

#### G7.2 — Clean up debug code
- Remove any `window.__permissionReader` exposure added in I5.5
- Remove any console.log calls added during development
- Run `npm run lint` to confirm clean

#### G7.3 — Merge `main` → production deploy (via pipeline)
- All changes are on `main`; the C6.3 deploy workflow handles the rest automatically
- Monitor the Actions run; confirm it completes without errors

---

## Dependency Summary

| Task | Blocked by |
|---|---|
| S1.2–S1.4 | S1.1 |
| S1.5 | S1.2, S1.3, S1.4 |
| S3.1, S3.2 | S1.5 |
| S3.3 | S1.5, S3.2 |
| P2.2, P2.3 | P2.1 |
| P2.4 | — (parallel) |
| P4.1, P4.2, P4.3 | P2.4 |
| P4.4 | P4.3, P2.2 |
| P4.5 | P4.2, P4.4, P2.3 |
| P4.6 | P4.1, P4.2, P4.3, P4.4, P4.5 |
| P4.7–P4.9 | P2.1, P2.3 |
| P4.8b | P2.1, P2.3 |
| P4.10 | P4.7, P4.8, P4.8b, P4.9, P4.6 |
| P4.11, P4.12 | P4.10 |
| I5.1–I5.6 | S1.5, S3.1, P4.12 |
| C6.1 | P2.1 (types exist for mock test writing) |
| C6.2 | C6.1 |
| C6.3 | C6.2, I5.1 |
| C6.4 | C6.3 |
| G7.1–G7.3 | C6.4, S3.2, S3.3 |

---

## Quick-Reference: What to Build in What Order

```
Day 1
  ├── S1.1–S1.4   Write migration + seed SQL (no Supabase login needed — just files)
  └── P2.1–P2.3   Write auth types, PermissionService, AuthEventBus (pure TypeScript)

Day 2
  ├── S1.5        Apply migration + seed to SFT-DEV, verify schema
  ├── S3.1        Enable Google OAuth in SFT-DEV
  └── P2.4–P2.5   Install @supabase/supabase-js, create .env.example

Day 3
  └── P4.1–P4.6   Build all services (SupabaseClientFactory → ... → AuthServiceFactory)
                  Can test P4.3 interactively against SFT-DEV

Day 4
  └── P4.7–P4.12  Build UI components (LoginModal, LoginButton, LogoutButton, GuestPromoBar)
                  + AuthUIManager + wire app.ts + update index.html

Day 5
  └── I5.1–I5.6   Full integration test on localhost against SFT-DEV

Day 6
  ├── C6.1–C6.4   CI/CD pipeline
  └── S3.2–S3.3   Enable Google OAuth + apply schema to SFT (production)

Day 7
  └── G7.1–G7.3   Production smoke-test + clean up + ship
```
