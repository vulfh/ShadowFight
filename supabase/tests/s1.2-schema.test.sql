-- =============================================================================
-- S1.2 Schema Tests (TDD Red Phase → run AFTER migration to verify Green)
-- =============================================================================
-- These assertions document the expected schema shape.
-- Run against the target DB after applying the migration.
-- Each block either returns 0 rows (PASS) or 1 row with a failure message.
-- =============================================================================

-- ── T1: roles table exists ───────────────────────────────────────────────────
SELECT 'FAIL: roles table missing' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'roles'
);

-- ── T2: roles has expected columns ──────────────────────────────────────────
SELECT 'FAIL: roles.id column missing or wrong type' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'roles'
    AND column_name  = 'id'
    AND data_type    = 'uuid'
);

SELECT 'FAIL: roles.name column missing or wrong type' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'roles'
    AND column_name  = 'name'
    AND data_type    = 'text'
);

-- ── T3: permissions table exists ─────────────────────────────────────────────
SELECT 'FAIL: permissions table missing' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'permissions'
);

-- ── T4: permissions has expected columns ─────────────────────────────────────
SELECT 'FAIL: permissions.id column missing or wrong type' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'permissions'
    AND column_name  = 'id'
    AND data_type    = 'uuid'
);

SELECT 'FAIL: permissions.name column missing or wrong type' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'permissions'
    AND column_name  = 'name'
    AND data_type    = 'text'
);

-- ── T5: role_permissions table exists ────────────────────────────────────────
SELECT 'FAIL: role_permissions table missing' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'role_permissions'
);

-- ── T6: role_permissions FKs exist ───────────────────────────────────────────
SELECT 'FAIL: role_permissions.role_id FK to roles missing' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
  JOIN information_schema.key_column_usage kcu2
    ON rc.unique_constraint_name = kcu2.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name      = 'role_permissions'
    AND kcu.column_name    = 'role_id'
    AND kcu2.table_name    = 'roles'
);

SELECT 'FAIL: role_permissions.permission_id FK to permissions missing' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
  JOIN information_schema.key_column_usage kcu2
    ON rc.unique_constraint_name = kcu2.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name      = 'role_permissions'
    AND kcu.column_name    = 'permission_id'
    AND kcu2.table_name    = 'permissions'
);

-- ── T7: role_permissions composite PK ────────────────────────────────────────
SELECT 'FAIL: role_permissions composite PK missing' AS result
WHERE (
  SELECT COUNT(*)
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_name      = 'role_permissions'
) <> 2;  -- composite PK covers 2 columns

-- ── T8: users table exists ───────────────────────────────────────────────────
SELECT 'FAIL: users table missing' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'users'
);

-- ── T9: users has expected columns ───────────────────────────────────────────
SELECT 'FAIL: users.id column missing or wrong type' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'users'
    AND column_name  = 'id'
    AND data_type    = 'uuid'
);

SELECT 'FAIL: users.role_id column missing or wrong type' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'users'
    AND column_name  = 'role_id'
    AND data_type    = 'uuid'
);

SELECT 'FAIL: users.created_at column missing or wrong type' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'users'
    AND column_name  = 'created_at'
    AND data_type    = 'timestamp with time zone'
);

-- ── T10: users.role_id FK to roles with ON DELETE SET NULL ───────────────────
SELECT 'FAIL: users.role_id FK to roles missing' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
  JOIN information_schema.key_column_usage kcu2
    ON rc.unique_constraint_name = kcu2.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name      = 'users'
    AND kcu.column_name    = 'role_id'
    AND kcu2.table_name    = 'roles'
    AND rc.delete_rule     = 'SET NULL'
);

-- ── T11: UNIQUE constraints ───────────────────────────────────────────────────
SELECT 'FAIL: roles.name UNIQUE constraint missing' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.table_constraints
  WHERE constraint_type = 'UNIQUE'
    AND table_name      = 'roles'
);

SELECT 'FAIL: permissions.name UNIQUE constraint missing' AS result
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.table_constraints
  WHERE constraint_type = 'UNIQUE'
    AND table_name      = 'permissions'
);

-- =============================================================================
-- If all queries above return 0 rows → all tests PASS.
-- If any query returns a row → that test FAILS.
-- =============================================================================
