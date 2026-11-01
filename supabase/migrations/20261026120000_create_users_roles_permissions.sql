-- =============================================================================
-- Migration: 20261026120000_create_users_roles_permissions
-- Feature 06: Supabase Login & RBAC
-- Task S1.2: Table DDL
-- Task S1.3: RLS policies (appended below DDL)
-- =============================================================================

-- ── roles ─────────────────────────────────────────────────────────────────────
-- Each user belongs to exactly one role.
-- name is the human-readable identifier ('student', 'sys-admin', 'guest').
CREATE TABLE IF NOT EXISTS roles (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

-- ── permissions ───────────────────────────────────────────────────────────────
-- Atomic capability strings kept in sync with the Permission union type
-- in src/types/auth.ts ('play-fight-list', 'edit-fight-list', 'share-fight-list').
CREATE TABLE IF NOT EXISTS permissions (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

-- ── role_permissions ──────────────────────────────────────────────────────────
-- Many-to-many join between roles and permissions.
-- Composite PK prevents duplicate entries.
-- Both FKs cascade delete to keep the join table clean when a role or
-- permission is removed.
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       uuid NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ── users ─────────────────────────────────────────────────────────────────────
-- Application-level user record.
-- id mirrors auth.users.id — no PII stored here.
-- role_id SET NULL on delete so a user is not hard-deleted if a role is removed;
-- application code treats NULL role_id as guest.
CREATE TABLE IF NOT EXISTS users (
  id         uuid PRIMARY KEY,
  role_id    uuid REFERENCES roles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- S1.3 — Row Level Security
-- =============================================================================

-- ── roles: all authenticated and anonymous callers may read ──────────────────
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles: read by all"
  ON roles FOR SELECT
  USING (true);

-- ── permissions: same as roles ────────────────────────────────────────────────
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions: read by all"
  ON permissions FOR SELECT
  USING (true);

-- ── role_permissions: same as roles ──────────────────────────────────────────
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions: read by all"
  ON role_permissions FOR SELECT
  USING (true);

-- ── users: each user owns their own row only ──────────────────────────────────
-- auth.uid() returns the UUID of the currently authenticated Supabase user.
-- WITH CHECK mirrors USING so inserts/updates are also restricted to own row.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: own row only"
  ON users FOR ALL
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
