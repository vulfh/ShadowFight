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
