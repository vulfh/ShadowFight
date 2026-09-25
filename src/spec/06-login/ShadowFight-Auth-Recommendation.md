# Authentication Recommendation for ShadowFight PWA

**App:** https://github.com/vulfh/ShadowFight  
**Stack:** Vite + TypeScript PWA, hosted on Vercel  
**Current state:** Local storage only  

**Goals:**
- Passwordless login (avoid username/password typing)
- Stable user ID for future centralized storage of fight lists, notes, and fight-test configurations
- Future sharing of fight lists and notes between users
- Roles (trainer, instructor, student, etc.) and groups (clubs + subgroups inside clubs)

---

## Top Recommendation: **Clerk**

### Why it fits best

| Requirement              | How Clerk handles it                          | Why it matters for you                                      |
|--------------------------|-----------------------------------------------|-------------------------------------------------------------|
| Passwordless             | Google / Apple / Microsoft OAuth, Magic Links, Passkeys | One-tap or email-link login — zero password friction       |
| User ID                  | Stable `user.id` immediately available        | Perfect for scoping data later                              |
| Roles & Organizations    | Built-in Organizations + custom roles         | Clubs = Organizations. Roles: trainer, instructor, student. Nested groups via metadata or multiple orgs |
| Sharing                  | Organization membership + permissions         | Easy to share lists/notes inside a club or with specific roles |
| Vercel + Vite SPA        | Official JS/React SDK + pure JS support       | Drop-in for Vite; works great with Vercel                   |
| DX & future              | Pre-built `<SignIn />`, `<UserButton />`, dashboard, webhooks | Fastest path; you can stay passwordless-only            |

**Free tier:** 10k monthly active users (more than enough to start).  
**Cost later:** $25/mo + usage when you grow.

### Implementation sketch (Vite)

1. Create a Clerk application → enable Google + Apple + Magic Link + Passkeys.
2. Add `@clerk/clerk-js` (or React if you add it later).
3. Wrap the app, show sign-in only when needed, keep most training offline-capable.
4. On sign-in you get `user.id` → later store fight lists / notes under that ID.
5. When you add the DB, use Clerk webhooks to sync users + organization membership into your tables.

Clerk’s Organizations map almost 1:1 to “clubs + roles”, which is exactly what you described.

---

## Strong Alternative: **Supabase Auth**

(Especially if you already plan to use Supabase for the database)

- Fully passwordless (Google, Apple, Magic Link, OTP).
- Excellent free tier (50k MAU).
- Native Row Level Security (RLS) makes “data under user ID + club sharing” very clean.
- You build the roles/groups yourself (simple `profiles` + `club_members` tables + RLS policies).

**Choose Supabase Auth if:**
- You want one vendor for auth + database + storage.
- You prefer lower long-term cost and more control.
- You’re fine writing a bit more code for organizations/roles.

**Choose Clerk if:**
- You want the fastest, most polished experience and built-in Organizations/roles right now.
- You value the pre-built UI components and admin dashboard.

---

## Other Options (Less Ideal)

- **Auth.js / Better Auth** — free and flexible, but you have to build Organizations, roles, UI, and session handling yourself. More work for a pure Vite SPA.
- **Firebase Auth** — solid passwordless, but weaker native “organizations + roles” story compared with Clerk.
- Pure custom magic-link backend — unnecessary when excellent managed solutions exist.

---

## Practical Next Steps

1. Start with **Clerk** (or Supabase if you already like that stack).
2. Add social + magic-link login only (disable password entirely).
3. Keep the current localStorage behavior as the offline/default path; sync to the server once the user is logged in.
4. When you later add the database (Supabase, PlanetScale, Neon, etc.), use the Clerk/Supabase `user.id` as the foreign key and add organization/club tables.

---

*Generated for the ShadowFight PWA project.*
