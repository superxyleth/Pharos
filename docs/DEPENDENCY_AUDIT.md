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

Earlier official-registry audits reported 7 high vulnerabilities that collapsed to vulnerable `ws` ranges pulled through `ethers`, `viem`, and the earlier x402 SDK experiment dependencies:

```text
ws >=8.0.0 <8.21.0
GHSA-96hv-2xvq-fx4p
```

The project keeps the current `ethers` v6 and `viem` v2 packages, removes the unused x402 SDK experiment dependencies, and uses npm overrides to pin vulnerable nested `ws` copies to `8.21.0`, the patched version. This avoids downgrading `ethers` to v5 or `viem` to an old major-incompatible release just to satisfy npm's automatic force-fix suggestion.

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
npm run audit:security
```

Production-only installs can omit packages such as `@types/node`, so they are not sufficient for `npm run typecheck`.
