# Gym Assistant API

This is the first formal backend slice. It authenticates a Coach, resolves that Coach's private
Workspace, and creates or lists Students without accepting a workspace identifier from the client.

## Run locally

Requirements: Node.js 22+ and a linked Supabase project.

```bash
copy .env.example .env
npm run db:push:dry
npm run db:push
npm run dev
```

The development script loads `.env` explicitly. Production supplies environment variables through
its hosting platform before running the compiled application. `DATABASE_URL` should use the
Supabase session pooler for a persistent IPv4 backend, or a direct connection when the host has
IPv6. Never use the transaction pooler for migration commands.

Tests use a local-only identity verifier. A running API always verifies a real Supabase Auth access
token using the project's issuer and JWKS:

```text
Authorization: Bearer <supabase-access-token>
```

Available endpoints:

```text
GET  /health
GET  /v1/students
POST /v1/students
```

The create payload preserves the demo Student fields that are currently part of the product:

```json
{
  "name": "王小明",
  "phone": "0912345678",
  "goal": "提升深蹲表現",
  "privateNote": "教練私人備註",
  "active": true,
  "lineLinked": false
}
```

`DATABASE_URL` must point to the environment's dedicated database using a least-privilege runtime
login that inherits the `gym_assistant_api` role created by the migration. Supabase CLI owns schema
migration history; review with `npm run db:push:dry` before applying `npm run db:push`.
