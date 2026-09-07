# Keep official data server-authoritative while preserving local responsiveness

Gym Assistant needs cross-device coach access and student capability links, so browser storage
cannot remain the system of record. We will keep drafts and caches on the client while all official
records and state transitions go through one modular backend into PostgreSQL; this avoids both a
fragile device-only product and a full offline replication system.
