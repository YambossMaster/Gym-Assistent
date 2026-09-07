# Use Supabase for managed PostgreSQL and authentication

Supabase will provide Gym Assistant's managed PostgreSQL and coach authentication, while the
Fastify modular backend remains the only interface for official product data. Backend-owned tables
stay in an unexposed private schema so adopting Supabase does not turn the browser into a direct
database client or move business rules into Data API policies.
