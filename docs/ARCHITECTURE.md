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

V1 is one deployable API process. Modules expose complete operations rather than table CRUD. A
background worker may later run from the same codebase when notifications or retries exist; it is
not part of the initial runtime.

```text
HTTP adapter -> application modules -> repository interface -> PostgreSQL adapter
      |                 ^                       |
      v                 |                       v
identity verifier ------+                 in-memory test adapter
```

The initial seam is deliberately small:

- verify an external identity;
- resolve or bootstrap its one Workspace;
- list the Workspace's Students;
- create a Student inside that Workspace.

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

The initial account policy is provisioned coaches only. Self-service registration, invitations,
recovery, and organization membership are not implied by adding Auth and remain separate product
decisions.

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
