# Development workflow

## IDE setup

Open the project root, not `src/` or `dist/`. The checked-in VS Code tasks expose development, verification, and production build commands; other IDEs can run the matching npm scripts from `package.json`.

`dist/`, `node_modules/`, and `*.tsbuildinfo` are generated artifacts. Edit only source and configuration files. A production build can always recreate `dist/`. The workspace uses the checked-in Prettier version and formats on save in VS Code; other IDEs should run `npm run format`.

## Small-change loop

1. Identify the owner using `docs/ARCHITECTURE.md`.
2. Reproduce the current behaviour and name the smallest expected difference.
3. Change the owning page or logic module; extract a component only when at least two consumers need it or the page boundary becomes unclear.
4. Add or update the focused test when logic changes.
5. Run `npm run check` (format check, type check, and unit tests).
6. Run `npm run build` for route, dependency, configuration, PWA, or release-facing changes.
7. Update docs only when their contracts changed; add a short `CHANGELOG.md` entry for user-visible behaviour or structural changes.

## Styling

The current visual system is centralized in `src/styles.css`, including responsive rules. Prefer a narrowly scoped class under the owning page's existing namespace. Preserve desktop and mobile behaviour. A future CSS split should be a dedicated mechanical change with before/after screenshots, not mixed into a feature request.

## Generated output

Do not hand-edit `dist/` or TypeScript build-info files. They are intentionally ignored by Git. When diagnosing a production-only issue, build first and inspect the generated output only as evidence.
