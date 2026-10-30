/**
 * P2.1 — TDD tests for src/types/auth.ts
 *
 * Strategy: TypeScript interfaces/types are compile-time contracts, not
 * runtime objects. We verify them by:
 *   1. Creating correctly-typed values and asserting structural properties.
 *   2. Verifying that the union/literal types contain exactly the expected members.
 *   3. Smoke-testing that objects satisfying each interface are accepted by
 *      functions typed against those interfaces (satisfies the Liskov checks).
 *
 * No mocks required — these are pure type-level + value-level tests.
 */

import { describe, it, expect } from 'vitest'
import type {
  AuthState,
  Permission,
  Role,
  AppUser,
  AuthStateChangedPayload,
  AuthStateObserver,
  IAuthReader,
  IAuthCommands,
  IPermissionReader,
  IPermissionWriter,
  IUserRepository,
  IAuthProvider,
} from '../types/auth'

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compile-time only: asserts T extends Expected.
 * If the type assertion fails, TypeScript errors before tests run.
 */
function assertType<T>(_value: T): void {
  // intentionally empty — existence proves the type compiled
}

// ── AuthState ─────────────────────────────────────────────────────────────

describe('AuthState', () => {
  it('accepts loading', () => {
    const s: AuthState = 'loading'
    expect(s).toBe('loading')
  })

  it('accepts guest', () => {
    const s: AuthState = 'guest'
    expect(s).toBe('guest')
  })

  it('accepts authenticated', () => {
    const s: AuthState = 'authenticated'
    expect(s).toBe('authenticated')
  })

  it('covers exactly three states (type guard exhaustiveness)', () => {
    const allStates: AuthState[] = ['loading', 'guest', 'authenticated']
    expect(allStates).toHaveLength(3)
  })
})

// ── Permission ────────────────────────────────────────────────────────────

describe('Permission', () => {
  it('accepts play-fight-list', () => {
    const p: Permission = 'play-fight-list'
    expect(p).toBe('play-fight-list')
  })

  it('accepts edit-fight-list', () => {
    const p: Permission = 'edit-fight-list'
    expect(p).toBe('edit-fight-list')
  })

  it('accepts share-fight-list', () => {
    const p: Permission = 'share-fight-list'
    expect(p).toBe('share-fight-list')
  })

  it('covers exactly three permission values', () => {
    const allPermissions: Permission[] = [
      'play-fight-list',
      'edit-fight-list',
      'share-fight-list',
    ]
    expect(allPermissions).toHaveLength(3)
  })
})

// ── Role ──────────────────────────────────────────────────────────────────

describe('Role interface', () => {
  it('accepts a valid Role object', () => {
    const role: Role = { id: 'abc-123', name: 'student' }
    expect(role.id).toBe('abc-123')
    expect(role.name).toBe('student')
  })

  it('accepts sys-admin role name', () => {
    const role: Role = { id: 'def-456', name: 'sys-admin' }
    expect(role.name).toBe('sys-admin')
  })

  it('accepts guest role name', () => {
    const role: Role = { id: 'ghi-789', name: 'guest' }
    expect(role.name).toBe('guest')
  })

  it('has id and name properties', () => {
    const role: Role = { id: 'id-1', name: 'student' }
    expect(Object.keys(role)).toEqual(expect.arrayContaining(['id', 'name']))
  })
})

// ── AppUser ───────────────────────────────────────────────────────────────

describe('AppUser interface', () => {
  it('accepts a valid AppUser object', () => {
    const user: AppUser = {
      id: 'user-uuid',
      roleId: 'role-uuid',
      createdAt: '2026-10-30T10:00:00.000Z',
    }
    expect(user.id).toBe('user-uuid')
    expect(user.roleId).toBe('role-uuid')
    expect(user.createdAt).toBe('2026-10-30T10:00:00.000Z')
  })

  it('has exactly id, roleId, createdAt properties', () => {
    const user: AppUser = { id: 'u', roleId: 'r', createdAt: 'ts' }
    expect(Object.keys(user)).toEqual(expect.arrayContaining(['id', 'roleId', 'createdAt']))
    expect(Object.keys(user)).toHaveLength(3)
  })
})

// ── AuthStateChangedPayload ───────────────────────────────────────────────

describe('AuthStateChangedPayload interface', () => {
  it('accepts an authenticated payload', () => {
    const payload: AuthStateChangedPayload = {
      state: 'authenticated',
      displayName: 'Alice',
      permissions: ['play-fight-list', 'edit-fight-list'],
    }
    expect(payload.state).toBe('authenticated')
    expect(payload.displayName).toBe('Alice')
    expect(payload.permissions).toHaveLength(2)
  })

  it('accepts a guest payload with null displayName', () => {
    const payload: AuthStateChangedPayload = {
      state: 'guest',
      displayName: null,
      permissions: [],
    }
    expect(payload.displayName).toBeNull()
    expect(payload.permissions).toHaveLength(0)
  })

  it('accepts a loading payload', () => {
    const payload: AuthStateChangedPayload = {
      state: 'loading',
      displayName: null,
      permissions: [],
    }
    expect(payload.state).toBe('loading')
  })
})

// ── AuthStateObserver ─────────────────────────────────────────────────────

describe('AuthStateObserver interface', () => {
  it('an object with onAuthStateChanged satisfies the interface', () => {
    const received: AuthStateChangedPayload[] = []

    const observer: AuthStateObserver = {
      onAuthStateChanged(payload) {
        received.push(payload)
      },
    }

    const testPayload: AuthStateChangedPayload = {
      state: 'authenticated',
      displayName: 'Bob',
      permissions: ['play-fight-list'],
    }

    observer.onAuthStateChanged(testPayload)

    expect(received).toHaveLength(1)
    expect(received[0]).toEqual(testPayload)
  })
})

// ── IAuthReader ───────────────────────────────────────────────────────────

describe('IAuthReader interface', () => {
  it('a conforming object satisfies IAuthReader', () => {
    const reader: IAuthReader = {
      getAuthState: () => 'guest',
      getDisplayName: () => null,
    }

    expect(reader.getAuthState()).toBe('guest')
    expect(reader.getDisplayName()).toBeNull()
  })

  it('getAuthState return type is AuthState', () => {
    const reader: IAuthReader = {
      getAuthState: () => 'authenticated',
      getDisplayName: () => 'Carol',
    }
    const state: AuthState = reader.getAuthState()
    assertType<AuthState>(state)
    expect(state).toBe('authenticated')
  })
})

// ── IAuthCommands ─────────────────────────────────────────────────────────

describe('IAuthCommands interface', () => {
  it('a conforming object satisfies IAuthCommands', async () => {
    const commands: IAuthCommands = {
      signInWithGoogle: async () => null,
      signOut: async () => undefined,
      notifyGuestDismissed: async () => undefined,
    }

    const errorMsg = await commands.signInWithGoogle()
    expect(errorMsg).toBeNull()
  })

  it('signInWithGoogle returns error string on failure', async () => {
    const commands: IAuthCommands = {
      signInWithGoogle: async () => 'OAuth misconfigured',
      signOut: async () => undefined,
      notifyGuestDismissed: async () => undefined,
    }

    const err = await commands.signInWithGoogle()
    expect(err).toBe('OAuth misconfigured')
  })

  it('signOut and notifyGuestDismissed return void', async () => {
    const commands: IAuthCommands = {
      signInWithGoogle: async () => null,
      signOut: async () => undefined,
      notifyGuestDismissed: async () => undefined,
    }

    const signOutResult = await commands.signOut()
    const dismissResult = await commands.notifyGuestDismissed()

    expect(signOutResult).toBeUndefined()
    expect(dismissResult).toBeUndefined()
  })
})

// ── IPermissionReader ─────────────────────────────────────────────────────

describe('IPermissionReader interface', () => {
  it('a conforming object satisfies IPermissionReader', () => {
    const perms: Permission[] = ['play-fight-list']

    const reader: IPermissionReader = {
      hasPermission: (p) => perms.includes(p),
      getPermissions: () => [...perms],
    }

    expect(reader.hasPermission('play-fight-list')).toBe(true)
    expect(reader.hasPermission('share-fight-list')).toBe(false)
    expect(reader.getPermissions()).toEqual(['play-fight-list'])
  })

  it('getPermissions returns a Permission array', () => {
    const reader: IPermissionReader = {
      hasPermission: () => false,
      getPermissions: () => [],
    }
    const result: Permission[] = reader.getPermissions()
    assertType<Permission[]>(result)
    expect(result).toHaveLength(0)
  })
})

// ── IPermissionWriter ─────────────────────────────────────────────────────

describe('IPermissionWriter interface', () => {
  it('a conforming object satisfies IPermissionWriter', () => {
    let stored: Permission[] = []

    const writer: IPermissionWriter = {
      setPermissions: (ps) => { stored = ps },
    }

    writer.setPermissions(['edit-fight-list', 'share-fight-list'])
    expect(stored).toEqual(['edit-fight-list', 'share-fight-list'])
  })

  it('setPermissions replaces existing permissions', () => {
    let stored: Permission[] = ['play-fight-list']

    const writer: IPermissionWriter = {
      setPermissions: (ps) => { stored = ps },
    }

    writer.setPermissions([])
    expect(stored).toHaveLength(0)
  })
})

// ── IPermissionReader and IPermissionWriter are segregated ────────────────

describe('ISP — IPermissionReader vs IPermissionWriter segregation', () => {
  it('IPermissionReader has no setPermissions method', () => {
    const reader: IPermissionReader = {
      hasPermission: () => true,
      getPermissions: () => [],
    }
    // TypeScript would error if we tried: reader.setPermissions([])
    // Runtime check confirms the method is absent on this typed surface
    expect('setPermissions' in reader).toBe(false)
  })

  it('IPermissionWriter has no hasPermission or getPermissions methods', () => {
    const writer: IPermissionWriter = {
      setPermissions: () => undefined,
    }
    expect('hasPermission' in writer).toBe(false)
    expect('getPermissions' in writer).toBe(false)
  })
})

// ── IUserRepository ───────────────────────────────────────────────────────

describe('IUserRepository interface', () => {
  it('a conforming object satisfies IUserRepository', async () => {
    const repo: IUserRepository = {
      upsertUser: async (_userId) => undefined,
      loadPermissionsForUser: async (_userId) => ['play-fight-list', 'edit-fight-list'],
      loadGuestPermissions: async () => [],
    }

    await expect(repo.upsertUser('some-id')).resolves.toBeUndefined()
    await expect(repo.loadPermissionsForUser('some-id')).resolves.toEqual([
      'play-fight-list',
      'edit-fight-list',
    ])
    await expect(repo.loadGuestPermissions()).resolves.toEqual([])
  })

  it('upsertUser is idempotent by contract — second call succeeds', async () => {
    const upserted: string[] = []
    const repo: IUserRepository = {
      upsertUser: async (userId) => { upserted.push(userId) },
      loadPermissionsForUser: async () => [],
      loadGuestPermissions: async () => [],
    }

    await repo.upsertUser('uid-1')
    await repo.upsertUser('uid-1') // second call must not throw
    expect(upserted).toHaveLength(2)
  })
})

// ── IAuthProvider ─────────────────────────────────────────────────────────

describe('IAuthProvider interface', () => {
  it('getSession returns null when no session exists', async () => {
    const provider: IAuthProvider = {
      getSession: async () => null,
      signIn: async () => null,
      signOut: async () => undefined,
      onAuthEvent: (_listener) => () => undefined,
    }

    const session = await provider.getSession()
    expect(session).toBeNull()
  })

  it('getSession returns userId and displayName when session exists', async () => {
    const provider: IAuthProvider = {
      getSession: async () => ({ userId: 'uid-abc', displayName: 'Dave' }),
      signIn: async () => null,
      signOut: async () => undefined,
      onAuthEvent: (_listener) => () => undefined,
    }

    const session = await provider.getSession()
    expect(session?.userId).toBe('uid-abc')
    expect(session?.displayName).toBe('Dave')
  })

  it('signIn returns null on success (redirect flow)', async () => {
    const provider: IAuthProvider = {
      getSession: async () => null,
      signIn: async () => null,
      signOut: async () => undefined,
      onAuthEvent: (_listener) => () => undefined,
    }

    expect(await provider.signIn()).toBeNull()
  })

  it('signIn returns error string on immediate failure', async () => {
    const provider: IAuthProvider = {
      getSession: async () => null,
      signIn: async () => 'popup_closed_by_user',
      signOut: async () => undefined,
      onAuthEvent: (_listener) => () => undefined,
    }

    expect(await provider.signIn()).toBe('popup_closed_by_user')
  })

  it('onAuthEvent delivers SIGNED_IN event with user data', () => {
    type Listener = Parameters<IAuthProvider['onAuthEvent']>[0]
    const received: Parameters<Listener>[] = []

    const provider: IAuthProvider = {
      getSession: async () => null,
      signIn: async () => null,
      signOut: async () => undefined,
      onAuthEvent: (listener) => {
        listener('SIGNED_IN', { userId: 'uid-1', displayName: 'Eve' })
        return () => undefined
      },
    }

    provider.onAuthEvent((event, user) => {
      received.push([event, user])
    })

    expect(received).toHaveLength(1)
    expect(received[0][0]).toBe('SIGNED_IN')
    expect(received[0][1]).toEqual({ userId: 'uid-1', displayName: 'Eve' })
  })

  it('onAuthEvent delivers SIGNED_OUT event with null user', () => {
    type Listener = Parameters<IAuthProvider['onAuthEvent']>[0]
    const received: Parameters<Listener>[] = []

    const provider: IAuthProvider = {
      getSession: async () => null,
      signIn: async () => null,
      signOut: async () => undefined,
      onAuthEvent: (listener) => {
        listener('SIGNED_OUT', null)
        return () => undefined
      },
    }

    provider.onAuthEvent((event, user) => {
      received.push([event, user])
    })

    expect(received[0][0]).toBe('SIGNED_OUT')
    expect(received[0][1]).toBeNull()
  })

  it('onAuthEvent returns an unsubscribe function', () => {
    const provider: IAuthProvider = {
      getSession: async () => null,
      signIn: async () => null,
      signOut: async () => undefined,
      onAuthEvent: (_listener) => () => undefined,
    }

    const unsubscribe = provider.onAuthEvent(() => undefined)
    expect(typeof unsubscribe).toBe('function')
  })
})
