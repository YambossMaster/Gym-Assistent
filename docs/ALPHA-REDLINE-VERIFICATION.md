# Final Alpha red-line verification

> Approved by the Product Owner on 2026-10-10. This is the focused Alpha-to-Beta test
> procedure. M8-D release, backup/restore, reviewer and admission gates still apply.

## Run order

1. Reuse the completed Product Owner installed-PWA exploratory pass. Recheck only a changed
   device behavior or an inconclusive result. Do not drive the whole app through DOM or visual
   automation to repeat ordinary flows.
2. Prove isolation and authorization using two disposable development Auth users. Obtain each
   `access_token` through the normal password sign-in endpoint with the publishable key. Every
   authenticated application API request must carry that User JWT. Reject a service/secret key as
   an application API bearer. Use Auth administration only to create/remove exact synthetic
   fixtures; never count those privileged calls as isolation evidence.
3. Separately prove database controls with the actual API runtime database role. Assert that it is
   neither superuser nor `BYPASSRLS`. For tables with RLS, set the transaction-local Workspace
   context and verify cross-Workspace rows are absent. For early private tables without RLS,
   verify `anon`/`authenticated` lack schema/table access and test the API's Workspace predicates.
   A User JWT on the Fastify API does not turn the server's PostgreSQL connection into the
   Supabase `authenticated` database role.
4. Prove Beta rules at Module, HTTP and database seams: Free default, two code classes, exact
   60-day expiry, repeat and cross-code requests, verified-Email anti-reuse, durable throttling,
   simultaneous single-use redemption, downgrade without data deletion, and absence of a
   pre-payment plan-mutation route. Check final state and audit data, not only response codes.
5. After defects are corrected, rerun only affected cases. Record exact fixture IDs and confirm
   deletion or rollback. Do bounded Production smoke only after the separately authorized
   migration release; it must use synthetic accounts and the deployed exact SHA.

Extreme load and autonomous exploit campaigns, including Shannon, are deferred until after
real-Coach Beta stabilizes. A directed security check remains part of any changed Auth, isolation,
public-link or entitlement boundary before release.

## 2026-10-10 development evidence

| Boundary                        | Result                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Two freshly signed-in User JWTs | API list/detail/update/delete/session cross-Workspace attempts denied; owner row and private note unchanged.                                                                               |
| Runtime role                    | `gym_assistant_api` member; `rolsuper=false`, `rolbypassrls=false`. Calendar subscription RLS allowed only the selected Workspace; transaction rolled back.                                |
| Early Student table             | RLS is not enabled. `authenticated` has neither private-schema usage nor Student-table SELECT; API Workspace isolation passed. This is a distinct protection model, not Student RLS proof. |
| Beta live E2E                   | Free-first access, optional redemption, deletion/reuse, durable throttling, operator grant reversal, single-use race and Free-plan writes passed.                                          |
| Focused API tests               | Seven Beta/plan/calendar/export files: 37 tests passed. Three public-link/HTTP files: 26 tests passed.                                                                                     |
| Cleanup                         | Exact synthetic Auth users, Students and Workspaces removed and read back; Calendar rows were rollback-only.                                                                               |

`apps/api/src/e2e/run-alpha-isolation-live.ts` is the repeatable development isolation probe.
Its explicit project/role/loopback guards must remain in place. The older
`run-finance-live.ts` stopped at a Free venue-capacity response before its isolation assertion;
its exact fixtures were cleaned. It is not passing evidence for this run. The targeted fresh-user
probe above supplied the isolation evidence instead.

With the development API running, execute from `apps/api`:

```powershell
node --env-file=.env --env-file=.env.e2e --import tsx src/e2e/run-alpha-isolation-live.ts
node --env-file=.env --env-file=.env.e2e --import tsx src/e2e/run-beta-admission-live.ts
```

Production release #5 applied `20261010110051_remove_plan_tester_entitlement.sql` and deployed
the matching runtime. These development results do not claim a post-migration Production User-JWT
pass or authorize real-Coach admission. That bounded synthetic smoke remains open.
