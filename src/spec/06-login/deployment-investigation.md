# Deployment Investigation — Feature 06: Supabase Login & RBAC

## Question

The current codebase is a client-side-only PWA. Login and database access will use Supabase. Do we need a backend, or is Supabase serverless?

---

## Answer: Supabase is Serverless — No Backend Required

Yes — Supabase is serverless from the project's perspective. No server code is written or deployed. The architecture stays **client → Supabase** with no server in between.

```
PWA (TypeScript, runs in browser)
  └── @supabase/supabase-js
        ├── supabase.auth.*         → Supabase Auth service (Google OAuth)
        └── supabase.from(table)    → PostgREST → managed PostgreSQL
```

---

## What Supabase Provides Out of the Box

| Concern | How Supabase handles it | We write |
|---|---|---|
| **Authentication** | Supabase Auth — Google OAuth flow, session tokens, `auth.users` table | Nothing — call `signInWithOAuth()` |
| **Database** | Managed PostgreSQL | SQL migration files (`supabase/migrations/`) |
| **DB access from client** | PostgREST — auto-generates a REST API over tables | Nothing — use the JS client (`supabase.from('users').select(...)`) |
| **Authorization** | Row Level Security (RLS) policies written in SQL | RLS policy SQL (a few lines per table, added to migration) |
| **Session persistence** | Supabase JS client handles tokens in `localStorage` automatically | Nothing |

---

## The Critical Piece: Row Level Security (RLS)

Because the client talks **directly to the database** using only the anon key, RLS policies are what prevent one user from reading another user's data. Without RLS enabled, any client could query any row.

For this feature the policies are straightforward:

```sql
-- users: each user can only read/write their own row
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: own row only"
  ON users
  FOR ALL
  USING (auth.uid() = id);

-- roles, permissions, role_permissions: public read
-- (required so guest permission loading works without authentication)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles: read by all"
  ON roles FOR SELECT USING (true);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions: read by all"
  ON permissions FOR SELECT USING (true);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions: read by all"
  ON role_permissions FOR SELECT USING (true);
```

These RLS policies must be added to the migration file alongside the `CREATE TABLE` statements.

**Why the upsert still works:** `SupabaseUserRepository.upsertUser()` runs after the OAuth redirect completes and the Supabase session is active. At that point `auth.uid()` is set to the signed-in user's ID, so the `users: own row only` policy passes for their own row.

---

## When a Backend Would Be Needed

A server-side component (Supabase Edge Functions or a separate API) would only be needed for:

| Scenario | Example |
|---|---|
| Logic that must not run on the client | Payment processing, sending email |
| Operations requiring the **service role key** | Admin actions that bypass RLS |
| Webhooks | Reacting to DB events server-side |

None of these scenarios apply to Feature 06. Login, user upsert, and permission loading are all covered by Supabase Auth + RLS + the anon key. The design stays purely client-side.

---

## Action Required

The RLS policies listed above must be added to:

```
supabase/migrations/<timestamp>_create_users_roles_permissions.sql
```

This is an update to the migration file already specified in the design document (`design.md` §15.1).

---

## RLS Deep Dive

### What RLS Is

RLS (Row Level Security) is a PostgreSQL feature that attaches a SQL condition to a table evaluated on **every query** — SELECT, INSERT, UPDATE, DELETE. If the condition returns false for a row, that row is invisible (or unwritable) for that request.

It is the security layer that makes "client talks directly to the database" safe. Without it, anyone with the Supabase anon key could read every row in every table.

### The Mental Model

Think of it as an invisible `WHERE` clause that PostgreSQL adds automatically to every query:

```sql
-- What the client sends:
SELECT * FROM users

-- What PostgreSQL actually executes (with RLS active):
SELECT * FROM users WHERE auth.uid() = id
```

The user never sees or controls that extra condition — it is enforced at the database level, not in application code.

### The Two Steps — Always Both

**Step 1: Enable RLS on the table** (off by default)
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```
With RLS enabled but no policies, **nobody can read anything** — not even authenticated users. The table goes dark.

**Step 2: Write policies that re-open specific access**
```sql
CREATE POLICY "users: own row only"
  ON users
  FOR ALL                          -- SELECT, INSERT, UPDATE, DELETE
  USING (auth.uid() = id)          -- row is visible only if this is true
  WITH CHECK (auth.uid() = id);    -- row can only be written if this is true
```

`USING` = filter for reads. `WITH CHECK` = filter for writes.

### How `auth.uid()` Gets Its Value

```
Browser                          Supabase
  │                                 │
  ├─ signInWithOAuth() ────────────►│
  │◄── JWT token ───────────────────┤  (contains user UUID, signed by Supabase)
  │                                 │
  ├─ supabase.from('users')         │
  │   .select(...)  ───────────────►│
  │   [JWT sent in Authorization    │  PostgreSQL calls auth.uid()
  │    header automatically]        │  → extracts UUID from JWT
  │                                 │  → evaluates USING clause
  │◄── only matching rows ──────────┤
```

The JWT is cryptographically signed by Supabase. A client cannot forge a different `auth.uid()` value — if the signature does not match, the JWT is rejected before any SQL runs.

### The Two Policy Patterns Used in This Project

**Pattern 1: Public read-only** (reference data — roles, permissions, role_permissions, and future techniques table)

Anyone, authenticated or not, can read. Nobody can write via the client.
```sql
ALTER TABLE techniques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "techniques: read by all"
  ON techniques FOR SELECT USING (true);
```
No INSERT/UPDATE/DELETE policy means those operations are blocked for everyone using the anon key. Data is written only via migrations or the Supabase dashboard (which uses the service role key that bypasses RLS entirely).

**Pattern 2: Own row only** (user-specific data — the `users` table, and future `user_technique_settings`)

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users: own row only"
  ON users FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

Guest requests have no JWT, so `auth.uid()` returns `null`, and `null = id` is always false — guests cannot read any user rows.

### RLS Policy Summary for This Project

| Table | Policy | Reason |
|---|---|---|
| `techniques` | `FOR SELECT USING (true)` | Reference data, all users need it |
| `roles` | `FOR SELECT USING (true)` | Reference data |
| `permissions` | `FOR SELECT USING (true)` | Reference data |
| `role_permissions` | `FOR SELECT USING (true)` | Reference data |
| `users` | `FOR ALL USING (auth.uid() = id)` | Private — each user owns their row |

The rule: **reference data → public SELECT, no writes. User data → own row only.**
