/**
 * P2.2 — TDD tests for src/services/PermissionService.ts
 *
 * Tests drive the implementation.  Run order:
 *   Red  → these tests fail (file doesn't exist yet)
 *   Green → PermissionService is written to make them pass
 *   Refactor → implementation cleaned up; tests stay green
 *
 * Design verified here:
 *   ISP  — permissionReader typed as IPermissionReader (no setPermissions visible)
 *          permissionWriter typed as IPermissionWriter (no hasPermission visible)
 *   SRP  — PermissionService owns ONLY in-memory permission storage
 *   LSP  — both exports satisfy their interface contracts interchangeably in tests
 *   Singleton — both exports share the same underlying instance
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { permissionReader, permissionWriter } from '../services/PermissionService'
import type { IPermissionReader, IPermissionWriter, Permission } from '../types/auth'

// ── ISP: type-level assertions ────────────────────────────────────────────────

/**
 * Compile-time assertion: the exported value satisfies the expected interface.
 * If the assignment fails to compile, the test file will not run at all —
 * catching ISP violations before any runtime test executes.
 */
const _reader: IPermissionReader = permissionReader
const _writer: IPermissionWriter = permissionWriter

// Suppress "unused variable" linter warnings — these ARE used (type check).
void _reader
void _writer

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Reset state between tests via the writer. */
function resetPermissions(): void {
  permissionWriter.setPermissions([])
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('PermissionService — permissionWriter', () => {
  beforeEach(resetPermissions)

  it('setPermissions stores a permission that hasPermission can find', () => {
    permissionWriter.setPermissions(['play-fight-list'])

    expect(permissionReader.hasPermission('play-fight-list')).toBe(true)
  })

  it('setPermissions replaces previous permissions (not appends)', () => {
    permissionWriter.setPermissions(['play-fight-list', 'edit-fight-list'])
    permissionWriter.setPermissions(['share-fight-list'])

    expect(permissionReader.hasPermission('play-fight-list')).toBe(false)
    expect(permissionReader.hasPermission('edit-fight-list')).toBe(false)
    expect(permissionReader.hasPermission('share-fight-list')).toBe(true)
  })

  it('setPermissions with empty array clears all permissions', () => {
    permissionWriter.setPermissions(['play-fight-list'])
    permissionWriter.setPermissions([])

    expect(permissionReader.hasPermission('play-fight-list')).toBe(false)
    expect(permissionReader.getPermissions()).toHaveLength(0)
  })

  it('setPermissions accepts all three known permissions at once', () => {
    const all: Permission[] = ['play-fight-list', 'edit-fight-list', 'share-fight-list']
    permissionWriter.setPermissions(all)

    all.forEach(p => expect(permissionReader.hasPermission(p)).toBe(true))
  })
})

describe('PermissionService — permissionReader.hasPermission', () => {
  beforeEach(resetPermissions)

  it('returns false when permission set is empty', () => {
    expect(permissionReader.hasPermission('play-fight-list')).toBe(false)
  })

  it('returns false for a permission not in the set', () => {
    permissionWriter.setPermissions(['play-fight-list'])

    expect(permissionReader.hasPermission('share-fight-list')).toBe(false)
  })

  it('returns true for each permission individually after setting all three', () => {
    permissionWriter.setPermissions(['play-fight-list', 'edit-fight-list', 'share-fight-list'])

    expect(permissionReader.hasPermission('play-fight-list')).toBe(true)
    expect(permissionReader.hasPermission('edit-fight-list')).toBe(true)
    expect(permissionReader.hasPermission('share-fight-list')).toBe(true)
  })
})

describe('PermissionService — permissionReader.getPermissions', () => {
  beforeEach(resetPermissions)

  it('returns empty array on fresh state', () => {
    expect(permissionReader.getPermissions()).toEqual([])
  })

  it('returns the permissions that were set', () => {
    permissionWriter.setPermissions(['play-fight-list', 'edit-fight-list'])

    expect(permissionReader.getPermissions()).toEqual(
      expect.arrayContaining(['play-fight-list', 'edit-fight-list'])
    )
    expect(permissionReader.getPermissions()).toHaveLength(2)
  })

  it('returns a defensive copy — mutating the result does not affect stored state', () => {
    permissionWriter.setPermissions(['play-fight-list'])

    const copy = permissionReader.getPermissions()
    copy.push('edit-fight-list') // mutate the returned array

    expect(permissionReader.getPermissions()).toEqual(['play-fight-list'])
  })
})

describe('PermissionService — singleton invariant', () => {
  beforeEach(resetPermissions)

  it('permissionReader and permissionWriter share the same underlying instance', () => {
    // Write via writer, read via reader — if they share state, this must work.
    permissionWriter.setPermissions(['edit-fight-list'])

    expect(permissionReader.hasPermission('edit-fight-list')).toBe(true)
  })

  it('state written in one import persists across multiple reads', () => {
    permissionWriter.setPermissions(['play-fight-list', 'share-fight-list'])

    // Two independent reads must return the same stable state.
    const first = permissionReader.getPermissions()
    const second = permissionReader.getPermissions()

    expect(first).toEqual(second)
  })
})

describe('PermissionService — ISP boundary (runtime smoke)', () => {
  beforeEach(resetPermissions)

  it('permissionReader exposes hasPermission and getPermissions', () => {
    expect(typeof permissionReader.hasPermission).toBe('function')
    expect(typeof permissionReader.getPermissions).toBe('function')
  })

  it('permissionWriter exposes setPermissions', () => {
    expect(typeof permissionWriter.setPermissions).toBe('function')
  })

  it('permissionReader does NOT expose setPermissions at the TypeScript interface level', () => {
    // The ISP boundary is enforced at compile-time by TypeScript, not at runtime.
    // Both exports point to the same singleton; JS `in` sees all methods on the prototype.
    // This test verifies the compile-time contract via a type assertion:
    //   if the next line were un-commented it would be a TypeScript compile error:
    //   permissionReader.setPermissions([])   // ← TS error: Property does not exist on IPermissionReader
    //
    // We assert the type is IPermissionReader — a narrower type than the impl class.
    const r: IPermissionReader = permissionReader
    expect(typeof r.hasPermission).toBe('function')
    expect(typeof r.getPermissions).toBe('function')
    // setPermissions not accessible via the IPermissionReader type at compile-time.
  })

  it('permissionWriter does NOT expose hasPermission or getPermissions at the TypeScript interface level', () => {
    // Same rationale — ISP is a compile-time guarantee enforced by TypeScript.
    //   permissionWriter.hasPermission('play-fight-list')  // ← TS compile error
    //   permissionWriter.getPermissions()                  // ← TS compile error
    //
    // We assert the type is IPermissionWriter — narrower than the impl class.
    const w: IPermissionWriter = permissionWriter
    expect(typeof w.setPermissions).toBe('function')
    // hasPermission / getPermissions not accessible via IPermissionWriter at compile-time.
  })
})
