# Formal Web application

This workspace is the first production-facing Web/PWA shell. It is separate from the archived
`demo/` and currently proves one narrow flow:

1. sign in through Supabase Auth;
2. send the Supabase access token to the Gym Assistant API;
3. list and create Students inside the server-resolved Workspace.

The browser uses only the project URL and publishable key. It never receives database credentials,
a Supabase secret key, a `service_role` key, or a Workspace ID selected by the client.

## Local setup

Copy `.env.example` to `.env.local` and set the public Supabase values from the project Connect
dialog. This repository already ignores `.env.local`.

Start the API and Web workspaces in separate terminals:

```bash
npm run dev:api
npm run dev:web
```

Vite proxies `/api/*` to `http://127.0.0.1:3000/*`, matching the intended production reverse-proxy
shape. The production host should preserve the same path contract.

## Current account policy

Self-service registration is intentionally not part of this slice. Only pre-provisioned coach
accounts can sign in. Account creation, invitations, recovery, billing, and organization membership
need explicit product rules before they are exposed.
