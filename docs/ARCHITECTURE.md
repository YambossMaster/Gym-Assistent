# Formal application architecture

## Runtime shape

Gym Assistant uses a local-responsive client and a server-authoritative write model.

```text
React Web / PWA
  - screen state
  - IndexedDB cache and unsent drafts
  - optimistic previews
             |
             | HTTPS / JSON
             v
TypeScript modular monolith
  - verifies external identity
  - derives the caller's workspace
  - executes complete business operations
  - exposes narrow public capabilities
             |
             v
Managed PostgreSQL
  - system of record
  - transactions and constraints
  - backup and recovery
```

The archived product demo remains in `demo/`. Its product rules and tests are input to the formal
application, but its `AppData` local-storage graph is not the production persistence model.

## Authority split

The client owns presentation, filtering, charts, form state, conflict previews, and recoverable
drafts. The server owns authentication, workspace authorization, official writes, concurrency,
capability redemption, and durable data. A client may predict a result but the server revalidates
every official state transition.

The browser never submits a `workspaceId`. Authenticated identity is mapped to a Workspace inside
the backend, and every repository operation receives that resolved Workspace ID from the
application module.

## Backend shape

V1 is one deployable API process plus one small Supabase Edge Function for daily account lifecycle
deletion. Modules expose complete operations rather than table CRUD. The browser never receives
Auth-administration authority: the Edge Function uses only platform-provided server secrets, and
`pg_cron` invokes it through `pg_net` with a Vault-held function-specific token. Other notification workers are not
part of the initial runtime.

```text
HTTP adapter -> application modules -> repository interface -> PostgreSQL adapter
      |                 ^                       |
      v                 |                       v
identity verifier ------+                 in-memory test adapter
```

The current M3 seam is deliberately small:

- verify an external identity;
- resolve or bootstrap its one Workspace;
- list, detail, create, edit, archive, and explicitly delete the Workspace's Students;
- record a Lesson Purchase and return the Student detail projection with a derived lesson balance.

`lesson_purchase` is an entitlement grant, not a mutable balance. It also records a Coach-entered
manual receipt in integer minor currency units plus its ISO currency, but does not initiate or
represent an online payment. The API derives remaining lessons as all purchased lesson counts minus
`course_session.status = 'completed'`; low or negative results stay visible and are never silently
corrected. `course_session` contains only
this M3 entitlement state until Scheduling (M4) owns its calendar fields and transitions.
Student detail, purchase notes, and private notes are coach-only API projections; a future public
capability projection must opt into each safe field rather than reusing this response.

For the later Demo import, `npm run migration:preview:m3 --workspace @gym-assistant/api -- <demo-export.json>`
creates a deterministic Student/Lesson Purchase preview. It validates the source shape, assigns
stable target UUIDs, reports orphan/duplicate rows, maps legacy `Purchase.amount` to the integer
TWD manual-receipt amount, and produces a checksum. The preview never writes to the database or
changes `form-coach-mvp-v1`.

`apps/web` is the first production-facing client for this seam. It holds the Supabase browser
session, sends the short-lived access token to `/api`, and never calls the private application
tables through the Supabase Data API. During local development Vite proxies `/api` to the Fastify
process; production keeps the same same-origin path behind a reverse proxy.

Later slices deepen the same modules with lesson entitlement, scheduling, training records, and
public capabilities. They do not expose direct table mutation to the client.

## Authentication

Production authentication uses Supabase Auth and its asymmetric JWKS endpoint. The backend
validates signature, issuer, audience, expiry, and subject before resolving a Workspace. The
verified subject is the owning `auth.users.id`; user-editable metadata is never authorization data.

Tests have an explicit development identity verifier, but the running API always verifies a real
Supabase access token.

V1 uses public Coach self-service registration: a Coach creates a unique Email/password account and
must verify the Email with a six-digit OTP. Google OAuth is an equal sign-in method. Supabase links
verified Email identities with the same address to one `auth.users` subject, so an existing
Email/password Coach can sign in with Google using that Email. A Google-only Coach sets a password
only after signing in. The approved public registration check explicitly reports an existing Email;
this accepted exception exposes account existence. Administrative
provisioning is limited to development and test accounts. Recovery, global sign-out, deletion, and
the account-data lifecycle remain explicit M2 operations; none of these flows grants a browser
authority over a Workspace. A deletion request is reversible for 14 days, but immediate, scheduled,
and inactivity deletion permanently remove the Auth user and all Workspace-owned data through the
server-only boundary. Successful authenticated product operations update the server-side activity
timestamp; token refreshes, heartbeats, and deletion-status reads do not.

## Supabase database access

Backend-owned tables live in `app_private`, which is not included in the Data API exposed-schema
list. The migration revokes access from `anon`, `authenticated`, and `service_role`; the browser
therefore cannot bypass the Fastify interface with direct table calls.

Runtime database credentials must use a dedicated login that inherits the migration-created
`gym_assistant_api` role. Persistent IPv4 deployments use Supavisor session mode; migrations use a
direct connection where IPv6 is available or the supported migration connection selected by the
Supabase CLI.

## Deployment assumptions

- Web and API are served under one site; the reverse proxy maps `/api` to the API process.
- The API is stateless and uses a PostgreSQL connection pool.
- Database migrations run as a separate release step.
- Local, staging, and production use separate databases and Auth configurations.
