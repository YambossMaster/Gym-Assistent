# Mobile PWA notes and Help correction — local review

> Owner: isolated managed worktree `pwa-notes-help-fixes`; based on `origin/main` and integrated through a scoped PWA correction branch on 2026-10-18.
> Integration: Product Owner reviewed the local mobile preview and authorized deployment on 2026-10-18. Exact-SHA CI, Production deployment, and installed-iPhone acceptance must be recorded separately.
> Scope: Product Owner's three 2026-10-18 installed-iPhone PWA reports. This corrects the released Web presentation and editor without reopening M8-D or M8-E payment work.

## Impact and bounded inventory

| Item                          | State                         | Evidence and boundary                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `改回未完成` icon alignment   | Locally changed               | Training footer action has centered inline flex layout, 6px gap and 16px fixed icon; visual inspection on the installed PWA is pending.                                                                                                                                                                                                        |
| iOS PWA Help images           | Locally changed               | The reported first tile rendered while later tiles were blank; all six iOS tiles had used one sprite background. Each step now has its own image element and asset, preserving the source art. Four Android tiles use the same robust path. Ten PNGs decode with the expected dimensions. Intermittent iOS behavior still needs device review. |
| Coach Note Return             | Fixed in focused reproduction | The native `insertParagraph` event produced no saved newline on original Main (`undefined` instead of `第一行\n`). The same test passes on the candidate. Native `beforeinput` handles Return before browser DOM mutation; keyboard and composition behavior remain covered by existing editor paths.                                          |
| Coach Note adjacent functions | Focused checks passed         | Note editor, Training save/gesture, note format, drafts and Help suites: 65/65 passed before the added middle-line, repeated Return, readback and 5000-character boundary cases; affected follow-up suites: 50/50 passed. These include formatting, list editing, cross-paragraph selection, scrolling, focus exit and API save payload.       |
| Release gate                  | Unverified                    | Per `AGENTS.md` and `VERIFICATION_WORKFLOW.md`, Product Owner inspection precedes full browser/live, installed-device and exact-SHA CI gates. Product Owner authorized full verification and deployment after preview; exact-SHA remote and physical-device results remain pending.                                                            |

## Cause and limits

Additional final focused checks passed: conflict recovery, recording, query and Help suites 14/14; Web typecheck, changed-file Prettier and `git diff --check`. The ten new image files decoded at their expected dimensions, and the previously blank second iOS step was visually inspected as a populated standalone image.
The editor's additional multiline-paste case also passed (11/11 editor cases), including preservation of text after the caret.

The iPhone recording shows Return leaving the caret and later text on the same line. The editor had relied on React's `onBeforeInput` to classify Return; a focused native `InputEvent` did not reach that handler on the original code. The exact iOS event sequence has not been instrumented on the physical phone, so physical acceptance remains open. A native listener on the contenteditable is the narrow correction.

The Help screenshot shows the first iOS sprite tile and blank following tiles. Because all tiles used one image URL, the screenshot supports a per-tile background rendering problem more strongly than a missing network response, but it does not prove WebKit's precise rasterization cause. Individual `<img>` elements remove the background cropping dependency.

The original shared checkout had substantial unrelated M8-E/payment changes and was not used for the product-code correction. The ten new image files are intentional source assets; `node_modules`, build output and TypeScript state are Git-ignored.

## Local mobile preview launcher repair (2026-10-18)

The Product Owner's double-click entry at `D:\Programs, Codes, Projects\Projects\Gym Assistent\start-gym-assistant-mobile.cmd` failed with `No workspaces found`. A direct `npm run dev:api` in that checkout reproduced it. Its root `package.json` still declares `apps/*`, but both `apps/api` and `apps/web` were empty at inspection and Git reported 351 deleted tracked files. Their prior uncommitted contents must not be overwritten with `git restore`. The separate M8-E workstream is active in another worktree; its state is not part of this correction.

For this local review only, the root mobile wrapper now delegates to this isolated PWA worktree with Web port 5174. This worktree's launcher and readiness helper accept that port; 5173 remains occupied by an unrelated Vite process. Existing Development `.env` and `.env.local` files were copied from the local M8-E worktree into this worktree as ignored files after verifying `NODE_ENV=development` and that the configured URLs were not the known Production project. No secret values were printed. `npm run dev:api` started here, `/ready` returned HTTP 200, and Vite started on 5174. The exact root `cmd /d /c start-gym-assistant-mobile.cmd` command exited 0 and reported `Reusing ... http://127.0.0.1:5174/mobile-preview.html`. That page, its second iOS tutorial image, and its `/api/ready` proxy returned HTTP 200; the served editor source included `beforeinput`. This verifies launcher and asset routing, not authenticated Coach Note behavior or physical iOS PWA rendering.

The root wrapper is machine-local review routing. Remove it when the original checkout is recovered or after this PWA work is integrated. The 351 missing files in the original checkout are a separate recovery risk that this preview workaround does not resolve.

## One Next within this workstream

The Product Owner inspected the three corrected surfaces at `http://127.0.0.1:5174/mobile-preview.html` and approved deployment. Run browser verification and the exact-SHA CI/release checks; then hand off installed-iPhone PWA acceptance. Track recovery of the original checkout separately without overwriting its former local changes.
