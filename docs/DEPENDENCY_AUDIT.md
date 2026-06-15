# Dependency Audit

## Current Result

Run audit against the official npm registry:

```bash
npm audit --registry=https://registry.npmjs.org/
```

Expected result after the current lockfile update:

```text
found 0 vulnerabilities
```

## What Changed

Earlier installs reported 2 moderate vulnerabilities from `ethers` through its nested `ws` dependency:

```text
ethers -> ws >=8.0.0 <8.20.1
GHSA-58qx-3vcg-4xpx
```

The project keeps `ethers` v6 and uses an npm override to pin the nested `ws` package to `8.20.1`, the patched version. This avoids downgrading `ethers` to v5, which would be a semver-major API change for this codebase.

## Registry Note

Some mirrors, including `https://registry.npmmirror.com`, may return an audit endpoint error because they do not implement npm's security advisory API. Use the official npm registry for the audit command above.

## Local Reproduction

Source validation and typechecking require dev dependencies:

```bash
npm install --include=dev
npm run validate:skill
npm run typecheck
npm test
npm run judge:smoke
```

Production-only installs can omit packages such as `@types/node`, so they are not sufficient for `npm run typecheck`.
