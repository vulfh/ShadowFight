# Requirements Document — Feature 06: Supabase Login & RBAC

## Introduction

This feature adds Google OAuth login via Supabase to the ShadowFight Trainer. The app supports two Supabase environments: **SFT-DEV** for local development and **SFT** for production. On first login, the authenticated user is recorded in a `users` table. A permission-based RBAC system is introduced — with a `roles` lookup table and a `permissions` lookup table — to gate future operations. All permission enforcement is client-side for now. Unauthenticated users are assigned the `guest` role automatically.

---

## Glossary

- **AuthService**: A new client-side service (`src/services/AuthService.ts`) responsible for initialising the Supabase client, triggering OAuth, handling auth state changes, and exposing the current user and session.
- **UserService**: A new client-side service (`src/services/UserService.ts`) responsible for upserting the user record in the `users` DB table on first login and for loading the user's role and resolved permission set.
- **PermissionService**: A new client-side service (`src/services/PermissionService.ts`) that exposes `hasPermission(permission: Permission): boolean` based on the currently loaded role. Stateless — reads from the in-memory role loaded by `UserService`.
- **LoginModal**: A Bootstrap modal (`src/components/LoginModal.ts`) rendered on app load if the user is not authenticated. Contains a "Sign in with Google" button and an ✕ close button. Closing without signing in assigns the guest role.
- **LoginButton**: A small button rendered in the top-left of the header. Shows "Sign In" when the user is a guest; shows the user's display name (truncated) and a "Sign Out" option when authenticated.
- **Supabase Environment**: Either the **SFT-DEV** Supabase project (used during local development, configured via Vite env vars) or the **SFT** Supabase project (production). Switching is handled entirely through environment variables — no code branching.
- **AppUser**: The application-level user record stored in the `users` table. Distinct from Supabase's `auth.users`.
- **Role**: A named set of permissions. Stored in the `roles` lookup table. Currently three roles: `student`, `sys-admin`, `guest`.
- **Permission**: An atomic capability string. Stored in the `permissions` lookup table. Currently: `play-fight-list`, `edit-fight-list`, `share-fight-list`.
- **role_permissions**: A join table that maps each role to its set of permissions.
- **Guest Session**: When a user dismisses the LoginModal without authenticating. The app runs with the `guest` role permissions loaded from the DB. No `users` table row is created for guests.
- **Auth State**: The runtime auth state held in memory by `AuthService`. One of: `loading`, `guest`, `authenticated`.

---

## Database Schema

### Table: `users`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK. Matches `auth.users.id` from Supabase. |
| `role_id` | `uuid` | FK → `roles.id`. Default: student role id. |
| `created_at` | `timestamptz` | Set once on insert. |

### Table: `roles`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK. |
| `name` | `text` | Unique. Values: `student`, `sys-admin`, `guest`. |

### Table: `permissions`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK. |
| `name` | `text` | Unique. Values: `play-fight-list`, `edit-fight-list`, `share-fight-list`. |

### Table: `role_permissions`
| Column | Type | Notes |
|---|---|---|
| `role_id` | `uuid` | FK → `roles.id`. |
| `permission_id` | `uuid` | FK → `permissions.id`. |
| (composite PK: `role_id`, `permission_id`) | | |

### Seed data
| Role | Permissions |
|---|---|
| `student` | `play-fight-list`, `edit-fight-list` |
| `sys-admin` | `play-fight-list`, `edit-fight-list`, `share-fight-list` |
| `guest` | *(none)* |

---

## Supabase Environment Configuration

Two Vite environment variable files control which Supabase project is targeted:

- `.env.development` → `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` pointing to the **SFT-DEV** project.
- `.env.production` → same keys pointing to the **SFT** project.

`AuthService` initialises the Supabase client using `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`. No code branching is needed — Vite selects the correct file at build time.

---

## Requirements

---

### Requirement 1: Supabase Client Initialisation

**User Story:** As a developer, I want the Supabase client to be initialised once at app startup using environment-specific credentials, so that all auth and DB operations use the correct project without any code changes between environments.

#### Acceptance Criteria

1. THE `AuthService` SHALL initialise a single `SupabaseClient` instance using `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` at construction time.
2. THE Supabase client instance SHALL be a singleton: only one instance is created for the lifetime of the app, shared across `AuthService` and `UserService`.
3. IF `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing at runtime, THEN `AuthService` SHALL throw a descriptive error during `init()` that halts app startup with a visible console message.
4. `.env.development` SHALL contain the SFT-DEV project URL and anon key; `.env.production` SHALL contain the SFT project URL and anon key. Both files SHALL be listed in `.gitignore`.
5. THE `@supabase/supabase-js` package SHALL be added as a production dependency pinned to an exact version.

---

### Requirement 2: Login Modal

**User Story:** As a user opening the app, I want a login prompt to appear so that I can sign in with Google before using the app, with the option to dismiss and continue as a guest.

#### Acceptance Criteria

1. WHEN the app finishes initialising and the auth state is `guest` (no active Supabase session), THE `LoginModal` SHALL be displayed automatically.
2. THE `LoginModal` SHALL contain: a title ("Sign in to ShadowFight Trainer"), a "Sign in with Google" button with the Google icon, and an ✕ close button in the top-right corner.
3. WHEN the user clicks "Sign in with Google", THE `AuthService` SHALL call `supabase.auth.signInWithOAuth({ provider: 'google' })`. The modal SHALL remain open and show a loading indicator until the OAuth redirect completes or an error is returned.
4. WHEN the user clicks the ✕ close button without signing in, THE `LoginModal` SHALL close and THE `AuthService` SHALL set auth state to `guest` with the `guest` role loaded from the DB.
5. THE `LoginModal` SHALL use Bootstrap 5 modal markup (`modal`, `modal-dialog`, `modal-content`, `modal-header`, `modal-body`) consistent with the existing `ConfirmModal` pattern in `src/components/ConfirmModal.ts`.
6. THE `LoginModal` SHALL NOT be dismissible by clicking the backdrop (only via the ✕ button), so the user makes an explicit choice.
7. IF the OAuth call returns an error, THE `LoginModal` SHALL display the error message inline using Bootstrap `alert alert-danger`, without closing the modal.
8. THE `LoginModal` SHALL be accessible: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title element.
9. WHEN an authenticated Supabase session already exists on app load (returning user), THE `LoginModal` SHALL NOT be shown.

---

### Requirement 3: Guest Promo Bar

**User Story:** As an unauthenticated user, I want to see a persistent top-docked bar prompting me to sign in, so that I am aware there are additional features available behind authentication.

#### Acceptance Criteria

1. WHEN auth state is `guest`, A top-docked promo bar SHALL be displayed immediately below the `<header>`, spanning the full viewport width, containing the text "Please log in to discover more features" and a "Sign In" link/button that opens the `LoginModal`.
2. THE promo bar SHALL use Bootstrap classes `alert alert-info alert-dismissible` (or equivalent) with `text-center` and zero border-radius to achieve a full-width flush-docked appearance.
3. THE promo bar SHALL contain a dismiss (✕) button on the right side. WHEN dismissed, the bar SHALL hide for the remainder of the session (no persistence across page reloads — it reappears on next load if the user is still a guest).
4. WHEN auth state changes to `authenticated` (sign-in completes), THE promo bar SHALL be removed from the DOM automatically without a page reload.
5. THE promo bar SHALL NOT be shown when auth state is `authenticated`.
6. THE promo bar SHALL be injected into the DOM by `AuthUIManager` (or `AuthService`) during `init()`, after auth state is resolved, so it is in the correct initial state from first paint.
7. THE promo bar SHALL be accessible: the dismiss button SHALL have `aria-label="Dismiss"` and the "Sign In" link SHALL have descriptive text (not just an icon).

---

### Requirement 4: Login Button (Header)

**User Story:** As a user, I want a persistent login/logout control in the header so that I can always see my auth status and sign in or out at any time.

#### Acceptance Criteria

1. THE `LoginButton` SHALL be rendered in the top-left of the `<header>` row, using `position: absolute; top: 50%; left: 1rem; transform: translateY(-50%)` so it does not disturb the existing centered title layout.
2. WHEN auth state is `guest`, THE `LoginButton` SHALL render as a small Bootstrap `btn btn-outline-light btn-sm` button labelled "Sign In" with a `fa-sign-in-alt` icon.
3. WHEN auth state is `authenticated`, THE `LoginButton` SHALL render as a small button showing the user's Google display name (truncated to 16 characters with ellipsis if longer) alongside a `fa-user-circle` icon, plus a "Sign Out" link or secondary button adjacent to it.
4. WHEN the "Sign In" button is clicked, THE `LoginModal` SHALL be shown (same modal as on first load).
5. WHEN the "Sign Out" button is clicked, THE `AuthService` SHALL call `supabase.auth.signOut()`. After sign-out completes, auth state SHALL revert to `guest` and the `LoginButton` SHALL update to the "Sign In" state.
6. THE `LoginButton` area SHALL not exceed 200px width to avoid overlapping the centered title on small viewports.
7. THE `LoginButton` SHALL update reactively whenever auth state changes — no page reload required.

---

### Requirement 13: Logout Button (Top-Right Corner)

**User Story:** As a logged-in user, I want a small, always-visible Logout button in the top-right corner of the header so that I can sign out quickly without searching for a menu or control.

#### Acceptance Criteria

1. WHEN auth state is `authenticated`, A `LogoutButton` SHALL be rendered in the top-right corner of the `<header>`, using `position: absolute; top: 50%; right: 1rem; transform: translateY(-50%)` so it does not disturb the existing centered title layout.
2. THE `LogoutButton` SHALL render as a small Bootstrap `btn btn-outline-light btn-sm` button labelled "Logout" with a `fa-sign-out-alt` icon to its left.
3. WHEN auth state is `guest`, THE `LogoutButton` SHALL be hidden (not rendered or set to `display: none`) — it is visible only to authenticated users.
4. WHEN the user clicks the `LogoutButton`, THE `AuthService.signOut()` SHALL be called. After sign-out completes, auth state SHALL revert to `guest`, the `LogoutButton` SHALL be hidden, and the `LoginButton` SHALL update to the "Sign In" state.
5. THE `LogoutButton` SHALL be reactive — it shows or hides automatically whenever auth state changes, without a page reload.
6. THE `LogoutButton` SHALL use `btn btn-outline-light btn-sm` to match the header's `bg-dark` background and remain visually consistent with the `LoginButton`.
7. THE `LogoutButton` SHALL have `aria-label="Log out"` for screen reader accessibility.
8. THE `LogoutButton` SHALL be keyboard-operable (reachable via Tab, activatable with Enter/Space).
9. THE `LogoutButton` width SHALL not exceed 120px to avoid overlapping the centered title on small viewports.

---

### Requirement 5: Google OAuth Flow

**User Story:** As a user, I want to authenticate with my Google account so that my identity is verified without managing a separate password.

#### Acceptance Criteria

1. THE `AuthService` SHALL use `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })` to initiate the OAuth flow.
2. WHEN the OAuth redirect returns to the app, THE Supabase client SHALL automatically handle the session from the URL fragment. `AuthService` SHALL listen to `supabase.auth.onAuthStateChange` and react to the `SIGNED_IN` event.
3. WHEN a `SIGNED_IN` event fires, `AuthService` SHALL set auth state to `authenticated`, extract the `user` object, and call `UserService.ensureUser(user)`.
4. WHEN a `SIGNED_OUT` event fires, `AuthService` SHALL set auth state to `guest` and call `UserService.loadGuestRole()`.
5. THE auth state listener SHALL be registered once during `AuthService.init()` and unregistered on app teardown.
6. IF the OAuth provider returns an error (e.g. user cancelled on Google's page), `AuthService` SHALL catch the error, set auth state to `guest`, and surface the error message to the `LoginModal`.

---

### Requirement 6: User Record — First Login Upsert

**User Story:** As the system, I want to record each authenticated user in the `users` table on their first login, so that the user can be associated with their fight lists and other data in the future.

#### Acceptance Criteria

1. WHEN `UserService.ensureUser(supabaseUser)` is called, IT SHALL perform an upsert into the `users` table with `id = supabaseUser.id`, `role_id` = the DB id of the `student` role, and `created_at = now()`, using `onConflict: 'id'` so subsequent logins do not overwrite data.
2. THE upsert SHALL NOT modify `role_id` if the row already exists (i.e. use `ignoreDuplicates: true` or equivalent so existing role assignments are preserved).
3. AFTER the upsert, `UserService` SHALL query the `users` table joined to `roles` and `role_permissions` joined to `permissions` to load the user's full resolved permission set into memory.
4. IF the upsert or permission-load query fails, `UserService` SHALL log the error and fall back to loading the `student` role's permissions from a local hardcoded fallback, so the user is not locked out by a transient DB error.
5. THE `users` table row SHALL contain only the columns defined in the schema (§ Database Schema): `id`, `role_id`, `created_at`. No email or display name is stored.

---

### Requirement 7: Guest Role Loading

**User Story:** As an unauthenticated user, I want the app to load the guest role's permissions so that the system can enforce what a guest can and cannot do.

#### Acceptance Criteria

1. WHEN the user dismisses the `LoginModal` without signing in, `UserService.loadGuestRole()` SHALL be called.
2. `UserService.loadGuestRole()` SHALL query the `roles` table for `name = 'guest'`, then query `role_permissions` joined to `permissions` to load the guest permission set into memory.
3. IF the query fails (e.g. no network), `UserService.loadGuestRole()` SHALL fall back to a hardcoded empty permission set (guest has no permissions).
4. THE loaded permission set SHALL be the same data structure used for authenticated users — `PermissionService` has no knowledge of whether the user is authenticated or a guest.

---

### Requirement 8: Permission Service

**User Story:** As a developer, I want a single, simple API to check whether the current user holds a specific permission, so that any component can gate behaviour without coupling to the auth or DB layer.

#### Acceptance Criteria

1. THE `PermissionService` SHALL expose a static or singleton method `hasPermission(permission: Permission): boolean` that returns `true` if the currently loaded role includes the given permission, `false` otherwise.
2. THE `Permission` type SHALL be a TypeScript union of all known permission strings: `'play-fight-list' | 'edit-fight-list' | 'share-fight-list'`.
3. WHEN no role has been loaded yet (auth state is `loading`), `hasPermission()` SHALL return `false` for all permissions.
4. THE `PermissionService` SHALL expose a `setPermissions(permissions: Permission[]): void` method (called only by `UserService`) to update the in-memory permission set.
5. THE `PermissionService` SHALL expose a `getPermissions(): Permission[]` method to allow inspection in tests.
6. No component other than `UserService` SHALL call `setPermissions()`.

---

### Requirement 9: Roles & Permissions Lookup Tables (DB Setup)

**User Story:** As a developer, I want the roles and permissions to be defined in the database with a seed script, so that the schema is authoritative and the data can be managed without code changes.

#### Acceptance Criteria

1. A Supabase migration SQL file SHALL be created at `supabase/migrations/<timestamp>_create_users_roles_permissions.sql` that creates the four tables: `users`, `roles`, `permissions`, `role_permissions` with the columns and constraints defined in §Database Schema.
2. A seed SQL file SHALL be created at `supabase/seed.sql` that inserts the three roles (`student`, `sys-admin`, `guest`) and three permissions (`play-fight-list`, `edit-fight-list`, `share-fight-list`) and wires `role_permissions` as per §Seed data.
3. THE migration and seed SHALL be idempotent: running them a second time SHALL NOT produce errors or duplicate rows (use `INSERT ... ON CONFLICT DO NOTHING` or `CREATE TABLE IF NOT EXISTS`).
4. THE `roles` and `permissions` tables SHALL have a `UNIQUE` constraint on the `name` column.
5. THE `users.role_id` FK SHALL have `ON DELETE SET NULL` so that deleting a role does not orphan users.

---

### Requirement 10: Auth State & App Integration

**User Story:** As a developer, I want the auth state to be initialised before the app renders any interactive UI, so that permission-gated controls are in the correct state from the first paint.

#### Acceptance Criteria

1. IN `app.ts`, `AuthService.init()` SHALL be called early in the `init()` sequence — before `FightListUIManager.init()` — so that the resolved permission set is available before any UI is rendered.
2. `AuthService.init()` SHALL be async and SHALL resolve only after the initial auth state check (`supabase.auth.getSession()`) completes, so the rest of the init sequence can depend on it.
3. THE `LoginModal` SHALL be shown after the full `app.ts` init sequence completes, not mid-init.
4. WHEN auth state changes at runtime (sign-in or sign-out), `AuthService` SHALL emit a custom event or call a registered callback so `app.ts` can re-evaluate permission-dependent UI without a page reload.
5. THE `LoginButton` DOM element SHALL be injected into the `<header>` by `AuthService` or a dedicated `AuthUIManager` during `init()`, so `index.html` needs no changes beyond a hook element (`id="auth-controls"`).

---

### Requirement 11: UI Consistency & Accessibility

**User Story:** As a user, I want all auth UI to look and feel like the rest of the app, and be usable with a keyboard and screen reader.

#### Acceptance Criteria

1. THE `LoginModal` SHALL use only Bootstrap 5 component classes and the CSS custom properties already defined in `src/styles/main.css`. No new CSS files SHALL be introduced for this feature.
2. THE "Sign in with Google" button SHALL use `btn btn-danger` (Google's brand colour approximation within Bootstrap) or `btn btn-outline-danger` consistently.
3. THE `LoginButton` in the header SHALL use `btn btn-outline-light btn-sm` to blend with the `bg-dark` header.
4. ALL interactive elements in the auth UI SHALL be reachable via keyboard Tab navigation and operable with Enter/Space.
5. THE `LoginModal` close button SHALL have `aria-label="Close"`.
6. WHEN the `LoginModal` is open, focus SHALL be trapped inside it (Bootstrap's modal JS handles this automatically when using standard Bootstrap markup).
7. THE `LoginButton` SHALL have an `aria-label` that reflects its current state: `"Sign in"` when guest, `"Signed in as [name], click to sign out"` when authenticated.

---

### Requirement 12: Security & Environment Hygiene

**User Story:** As a developer, I want credentials kept out of source control and the client to use only the anon key, so that the app is safe to deploy publicly.

#### Acceptance Criteria

1. `.env.development` and `.env.production` SHALL be listed in `.gitignore`. A `.env.example` file SHALL be committed that documents the required keys with placeholder values.
2. THE Supabase client SHALL use only the **anon key** (`VITE_SUPABASE_ANON_KEY`). The service role key SHALL never appear in frontend code.
3. THE `supabase/` folder (migrations and seed) SHALL be committed to source control so schema changes are tracked.
4. No user PII (email, name) SHALL be written to `localStorage` or any client-side persistence store. Only the Supabase session token (managed automatically by the Supabase JS client) is persisted.

---

## Component & File Map

| New File | Purpose |
|---|---|
| `src/services/AuthService.ts` | Supabase client init, OAuth trigger, auth state machine, callbacks |
| `src/services/UserService.ts` | `ensureUser()`, `loadGuestRole()`, permission loading |
| `src/services/PermissionService.ts` | In-memory permission set, `hasPermission()` |
| `src/components/LoginModal.ts` | Bootstrap modal for Google sign-in |
| `src/components/LoginButton.ts` | Header sign-in button (top-left), reactive to auth state |
| `src/components/LogoutButton.ts` | Small logout button in top-right corner; visible only when authenticated |
| `src/components/GuestPromoBar.ts` | Top-docked "Please log in" banner, shown only when guest |
| `src/types/auth.ts` | `AuthState`, `AppUser`, `Permission`, `Role` types |
| `supabase/migrations/<ts>_create_users_roles_permissions.sql` | Schema creation |
| `supabase/seed.sql` | Roles, permissions, role_permissions seed data |
| `.env.example` | Documents required env vars |

| Modified File | Change |
|---|---|
| `src/app.ts` | Call `AuthService.init()` early; show `LoginModal` post-init |
| `index.html` | Add `<div id="auth-controls"></div>` and `<div id="logout-button-container"></div>` in header; `<div id="guest-promo-bar"></div>` below header |
| `package.json` | Add `@supabase/supabase-js` pinned dependency |
| `.gitignore` | Add `.env.development`, `.env.production` |
| `src/constants/storage.ts` | No new keys needed (Supabase manages its own session storage) |
