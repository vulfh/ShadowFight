# Design Document — Feature 06: Supabase Login & RBAC

## Overview

This document translates the requirements for Feature 06 into concrete implementation decisions, component APIs, data flows, and HTML/CSS specifications grounded in the existing codebase conventions. It explicitly maps every significant design decision to the SOLID principle or design pattern it satisfies.

---

## SOLID & Design Pattern Audit

Before detailing each component, this section identifies the principles and patterns applied, and the problems they solve.

| Principle / Pattern | Where Applied | Problem Solved |
|---|---|---|
| **SRP** — Single Responsibility | `AuthService` split from `AuthUIManager`; `UserRepository` split from `PermissionLoader` | Original draft had `AuthService` own client, state machine, OAuth, DB orchestration, AND UI callbacks |
| **OCP** — Open/Closed | `IAuthProvider` interface + `GoogleAuthProvider` impl | Adding email/password auth requires a new class, not a change to `AuthService` |
| **LSP** — Liskov Substitution | All components typed against interfaces, not concrete classes | Components can be replaced with test doubles without breaking callers |
| **ISP** — Interface Segregation | `IAuthReader` vs `IAuthCommands`; `IPermissionReader` vs `IPermissionWriter` | Consumers only see the slice of the API they need |
| **DIP** — Dependency Inversion | `LoginModal` depends on `IAuthCommands`, not `AuthService`; `UserService` depends on `IUserRepository` | High-level UI components never import low-level concrete services |
| **Observer** | `AuthStateObserver` interface + `AuthEventBus` | Multiple subscribers (LoginButton, GuestPromoBar, LoginModal) react to auth changes without coupling |
| **Strategy** | `IPermissionLoader` interface + `DbPermissionLoader` / `FallbackPermissionLoader` | Permission loading algorithm is swappable and independently testable |
| **Facade** | `AuthService` as public-facing facade over `AuthEventBus` + `IAuthProvider` + `UserService` | `app.ts` and components interact with one simple surface, internal wiring stays hidden |
| **Repository** | `IUserRepository` + `SupabaseUserRepository` | DB access logic is isolated; `UserService` never constructs Supabase queries directly |
| **Factory** | `SupabaseClientFactory` | Client construction and env-var validation extracted from `AuthService` |

---

## 1. Architecture Diagram

```
main.ts
  └── KravMagaTrainerApp.init()
        │
        ├── SupabaseClientFactory.create()     ← validates env, creates SupabaseClient (once)
        │
        ├── AuthService.init()                 ← Facade (SRP, DIP)
        │     ├── IAuthProvider.getSession()   ← GoogleAuthProvider (OCP, Strategy)
        │     ├── UserService.ensureUser()     ← calls IUserRepository, then IPermissionLoader
        │     └── AuthEventBus.emit()          ← notifies all registered observers (Observer)
        │
        ├── PermissionService                  ← ISP-split: IPermissionReader / IPermissionWriter
        │
        ├── ... existing managers (unchanged) ...
        │
        └── AuthUIManager.init()               ← SRP: owns all auth UI wiring
              ├── LoginButton (IAuthReader)
              ├── GuestPromoBar (IAuthReader)
              └── LoginModal (IAuthCommands)
                    registered as AuthStateObservers on AuthEventBus
```

**Data flow on sign-in:**
```
User clicks "Sign in with Google"
  → LoginModal calls IAuthCommands.signInWithGoogle()
      → GoogleAuthProvider.signInWithOAuth()
          → OAuth redirect → Google → redirect back
              → GoogleAuthProvider fires SIGNED_IN via onAuthStateChange
                  → AuthService.handleSignedIn(session)
                      → UserService.ensureUser(user)
                          → IUserRepository.upsertUser()
                          → IPermissionLoader.loadForUser() → PermissionService.setPermissions()
                      → AuthEventBus.emit({ state: 'authenticated', ... })
                          → LoginButton.onAuthStateChanged()   ← Observer
                          → GuestPromoBar.onAuthStateChanged() ← Observer
                          → LoginModal.onAuthStateChanged()    ← Observer
```

---

## 2. TypeScript Types — `src/types/auth.ts`

New file. All auth-related types are isolated here (SRP — types file has one job: define the auth domain contracts).

```typescript
// src/types/auth.ts

/** Runtime lifecycle state held in memory by AuthService. */
export type AuthState = 'loading' | 'guest' | 'authenticated'

/** Atomic permission string. Union kept in sync with the permissions DB table. */
export type Permission =
  | 'play-fight-list'
  | 'edit-fight-list'
  | 'share-fight-list'

/** Row shape returned from the roles table. */
export interface Role {
  id: string
  name: 'student' | 'sys-admin' | 'guest'
}

/**
 * Application-level user record stored in the users table.
 * Distinct from Supabase's auth.users — no PII stored here.
 */
export interface AppUser {
  id: string        // matches auth.users.id (uuid)
  roleId: string    // FK → roles.id
  createdAt: string // ISO timestamp, set once on insert
}

/** Payload delivered to every AuthStateObserver on any auth state change. */
export interface AuthStateChangedPayload {
  state: AuthState
  displayName: string | null  // null when guest
  permissions: Permission[]
}

// ── Observer pattern contracts ────────────────────────────────────────────────

/**
 * ISP: Observer interface exposes only the subscription surface.
 * Components that react to auth changes implement this, not a full
 * AuthService interface.
 */
export interface AuthStateObserver {
  onAuthStateChanged(payload: AuthStateChangedPayload): void
}

// ── ISP-split auth service interfaces ────────────────────────────────────────

/**
 * ISP: Read-only view of auth state.
 * Used by components that only need to query auth state (e.g. GuestPromoBar,
 * LoginButton during initial render).
 */
export interface IAuthReader {
  getAuthState(): AuthState
  getDisplayName(): string | null
}

/**
 * ISP: Command surface for triggering auth actions.
 * Used by LoginModal and LoginButton — they issue commands but
 * never query internal state.
 */
export interface IAuthCommands {
  signInWithGoogle(): Promise<string | null>
  signOut(): Promise<void>
  notifyGuestDismissed(): Promise<void>
}

// ── Permission service interfaces (ISP) ───────────────────────────────────────

/**
 * ISP: Read-only permission surface.
 * Used by every component that needs to gate behaviour on permissions.
 * Components never write permissions — they only query them.
 */
export interface IPermissionReader {
  hasPermission(permission: Permission): boolean
  getPermissions(): Permission[]
}

/**
 * ISP: Write surface for updating the in-memory permission set.
 * Exposed only to UserService — no component or UI code ever calls this.
 */
export interface IPermissionWriter {
  setPermissions(permissions: Permission[]): void
}

// ── Repository interface (DIP, Repository pattern) ───────────────────────────

/**
 * DIP: UserService depends on this abstraction, not on SupabaseClient directly.
 * Allows test doubles and future backend swaps without touching business logic.
 */
export interface IUserRepository {
  /**
   * Insert a new user row (id, role_id=student). Idempotent — if row exists,
   * the existing role_id is preserved.
   */
  upsertUser(userId: string): Promise<void>

  /** Returns the full resolved permission names for the given user. */
  loadPermissionsForUser(userId: string): Promise<Permission[]>

  /** Returns the guest role's permission names (empty in current seed). */
  loadGuestPermissions(): Promise<Permission[]>
}

// ── Auth provider interface (OCP, Strategy) ───────────────────────────────────

/**
 * OCP: Adding a new auth provider (email/password, GitHub) requires implementing
 * this interface, not modifying AuthService.
 */
export interface IAuthProvider {
  /**
   * Returns the existing session if one exists, or null.
   * Called once during AuthService.init().
   */
  getSession(): Promise<{ userId: string; displayName: string | null } | null>

  /**
   * Triggers the sign-in flow. Returns an error string on immediate failure,
   * or null if the flow has started (redirect flows return null and complete
   * asynchronously via the listener).
   */
  signIn(): Promise<string | null>

  /** Signs the current user out. */
  signOut(): Promise<void>

  /**
   * Registers a listener for auth events from the provider.
   * The listener receives 'SIGNED_IN' or 'SIGNED_OUT' events.
   * Returns an unsubscribe function.
   */
  onAuthEvent(
    listener: (
      event: 'SIGNED_IN' | 'SIGNED_OUT',
      user: { userId: string; displayName: string | null } | null
    ) => void
  ): () => void
}
```

**Rationale:**
- Splitting `IAuthReader` from `IAuthCommands` (ISP) means `GuestPromoBar` only ever receives an `IAuthReader` — it cannot accidentally call `signOut()`.
- Splitting `IPermissionReader` from `IPermissionWriter` (ISP) means no UI code can ever call `setPermissions()` — the TypeScript type system enforces the requirement that only `UserService` writes permissions.
- `IAuthProvider` (OCP, Strategy) means `AuthService` is closed for modification but open for extension via new provider implementations.
- `IUserRepository` (DIP) means `UserService` is testable in isolation without a real Supabase connection.

---

## 3. `SupabaseClientFactory` — `src/services/SupabaseClientFactory.ts`

**Pattern: Factory**
**SRP:** Env-var validation and client construction are a single, isolated concern.

```typescript
// src/services/SupabaseClientFactory.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export class SupabaseClientFactory {
  /**
   * Validates required env vars and creates the SupabaseClient.
   * Throws a descriptive Error if either var is missing — halts app startup
   * with a visible console message before any async work is attempted.
   */
  static create(): SupabaseClient {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

    if (!url?.trim()) {
      throw new Error(
        '[SupabaseClientFactory] VITE_SUPABASE_URL is missing. ' +
        'Create .env.development (dev) or .env.production (prod). ' +
        'See .env.example for required keys.'
      )
    }
    if (!key?.trim()) {
      throw new Error(
        '[SupabaseClientFactory] VITE_SUPABASE_ANON_KEY is missing. ' +
        'See .env.example for required keys.'
      )
    }

    return createClient(url, key)
  }
}
```

**Why extracted from `AuthService`:**
`AuthService` was previously responsible for validation, construction, and all auth logic. Extracting `SupabaseClientFactory` means the factory has one reason to change (env-var structure changes) and `AuthService` has a different reason to change (auth flow changes) — SRP satisfied.

---

## 4. `GoogleAuthProvider` — `src/services/GoogleAuthProvider.ts`

**Pattern: Strategy (implements `IAuthProvider`)**
**OCP:** `AuthService` depends on `IAuthProvider`. Adding GitHub login = new `GithubAuthProvider` class, zero changes to `AuthService`.

```typescript
// src/services/GoogleAuthProvider.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { IAuthProvider } from '../types/auth'

export class GoogleAuthProvider implements IAuthProvider {
  constructor(private readonly supabase: SupabaseClient) {}

  async getSession() {
    const { data: { session } } = await this.supabase.auth.getSession()
    if (!session) return null
    return {
      userId: session.user.id,
      displayName: session.user.user_metadata?.full_name
        ?? session.user.email
        ?? null
    }
  }

  async signIn(): Promise<string | null> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    return error?.message ?? null
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut()
  }

  onAuthEvent(listener: Parameters<IAuthProvider['onAuthEvent']>[0]): () => void {
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          listener('SIGNED_IN', {
            userId: session.user.id,
            displayName: session.user.user_metadata?.full_name
              ?? session.user.email
              ?? null
          })
        } else if (event === 'SIGNED_OUT') {
          listener('SIGNED_OUT', null)
        }
      }
    )
    return () => subscription.unsubscribe()
  }
}
```

---

## 5. `SupabaseUserRepository` — `src/services/SupabaseUserRepository.ts`

**Pattern: Repository (implements `IUserRepository`)**
**DIP:** `UserService` depends on `IUserRepository`, not on `SupabaseClient`.
**SRP:** All Supabase query construction lives here — nowhere else.

```typescript
// src/services/SupabaseUserRepository.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { IUserRepository, Permission } from '../types/auth'

export class SupabaseUserRepository implements IUserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async upsertUser(userId: string): Promise<void> {
    // Resolve student role id
    const { data: role } = await this.supabase
      .from('roles')
      .select('id')
      .eq('name', 'student')
      .single()

    if (!role) throw new Error('[SupabaseUserRepository] student role not found in DB')

    await this.supabase
      .from('users')
      .upsert(
        { id: userId, role_id: role.id, created_at: new Date().toISOString() },
        { onConflict: 'id', ignoreDuplicates: true }
      )
  }

  async loadPermissionsForUser(userId: string): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        roles (
          role_permissions (
            permissions ( name )
          )
        )
      `)
      .eq('id', userId)
      .single()

    if (error || !data) throw new Error('[SupabaseUserRepository] failed to load user permissions')

    // Flatten the nested join result
    return (data as any).roles.role_permissions
      .map((rp: any) => rp.permissions.name as Permission)
  }

  async loadGuestPermissions(): Promise<Permission[]> {
    // Guest has no permissions per seed — query confirms this at runtime
    const { data: role } = await this.supabase
      .from('roles')
      .select('id')
      .eq('name', 'guest')
      .single()

    if (!role) return []

    const { data } = await this.supabase
      .from('role_permissions')
      .select('permissions ( name )')
      .eq('role_id', role.id)

    return (data ?? []).map((row: any) => row.permissions.name as Permission)
  }
}
```

---

## 6. `PermissionService` — `src/services/PermissionService.ts`

**Pattern: Singleton (module-level)**
**ISP:** Exposes two separate interfaces — `IPermissionReader` (for components) and `IPermissionWriter` (for `UserService` only). The TypeScript type system enforces the boundary.

```typescript
// src/services/PermissionService.ts
import { IPermissionReader, IPermissionWriter, Permission } from '../types/auth'

class PermissionServiceImpl implements IPermissionReader, IPermissionWriter {
  private permissions: Permission[] = []

  /** Replace the in-memory permission set. Called only by UserService. */
  setPermissions(permissions: Permission[]): void {
    this.permissions = [...permissions]
  }

  /** Returns true if the current role includes the given permission. */
  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission)
  }

  /** Returns a copy of the current permission set (for testing/inspection). */
  getPermissions(): Permission[] {
    return [...this.permissions]
  }
}

const instance = new PermissionServiceImpl()

/**
 * Read-only surface. Import this in UI components and business logic.
 * Type is IPermissionReader — callers cannot call setPermissions().
 */
export const permissionReader: IPermissionReader = instance

/**
 * Write surface. Import ONLY in UserService.
 * Type is IPermissionWriter — callers cannot call hasPermission().
 */
export const permissionWriter: IPermissionWriter = instance
```

**ISP in action:** A component imports `permissionReader` and gets type `IPermissionReader` — the TypeScript compiler will reject any attempt to call `.setPermissions()`. `UserService` imports `permissionWriter` and gets type `IPermissionWriter` — it cannot accidentally call `.hasPermission()`. Both references point to the same underlying instance.

---

## 7. `UserService` — `src/services/UserService.ts`

**SRP:** Owns the use-case orchestration for user lifecycle (upsert + permission load). It does NOT own query construction (that's `IUserRepository`) and does NOT own in-memory state (that's `PermissionService`).
**DIP:** Depends on `IUserRepository` and `IPermissionWriter` abstractions injected via constructor.

```typescript
// src/services/UserService.ts
import { User } from '@supabase/supabase-js'
import { IUserRepository, IPermissionWriter, Permission } from '../types/auth'

/** Hardcoded fallback used when DB is unreachable. */
const STUDENT_FALLBACK_PERMISSIONS: Permission[] = ['play-fight-list', 'edit-fight-list']

export class UserService {
  constructor(
    private readonly repo: IUserRepository,
    private readonly permWriter: IPermissionWriter
  ) {}

  /**
   * Called on SIGNED_IN.
   * Upserts the user (preserves existing role), then loads their permission set.
   * Falls back to hardcoded student permissions on DB error.
   */
  async ensureUser(user: User): Promise<void> {
    try {
      await this.repo.upsertUser(user.id)
      const permissions = await this.repo.loadPermissionsForUser(user.id)
      this.permWriter.setPermissions(permissions)
    } catch (err) {
      console.error('[UserService] ensureUser failed, applying fallback permissions:', err)
      this.permWriter.setPermissions(STUDENT_FALLBACK_PERMISSIONS)
    }
  }

  /**
   * Called when the LoginModal is dismissed without signing in.
   * Loads guest permissions (empty per current seed) or falls back to [].
   */
  async loadGuestRole(): Promise<void> {
    try {
      const permissions = await this.repo.loadGuestPermissions()
      this.permWriter.setPermissions(permissions)
    } catch (err) {
      console.error('[UserService] loadGuestRole failed, applying empty permissions:', err)
      this.permWriter.setPermissions([])
    }
  }
}
```

**Why `UserService` is not merged with `SupabaseUserRepository`:**
The repository maps DB rows to domain types. `UserService` encodes the business rules (fall back to student permissions on error; preserve existing role on upsert). These are two distinct reasons to change (SRP). Merging them would mean a change to the fallback policy requires touching DB query code.

---

## 8. `AuthEventBus` — `src/services/AuthEventBus.ts`

**Pattern: Observer**
**SRP:** Sole responsibility is managing a list of `AuthStateObserver`s and notifying them.
**OCP:** New subscribers (e.g. a future `SessionPermissionGuard`) register themselves — no change to `AuthEventBus`.
**DIP:** `AuthService` depends on `AuthEventBus`, not on concrete UI components. Components depend on `AuthEventBus`, not on `AuthService`.

```typescript
// src/services/AuthEventBus.ts
import { AuthStateObserver, AuthStateChangedPayload } from '../types/auth'

export class AuthEventBus {
  private readonly observers: Set<AuthStateObserver> = new Set()

  /** Register a subscriber. Returns an unsubscribe function (common JS pattern). */
  subscribe(observer: AuthStateObserver): () => void {
    this.observers.add(observer)
    return () => this.observers.delete(observer)
  }

  /** Notify all current subscribers synchronously. */
  emit(payload: AuthStateChangedPayload): void {
    this.observers.forEach(observer => observer.onAuthStateChanged(payload))
  }
}
```

**Observer contract** (from `src/types/auth.ts`):
```typescript
export interface AuthStateObserver {
  onAuthStateChanged(payload: AuthStateChangedPayload): void
}
```

Every UI component that needs to react to auth state changes (`LoginButton`, `GuestPromoBar`, `LoginModal`) implements `AuthStateObserver` and registers itself on the `AuthEventBus`. `AuthService` only calls `bus.emit()` — it has no knowledge of the UI components.

---

## 9. `AuthService` — `src/services/AuthService.ts`

**Pattern: Facade**
**SRP:** After extracting `SupabaseClientFactory`, `GoogleAuthProvider`, `SupabaseUserRepository`, `UserService`, and `AuthEventBus`, `AuthService` has one remaining job: **orchestrating the auth lifecycle**. It wires the other pieces together and exposes the public surface that `app.ts` and the components talk to.
**DIP:** All constructor dependencies are injected as interfaces — `AuthService` never imports `SupabaseClient` directly.
**ISP:** Exposes `IAuthReader` and `IAuthCommands` separately so components only receive the slice they need.

```typescript
// src/services/AuthService.ts
import { IAuthProvider, IAuthReader, IAuthCommands, AuthState } from '../types/auth'
import { UserService } from './UserService'
import { AuthEventBus } from './AuthEventBus'
import { permissionReader } from './PermissionService'

export class AuthService implements IAuthReader, IAuthCommands {
  private authState: AuthState = 'loading'
  private displayName: string | null = null
  private unsubscribeProvider: (() => void) | null = null

  constructor(
    private readonly provider: IAuthProvider,  // DIP: injected, not newed here
    private readonly userService: UserService,  // DIP: injected
    private readonly eventBus: AuthEventBus     // DIP: injected
  ) {}

  // ── IAuthReader ────────────────────────────────────────────────────────────
  getAuthState(): AuthState  { return this.authState }
  getDisplayName(): string | null { return this.displayName }

  // ── IAuthCommands ──────────────────────────────────────────────────────────
  async signInWithGoogle(): Promise<string | null> {
    return this.provider.signIn()
  }

  async signOut(): Promise<void> {
    await this.provider.signOut()
    // SIGNED_OUT event from provider listener handles the rest
  }

  async notifyGuestDismissed(): Promise<void> {
    await this.userService.loadGuestRole()
    this.emitCurrentState()
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Async init. Resolves only after the initial auth state is known.
   * Called once by app.ts before any other init step.
   */
  async init(): Promise<void> {
    // Register auth event listener from provider (OCP — provider handles SDK specifics)
    this.unsubscribeProvider = this.provider.onAuthEvent(
      async (event, user) => {
        if (event === 'SIGNED_IN' && user) {
          this.authState = 'authenticated'
          this.displayName = user.displayName
          await this.userService.ensureUser({ id: user.userId } as any)
          this.emitCurrentState()
        } else if (event === 'SIGNED_OUT') {
          this.authState = 'guest'
          this.displayName = null
          await this.userService.loadGuestRole()
          this.emitCurrentState()
        }
      }
    )

    // Check for existing session (returning user)
    const session = await this.provider.getSession()
    if (session) {
      this.authState = 'authenticated'
      this.displayName = session.displayName
      await this.userService.ensureUser({ id: session.userId } as any)
    } else {
      this.authState = 'guest'
      // Permissions for guest are loaded on explicit LoginModal dismissal,
      // not speculatively here — avoids a redundant DB round-trip for
      // returning authenticated users.
    }
    // Do NOT emit here — observers have not registered yet.
    // app.ts reads getAuthState() directly for the initial render decision.
  }

  /** Clean up. Call on app teardown. */
  destroy(): void {
    this.unsubscribeProvider?.()
    this.unsubscribeProvider = null
  }

  // ── Private ────────────────────────────────────────────────────────────────
  private emitCurrentState(): void {
    this.eventBus.emit({
      state: this.authState,
      displayName: this.displayName,
      permissions: permissionReader.getPermissions()
    })
  }
}
```

**Why `AuthService` still implements `IAuthReader` and `IAuthCommands`:**
`app.ts` constructs the system and checks `getAuthState()` once after `init()` to decide whether to show `LoginModal`. Components receive only the interface slice they need — `LoginModal` receives `IAuthCommands`, `LoginButton` receives both (it needs to read state for initial render AND issue commands).

---

## 10. Wiring — `src/services/AuthServiceFactory.ts`

**SRP:** The act of assembling `AuthService` with all its concrete dependencies belongs in a dedicated factory, not in `app.ts`. `app.ts` calls `AuthServiceFactory.create()` and gets a ready-to-`init()` `AuthService` back.

```typescript
// src/services/AuthServiceFactory.ts
import { SupabaseClientFactory } from './SupabaseClientFactory'
import { GoogleAuthProvider } from './GoogleAuthProvider'
import { SupabaseUserRepository } from './SupabaseUserRepository'
import { UserService } from './UserService'
import { AuthService } from './AuthService'
import { AuthEventBus } from './AuthEventBus'
import { permissionWriter } from './PermissionService'

export interface AuthComponents {
  authService: AuthService
  eventBus: AuthEventBus
}

export class AuthServiceFactory {
  /**
   * Creates the fully wired AuthService and AuthEventBus.
   * Called once from app.ts.
   *
   * Concrete types (SupabaseClient, GoogleAuthProvider, etc.) are
   * assembled here — nowhere else in the codebase sees them.
   */
  static create(): AuthComponents {
    const supabase  = SupabaseClientFactory.create()        // Factory
    const provider  = new GoogleAuthProvider(supabase)      // Strategy
    const repo      = new SupabaseUserRepository(supabase)  // Repository
    const userSvc   = new UserService(repo, permissionWriter) // DIP
    const eventBus  = new AuthEventBus()                    // Observer hub
    const authSvc   = new AuthService(provider, userSvc, eventBus) // Facade

    return { authService: authSvc, eventBus }
  }
}
```

**DIP summary:** `app.ts` only imports `AuthServiceFactory` and the interface types. It never imports `SupabaseClient`, `GoogleAuthProvider`, or `SupabaseUserRepository`. The concrete implementations are known only inside `AuthServiceFactory`.

---

## 11. `AuthUIManager` — `src/managers/AuthUIManager.ts`

**SRP:** All auth UI wiring is extracted from `app.ts` into this manager. `app.ts` calls `authUIManager.init()` and never touches auth DOM directly.
**Pattern: Observer registration hub** — registers `LoginButton`, `GuestPromoBar`, and `LoginModal` as observers on the `AuthEventBus`.
**DIP:** Each component receives only the interface it needs (`IAuthReader`, `IAuthCommands`), not the concrete `AuthService`.

```typescript
// src/managers/AuthUIManager.ts
import { AuthEventBus } from '../services/AuthEventBus'
import { IAuthReader, IAuthCommands } from '../types/auth'
import { LoginButton } from '../components/LoginButton'
import { GuestPromoBar } from '../components/GuestPromoBar'
import { LoginModal } from '../components/LoginModal'

export class AuthUIManager {
  private loginButton: LoginButton | null = null
  private guestPromoBar: GuestPromoBar | null = null
  private loginModal: LoginModal | null = null

  constructor(
    private readonly authReader: IAuthReader,    // ISP: read-only state view
    private readonly authCommands: IAuthCommands, // ISP: command surface
    private readonly eventBus: AuthEventBus       // Observer bus
  ) {}

  init(): void {
    // 1. Build LoginModal first — other components reference it via a callback
    const loginModalEl = this.ensureElement('login-modal-container')
    this.loginModal = new LoginModal(loginModalEl, this.authCommands)

    // 2. Build LoginButton
    const authControlsEl = this.ensureElement('auth-controls')
    this.loginButton = new LoginButton(
      authControlsEl,
      { onSignIn: () => this.loginModal!.show(),
        onSignOut: () => this.authCommands.signOut() }
    )
    this.loginButton.render(
      this.authReader.getAuthState(),
      this.authReader.getDisplayName()
    )

    // 3. Build GuestPromoBar
    const promoBarEl = this.ensureElement('guest-promo-bar')
    this.guestPromoBar = new GuestPromoBar(
      promoBarEl,
      { onSignIn: () => this.loginModal!.show() }
    )
    if (this.authReader.getAuthState() === 'guest') {
      this.guestPromoBar.show()
    }

    // 4. Register all components as Observers on AuthEventBus (Observer pattern)
    this.eventBus.subscribe(this.loginButton)
    this.eventBus.subscribe(this.guestPromoBar)
    this.eventBus.subscribe(this.loginModal)
  }

  /**
   * Shows the LoginModal. Called by app.ts post-init if auth state is guest.
   * Delegates to the component — AuthUIManager itself is not a modal manager.
   */
  showLoginModalIfGuest(): void {
    if (this.authReader.getAuthState() === 'guest') {
      this.loginModal?.show()
    }
  }

  private ensureElement(id: string): HTMLElement {
    const el = document.getElementById(id)
    if (!el) throw new Error(`[AuthUIManager] Required DOM element #${id} not found.`)
    return el
  }
}
```

---

## 12. UI Components

### 12.1 `LoginModal` — `src/components/LoginModal.ts`

**Pattern: Observer (implements `AuthStateObserver`)**
**DIP:** Depends on `IAuthCommands`, never on concrete `AuthService`.
**SRP:** Renders the sign-in modal, delegates all auth operations to `IAuthCommands`.

```typescript
export class LoginModal implements AuthStateObserver {
  constructor(
    private readonly hostEl: HTMLElement,
    private readonly commands: IAuthCommands  // DIP: interface, not AuthService
  ) {}

  /** AuthStateObserver — reacts to state changes from AuthEventBus. */
  onAuthStateChanged({ state }: AuthStateChangedPayload): void {
    if (state === 'authenticated') this.hide()
  }

  show(): void   { /* Bootstrap Modal.show() */ }
  hide(): void   { /* Bootstrap Modal.hide() */ }
  showError(message: string): void { /* inline alert */ }
  clearError(): void { /* clear inline alert */ }
}
```

**HTML structure** (injected into `#login-modal-container`):
```html
<div id="login-modal" class="modal" role="dialog" aria-modal="true"
     aria-labelledby="login-modal-title"
     data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-dark text-white">
        <h5 class="modal-title" id="login-modal-title">
          <i class="fas fa-fist-raised me-2" aria-hidden="true"></i>
          Sign in to ShadowFight Trainer
        </h5>
        <button type="button" class="btn-close btn-close-white" aria-label="Close"></button>
      </div>
      <div class="modal-body text-center py-4">
        <div class="alert alert-danger d-none" role="alert"></div>
        <div class="d-none text-muted mb-3">
          <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
          Redirecting to Google...
        </div>
        <p class="text-muted mb-4">
          Sign in to access your fight lists and track your progress.
        </p>
        <button type="button" class="btn btn-danger w-100 py-2">
          <i class="fab fa-google me-2" aria-hidden="true"></i>
          Sign in with Google
        </button>
      </div>
    </div>
  </div>
</div>
```

**Button handlers:**
```typescript
// "Sign in with Google"
googleBtn.addEventListener('click', async () => {
  this.clearError()
  this.setLoading(true)
  const error = await this.commands.signInWithGoogle()  // IAuthCommands
  if (error) {
    this.setLoading(false)
    this.showError(error)
  }
  // On success: redirect navigates away — spinner stays visible
})

// Close (✕) button
closeBtn.addEventListener('click', () => {
  this.hide()
  this.commands.notifyGuestDismissed()  // IAuthCommands — triggers guest role load
})
```

**Bootstrap Modal JS integration:**
```typescript
private bsModal: any = null

show(): void {
  if (!this.bsModal) {
    this.bsModal = new (window as any).bootstrap.Modal(this.modalEl, {
      backdrop: 'static',
      keyboard: false
    })
  }
  this.bsModal.show()
}
```
Using `window.bootstrap` avoids adding Bootstrap as an npm dependency and stays consistent with how the app loads Bootstrap from CDN.

---

### 12.2 `GuestPromoBar` — `src/components/GuestPromoBar.ts`

**Pattern: Observer (implements `AuthStateObserver`)**
**DIP:** Receives `onSignIn` callback typed as `() => void`, not a reference to `AuthService` or `LoginModal`.
**SRP:** Sole responsibility — render the promo bar and react to auth state changes.

```typescript
export interface GuestPromoBarCallbacks {
  onSignIn: () => void
}

export class GuestPromoBar implements AuthStateObserver {
  private dismissed = false

  constructor(
    private readonly hostEl: HTMLElement,
    private readonly callbacks: GuestPromoBarCallbacks
  ) {}

  /** AuthStateObserver — removes bar on sign-in, shows again on sign-out. */
  onAuthStateChanged({ state }: AuthStateChangedPayload): void {
    if (state === 'authenticated') {
      this.hide()
    } else if (state === 'guest' && !this.dismissed) {
      this.show()
    }
  }

  show(): void { /* render inner HTML, wire dismiss button */ }
  hide(): void { /* remove inner HTML from hostEl */ }
  wasDismissed(): boolean { return this.dismissed }
}
```

**HTML rendered inside `#guest-promo-bar`:**
```html
<div class="alert alert-info alert-dismissible mb-0 rounded-0 text-center py-2"
     role="status">
  <i class="fas fa-info-circle me-2" aria-hidden="true"></i>
  Please log in to discover more features.
  <button type="button" class="btn btn-sm btn-outline-primary ms-3">
    <i class="fas fa-sign-in-alt me-1" aria-hidden="true"></i>Sign In
  </button>
  <button type="button" class="btn-close ms-2" aria-label="Dismiss"></button>
</div>
```

**Key CSS decisions (no new CSS file):**
- `rounded-0` — flush edge-to-edge, no border-radius.
- `mb-0` — no gap below bar.
- `py-2` — compact height.

**Session-only dismiss:**
```typescript
dismissBtn.addEventListener('click', () => {
  this.dismissed = true
  this.hide()
})
```
No `localStorage` write — reappears on next page load if still a guest.

---

### 12.3 `LoginButton` — `src/components/LoginButton.ts`

**Pattern: Observer (implements `AuthStateObserver`)**
**DIP:** Receives `IAuthReader` for initial render and callbacks typed as `() => void` for actions.
**SRP:** Sole responsibility — render the correct header button state and react to auth changes.

```typescript
export interface LoginButtonCallbacks {
  onSignIn: () => void
  onSignOut: () => void
}

export class LoginButton implements AuthStateObserver {
  constructor(
    private readonly hostEl: HTMLElement,
    private readonly callbacks: LoginButtonCallbacks
  ) {}

  /** AuthStateObserver — called by AuthEventBus on every auth state change. */
  onAuthStateChanged({ state, displayName }: AuthStateChangedPayload): void {
    this.render(state, displayName)
  }

  render(state: AuthState, displayName: string | null): void {
    this.hostEl.innerHTML = state === 'authenticated'
      ? this.buildAuthenticatedHTML(displayName)
      : this.buildGuestHTML()
    this.wireButtons(state)
  }

  private truncateName(name: string | null): string {
    if (!name) return ''
    return name.length > 16 ? name.slice(0, 13) + '...' : name
  }
}
```

**HTML — guest state:**
```html
<button type="button" class="btn btn-outline-light btn-sm" aria-label="Sign in">
  <i class="fas fa-sign-in-alt me-1" aria-hidden="true"></i>Sign In
</button>
```

**HTML — authenticated state:**
```html
<span class="d-inline-flex align-items-center gap-2">
  <span class="text-white-50 small">
    <i class="fas fa-user-circle me-1" aria-hidden="true"></i>John D...
  </span>
  <button type="button" class="btn btn-outline-light btn-sm"
          aria-label="Signed in as John D..., click to sign out">
    Sign Out
  </button>
</span>
```

---

## 13. `app.ts` Integration

`app.ts` is now significantly simplified. It no longer knows about any auth component. It only:
1. Calls `AuthServiceFactory.create()`.
2. Calls `authService.init()`.
3. Constructs `AuthUIManager` with the two interface slices and the `eventBus`.
4. Calls `authUIManager.init()` and `authUIManager.showLoginModalIfGuest()`.

```typescript
// app.ts additions only — existing code unchanged

import { AuthServiceFactory } from './services/AuthServiceFactory'
import { AuthUIManager } from './managers/AuthUIManager'

// New private fields
private authUIManager: AuthUIManager | null = null

async init(): Promise<void> {
  // ── Step 1: Auth (before all other managers) ──────────────────────────────
  const { authService, eventBus } = AuthServiceFactory.create()
  await authService.init()

  // ── Steps 2–N: Existing manager init (unchanged) ──────────────────────────
  await this.migrationService.run()
  await this.techniqueManager.init()
  // ... all existing steps ...
  await this.fightListUIManager.init()

  // ── Auth UI (after DOM is fully initialised) ──────────────────────────────
  this.authUIManager = new AuthUIManager(
    authService,   // typed as IAuthReader
    authService,   // typed as IAuthCommands  (same object, different ISP slice)
    eventBus
  )
  this.authUIManager.init()
  this.authUIManager.showLoginModalIfGuest()

  // ... rest of existing init unchanged ...
}
```

**OCP for `app.ts`:** Adding future auth-reactive UI (e.g. a permission-gated toolbar) means registering a new observer on `eventBus` — `app.ts` does not change.

---

## 14. `index.html` Changes

```html
<!-- CHANGE 1: position: relative on header to anchor the absolute auth-controls -->
<header class="row bg-dark text-white py-3" style="position: relative;">

  <!-- auth-controls hook — LoginButton is injected here by AuthUIManager -->
  <div id="auth-controls"
       style="position: absolute; top: 50%; left: 1rem;
              transform: translateY(-50%); max-width: 200px;">
  </div>

  <div class="col-12 text-center">
    <h1><i class="fas fa-fist-raised me-2"></i>Krav Maga Trainer</h1>
    <p class="mb-0 d-none d-md-block">...</p>
  </div>
</header>

<!-- CHANGE 2: GuestPromoBar hook — between header and main -->
<div id="guest-promo-bar"></div>

<!-- CHANGE 3: LoginModal container — at end of body (Bootstrap modal pattern) -->
<div id="login-modal-container"></div>

<main class="row">...</main>
```

---

## 15. Database Schema & Migration

### 15.1 Migration File

**Path:** `supabase/migrations/<timestamp>_create_users_roles_permissions.sql`

The migration creates the four tables and immediately enables Row Level Security on each one. RLS is the security boundary that allows the client to talk directly to PostgreSQL using only the anon key — without it, any client could read or write any row.

```sql
-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permissions (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id         uuid PRIMARY KEY,             -- matches auth.users.id
  role_id    uuid REFERENCES roles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
--
-- The client uses the anon key and talks directly to PostgREST.
-- RLS policies are the only enforcement layer between the client and the DB.
-- Every table must have RLS enabled; tables with no policy default to DENY ALL.

-- users: each authenticated user may only read and write their own row.
-- auth.uid() is set by Supabase after the OAuth redirect completes,
-- so the upsert in SupabaseUserRepository.upsertUser() passes correctly.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: own row only"
  ON users
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- roles: public read required so guest permission loading works
-- before the user authenticates (auth.uid() is null for guests).
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles: read by all"
  ON roles
  FOR SELECT
  USING (true);

-- permissions: public read for the same reason as roles.
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions: read by all"
  ON permissions
  FOR SELECT
  USING (true);

-- role_permissions: public read — needed to resolve the full permission set
-- for any role, including guest, without requiring authentication.
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions: read by all"
  ON role_permissions
  FOR SELECT
  USING (true);
```

**RLS policy rationale:**

| Table | Policy | Reason |
|---|---|---|
| `users` | `auth.uid() = id` (ALL operations) | A user may only touch their own row. No user can read another user's role or created_at. |
| `roles` | Public SELECT | Guest permission loading queries `roles` before authentication. Read-only; no data is sensitive. |
| `permissions` | Public SELECT | Same as `roles` — needed for guest role resolution. |
| `role_permissions` | Public SELECT | Same — needed to resolve any role's permission set. |

**Why the upsert passes after OAuth:** `SupabaseUserRepository.upsertUser()` is called from `UserService.ensureUser()`, which is triggered by the `SIGNED_IN` event. By that point the Supabase session is active and `auth.uid()` returns the user's UUID, satisfying the `users: own row only` policy.

### 15.2 Seed File

**Path:** `supabase/seed.sql`

```sql
INSERT INTO roles (name) VALUES ('student'), ('sys-admin'), ('guest')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name)
VALUES ('play-fight-list'), ('edit-fight-list'), ('share-fight-list')
ON CONFLICT (name) DO NOTHING;

-- student: play + edit
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.name = 'student'
    AND p.name IN ('play-fight-list', 'edit-fight-list')
ON CONFLICT DO NOTHING;

-- sys-admin: all
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.name = 'sys-admin'
ON CONFLICT DO NOTHING;

-- guest: no permissions (no rows needed)
```

---

## 16. Environment Variables

### `.env.example` (committed):
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### `.gitignore` additions:
```
.env.development
.env.production
```

Validation is handled entirely by `SupabaseClientFactory.create()` — throws on missing vars before any async work begins.

---

## 17. `package.json` Dependency

```json
"dependencies": {
  "@supabase/supabase-js": "2.49.4"
}
```

Pin to exact version (verify current stable at implementation time). In `dependencies`, not `devDependencies` — it ships in the production bundle.

---

## 18. File Map — Complete

| File | Status | Notes |
|---|---|---|
| `src/types/auth.ts` | **New** | All auth types + ISP interfaces + `IAuthProvider`, `IUserRepository` |
| `src/services/SupabaseClientFactory.ts` | **New** | Factory — env-var validation + client construction |
| `src/services/GoogleAuthProvider.ts` | **New** | Strategy — implements `IAuthProvider` for Google OAuth |
| `src/services/SupabaseUserRepository.ts` | **New** | Repository — implements `IUserRepository`, all Supabase queries |
| `src/services/PermissionService.ts` | **New** | Singleton — exports `permissionReader` (`IPermissionReader`) + `permissionWriter` (`IPermissionWriter`) |
| `src/services/UserService.ts` | **New** | Use-case orchestration — `ensureUser`, `loadGuestRole`, error fallback |
| `src/services/AuthEventBus.ts` | **New** | Observer hub — `subscribe`, `emit` |
| `src/services/AuthService.ts` | **New** | Facade — implements `IAuthReader` + `IAuthCommands`, wires provider + userService + eventBus |
| `src/services/AuthServiceFactory.ts` | **New** | Wiring factory — assembles all concrete service deps |
| `src/managers/AuthUIManager.ts` | **New** | Auth UI orchestration — builds components, registers as observers |
| `src/components/LoginModal.ts` | **New** | Observer — Bootstrap 5 modal, `IAuthCommands` |
| `src/components/GuestPromoBar.ts` | **New** | Observer — alert bar, session-only dismiss |
| `src/components/LoginButton.ts` | **New** | Observer — header sign-in/out control |
| `supabase/migrations/<ts>_create_users_roles_permissions.sql` | **New** | Schema |
| `supabase/seed.sql` | **New** | Roles, permissions, role_permissions |
| `.env.example` | **New** | Documents required env vars |
| `src/app.ts` | **Modified** | Add `AuthServiceFactory.create()` + `AuthUIManager.init()` |
| `index.html` | **Modified** | `#auth-controls`, `#guest-promo-bar`, `#login-modal-container` |
| `package.json` | **Modified** | Add `@supabase/supabase-js` pinned |
| `.gitignore` | **Modified** | Add `.env.development`, `.env.production` |

---

## 19. SOLID Principles — Compliance Checklist

| Principle | Satisfied By | Violation in Previous Draft |
|---|---|---|
| **S — Single Responsibility** | `SupabaseClientFactory` (env + client only); `UserService` (orchestration only); `SupabaseUserRepository` (queries only); `AuthEventBus` (observer management only); `AuthUIManager` (auth UI wiring only) | `AuthService` previously owned client creation, state machine, OAuth, DB calls, and UI callbacks |
| **O — Open/Closed** | `IAuthProvider` Strategy — new providers add a class, `AuthService` unchanged; `AuthEventBus` — new UI observers register themselves, `AuthEventBus` unchanged | `AuthService.init()` would need modification to support additional auth providers |
| **L — Liskov Substitution** | All concrete classes typed against their interfaces; test doubles can substitute any injected dependency without altering behaviour | No concrete LSP violation in draft, but no interfaces were defined, making substitution impossible |
| **I — Interface Segregation** | `IAuthReader` / `IAuthCommands`; `IPermissionReader` / `IPermissionWriter`; `IAuthProvider` / `IUserRepository` | `AuthService` exposed `getSupabaseClient()` — callers had to know about Supabase internals; single `PermissionService` export gave all callers write access |
| **D — Dependency Inversion** | `AuthService` depends on `IAuthProvider`, `UserService`, `AuthEventBus` — no concrete imports; `UserService` depends on `IUserRepository` + `IPermissionWriter`; `app.ts` only imports factory + interfaces | `LoginModal` imported concrete `AuthService`; `AuthService` imported `PermissionService` concrete singleton directly |

---

## 20. RLS Mechanics — How the Security Boundary Works

Section §15.1 specifies the RLS policies. This section explains the underlying mechanism so the intent of each policy is clear during implementation and review.

### What RLS Does at the Database Level

RLS attaches an invisible `WHERE` clause to every query PostgreSQL executes. The application code never sees or controls it.

```sql
-- Client sends:
SELECT * FROM users

-- PostgreSQL executes (with RLS active):
SELECT * FROM users WHERE auth.uid() = id
```

If no policy matches a row, that row is invisible. If RLS is enabled on a table with no policies at all, the table returns nothing for any client request.

### How `auth.uid()` Is Populated

```
Browser                          Supabase Auth
  ├─ signInWithOAuth() ─────────►
  │◄── JWT token ────────────────   (contains user UUID, signed by Supabase)

  ├─ supabase.from('users').select()
  │   [JWT in Authorization header, sent automatically by the JS client]
  │                                PostgreSQL: auth.uid() = UUID from JWT
  │◄── only rows where id = uid ──
```

The JWT is cryptographically signed by Supabase. A client cannot forge a different `auth.uid()` value — a tampered JWT is rejected before any SQL runs.

Guest requests carry no JWT. `auth.uid()` returns `null`. `null = id` is never true, so guests cannot read any row in the `users` table.

### The Two Policy Shapes Used Here

**Public read (reference tables):**
```sql
CREATE POLICY "roles: read by all" ON roles FOR SELECT USING (true);
```
`true` always passes. Every row is readable by everyone, including unauthenticated guests. No INSERT/UPDATE/DELETE policy means those operations are denied for anon-key clients.

**Own row only (user data):**
```sql
CREATE POLICY "users: own row only" ON users FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```
`USING` filters reads. `WITH CHECK` filters writes. The user can only touch the row whose `id` matches their JWT UUID.

### Why the Upsert Still Works Post-OAuth

`SupabaseUserRepository.upsertUser()` runs after the OAuth redirect completes and `onAuthStateChange` fires `SIGNED_IN`. At that point the Supabase session is active and `auth.uid()` returns the user's UUID — the `WITH CHECK` clause passes for their own row.

### Service Role Key vs Anon Key

| Key | Bypasses RLS | Where It Lives |
|---|---|---|
| **Anon key** | No — RLS fully enforced | Vercel env vars, baked into bundle |
| **Service role key** | Yes — unrestricted access | GitHub Actions secrets only, never in client code |

The anon key is safe to store in Vercel environment variables because RLS limits what it can do. The service role key must never appear in client-side code or in Vercel env vars.

---

## 21. Vercel Credentials Management

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set directly in Vercel — no `.env` file is committed, no push is required.

### Via the Vercel Dashboard

1. Vercel project → **Settings** → **Environment Variables**
2. Add or update each variable, select environments (**Production** / **Preview** / **Development**)
3. **Save**
4. Redeploy: **Deployments** → latest → **⋯** → **Redeploy**

### Via the Vercel CLI

```powershell
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod   # redeploy
```

### How Vite Uses Them

Vercel runs `npm run build` on every deploy. Vite replaces every `import.meta.env.VITE_*` reference with the literal value from the Vercel environment at build time. The values are baked into the static bundle — there is no `.env` file in the repository and no server reading env vars at runtime.

The local `.env.development` file (gitignored) is used only by `npm run dev`. Vercel never reads it.

**Cross-reference:** `SupabaseClientFactory` (§3) validates that both vars are present and throws a descriptive error at startup if either is missing.
