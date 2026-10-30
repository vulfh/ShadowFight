/**
 * src/types/auth.ts
 *
 * Single-responsibility: define all auth domain contracts.
 * No runtime logic lives here — only types and interfaces.
 *
 * SOLID applied:
 *   ISP  — IAuthReader / IAuthCommands split; IPermissionReader / IPermissionWriter split
 *   OCP  — IAuthProvider allows new providers without touching AuthService
 *   DIP  — All services depend on these abstractions, never on concrete implementations
 *   LSP  — All interface implementations are interchangeable in tests and production
 */

// ── Primitive types ───────────────────────────────────────────────────────────

/**
 * Runtime lifecycle state held in memory by AuthService.
 *
 * loading      — init() is in progress; no action should be taken by UI yet.
 * guest        — no authenticated session; limited (or zero) permissions active.
 * authenticated — a valid session exists; full role-based permissions loaded.
 */
export type AuthState = 'loading' | 'guest' | 'authenticated'

/**
 * Atomic permission string.
 * Union kept in sync with the permissions DB table (seed.sql).
 */
export type Permission =
  | 'play-fight-list'
  | 'edit-fight-list'
  | 'share-fight-list'

// ── Domain interfaces ─────────────────────────────────────────────────────────

/**
 * Row shape returned from the roles table.
 * SRP: purely a data-shape contract — no methods.
 */
export interface Role {
  id: string
  name: 'student' | 'sys-admin' | 'guest'
}

/**
 * Application-level user record stored in the users table.
 * Distinct from Supabase auth.users — no PII stored here.
 * SRP: data shape only; user lifecycle logic lives in UserService.
 */
export interface AppUser {
  /** Matches auth.users.id (uuid). */
  id: string
  /** FK → roles.id. */
  roleId: string
  /** ISO 8601 timestamp, set once on first insert. */
  createdAt: string
}

// ── Observer pattern contracts ────────────────────────────────────────────────

/**
 * Payload delivered to every AuthStateObserver on any auth state change.
 * Carries all information components need to re-render — they must not
 * query AuthService again after receiving this.
 */
export interface AuthStateChangedPayload {
  state: AuthState
  /** null when state is 'guest' or 'loading'. */
  displayName: string | null
  permissions: Permission[]
}

/**
 * ISP: Observer interface exposes only the subscription surface.
 * UI components react to auth changes without depending on AuthService directly.
 * DIP: depends on this abstraction, not on any concrete auth class.
 */
export interface AuthStateObserver {
  onAuthStateChanged(payload: AuthStateChangedPayload): void
}

// ── ISP-split auth service interfaces ────────────────────────────────────────

/**
 * ISP: Read-only view of auth state.
 * Used by components that query state (e.g. GuestPromoBar initial render).
 * Consumers cannot trigger auth actions via this interface.
 */
export interface IAuthReader {
  getAuthState(): AuthState
  getDisplayName(): string | null
}

/**
 * ISP: Command surface for triggering auth actions.
 * Used by LoginModal and LoginButton — they issue commands but never query state.
 * Consumers cannot read auth state via this interface.
 */
export interface IAuthCommands {
  /**
   * Starts the Google OAuth flow.
   * Returns an error string on immediate failure, or null if the redirect
   * flow has begun (result arrives asynchronously via the auth event listener).
   */
  signInWithGoogle(): Promise<string | null>

  /** Signs the current user out. */
  signOut(): Promise<void>

  /**
   * Called when the user dismisses the LoginModal without signing in.
   * Loads guest permissions and emits a guest AuthStateChangedPayload.
   */
  notifyGuestDismissed(): Promise<void>
}

// ── ISP-split permission service interfaces ───────────────────────────────────

/**
 * ISP: Read-only permission surface.
 * Import this in UI components and business logic.
 * TypeScript prevents callers from invoking setPermissions().
 */
export interface IPermissionReader {
  hasPermission(permission: Permission): boolean
  getPermissions(): Permission[]
}

/**
 * ISP: Write surface for updating the in-memory permission set.
 * Import ONLY in UserService — no UI code ever calls setPermissions().
 * TypeScript prevents callers from invoking hasPermission() or getPermissions().
 */
export interface IPermissionWriter {
  setPermissions(permissions: Permission[]): void
}

// ── Repository interface ──────────────────────────────────────────────────────

/**
 * DIP: UserService depends on this abstraction, not on SupabaseClient.
 * Pattern: Repository — all DB access logic is isolated behind this contract.
 * Allows test doubles and future backend swaps without touching business logic.
 */
export interface IUserRepository {
  /**
   * Insert a new user row (id, role_id = student role). Idempotent:
   * if a row with this id already exists, the existing role_id is preserved.
   */
  upsertUser(userId: string): Promise<void>

  /** Returns the full resolved permission names for the given user. */
  loadPermissionsForUser(userId: string): Promise<Permission[]>

  /**
   * Returns the guest role's permission names.
   * Empty per the current seed — but queried at runtime so future
   * seed changes take effect without a code deploy.
   */
  loadGuestPermissions(): Promise<Permission[]>
}

// ── Auth provider interface ───────────────────────────────────────────────────

/**
 * OCP: Adding a new auth provider (email/password, GitHub OAuth) requires
 * implementing this interface, not modifying AuthService.
 * Pattern: Strategy — AuthService selects a provider at construction time.
 */
export interface IAuthProvider {
  /**
   * Returns the existing session if one exists, or null.
   * Called once during AuthService.init() to handle returning users.
   */
  getSession(): Promise<{ userId: string; displayName: string | null } | null>

  /**
   * Triggers the sign-in flow.
   * Returns null if the flow has started (redirect flows complete asynchronously).
   * Returns an error string on immediate failure.
   */
  signIn(): Promise<string | null>

  /** Signs the current user out. */
  signOut(): Promise<void>

  /**
   * Registers a listener for auth events from the underlying provider.
   * Returns an unsubscribe function — call it on destroy() to avoid leaks.
   */
  onAuthEvent(
    listener: (
      event: 'SIGNED_IN' | 'SIGNED_OUT',
      user: { userId: string; displayName: string | null } | null
    ) => void
  ): () => void
}
