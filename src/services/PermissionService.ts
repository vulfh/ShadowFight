/**
 * src/services/PermissionService.ts
 *
 * In-memory store for the currently-active permission set.
 *
 * SOLID applied:
 *   SRP  — sole responsibility: hold and expose the permission set in memory.
 *           No DB access, no auth logic, no UI coupling.
 *   ISP  — two separate exported references (permissionReader / permissionWriter)
 *           expose only the slice each caller needs. TypeScript prevents UI code
 *           from calling setPermissions(), and prevents UserService from calling
 *           hasPermission() or getPermissions() through the writer reference.
 *   DIP  — callers depend on IPermissionReader / IPermissionWriter abstractions,
 *           never on PermissionServiceImpl directly.
 *   LSP  — PermissionServiceImpl is a valid substitute for both interface types.
 *
 * Singleton pattern (module-level):
 *   A single PermissionServiceImpl instance is created when this module is first
 *   imported. Both exports point to the same instance, so writes via
 *   permissionWriter are immediately visible via permissionReader.
 */

import type { IPermissionReader, IPermissionWriter, Permission } from '../types/auth'

// ── Implementation (private to this module) ───────────────────────────────────

class PermissionServiceImpl implements IPermissionReader, IPermissionWriter {
  private permissions: Permission[] = []

  /** Replace the entire in-memory permission set. Called only by UserService. */
  setPermissions(permissions: Permission[]): void {
    this.permissions = [...permissions]
  }

  /** Returns true when the current set contains the given permission. */
  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission)
  }

  /** Returns a defensive copy so callers cannot mutate stored state. */
  getPermissions(): Permission[] {
    return [...this.permissions]
  }
}

// ── Singleton instance (module-private) ──────────────────────────────────────

const instance = new PermissionServiceImpl()

// ── ISP-split exports ─────────────────────────────────────────────────────────

/**
 * Read-only surface. Import this in UI components and any code that
 * gates behaviour on permissions.
 *
 * Typed as IPermissionReader — callers cannot call setPermissions().
 */
export const permissionReader: IPermissionReader = instance

/**
 * Write surface. Import ONLY in UserService.
 *
 * Typed as IPermissionWriter — callers cannot call hasPermission() or
 * getPermissions() through this reference.
 */
export const permissionWriter: IPermissionWriter = instance
