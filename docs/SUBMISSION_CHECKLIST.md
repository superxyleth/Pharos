# Submission Checklist

Use this checklist before submitting to DoraHacks.

## Required Submission Items

- [ ] Public GitHub / GitLab / Bitbucket repository link is ready.
- [ ] Repository README explains this is a Pharos Phase 1 Skill submission.
- [ ] Repository includes `SKILL.md`.
- [ ] Repository includes `references/`.
- [ ] Repository includes `assets/`.
- [ ] Repository includes public MCP endpoint and health endpoint.
- [ ] Repository includes demo or JSON-RPC examples.
- [ ] Repository includes test or validation evidence.

## Public Endpoints

- [ ] Health endpoint works: `http://150.158.28.155:3011/health`.
- [ ] MCP endpoint works: `http://150.158.28.155:3011/mcp`.
- [ ] `tools/list` exposes all 10 expected tools.
- [ ] `pharos_network_status` returns `atlantic-testnet`.
- [ ] `pharos_network_status` returns chain ID `688689`.

## Skill Standard

- [ ] `SKILL.md` has frontmatter with name, description, version, runtime, network, and chain ID.
- [ ] `SKILL.md` explains when to use the Skill.
- [ ] `SKILL.md` explains when not to use the Skill.
- [ ] `SKILL.md` has a capability index.
- [ ] `SKILL.md` has a progressive disclosure guide.
- [ ] `SKILL.md` has a standard execution loop.
- [ ] `SKILL.md` has a clear Phase 1 safety boundary.

## Pharos Network Alignment

- [ ] Atlantic Testnet RPC is documented: `https://atlantic.dplabs-internal.com`.
- [ ] Atlantic Testnet WSS is documented: `wss://atlantic.dplabs-internal.com`.
- [ ] Explorer is documented: `https://atlantic.pharosscan.xyz/`.
- [ ] Chain ID is documented: `688689`.
- [ ] Rate limit is documented: `500 times/5m`.
- [ ] Max pending transactions per address is documented: `64`.

## Safety Boundary

- [ ] No live trading.
- [ ] No transaction broadcasting.
- [ ] No swaps.
- [ ] No token approvals.
- [ ] No transfers.
- [ ] No contract deployments.
- [ ] No contract writes.
- [ ] No private key output.
- [ ] Public wallet info omits address and balance by default.

## Validation Commands

Run:

```bash
npm run validate:skill
npm test
```

Expected:

- [ ] `validate:skill` passes.
- [ ] TypeScript typecheck passes.
- [ ] Backtest smoke test passes.
- [ ] Pharos read-only smoke test passes.

## Sensitive Information Check

Before publishing:

- [ ] `.env` is not committed.
- [ ] `.env.*` files are not committed, except `.env.example`.
- [ ] `.ssh/` is not committed.
- [ ] `.tools/` is not committed.
- [ ] `.codex/` is not committed.
- [ ] `.gitconfig` is not committed.
- [ ] No private key appears in tracked files.
- [ ] No server password appears in tracked files.
- [ ] No production API key appears in tracked files.

## Final Materials

- [ ] `docs/DORAHACKS_SUBMISSION_SUMMARY.md` is current.
- [ ] `docs/AGENT_EVALUATION_REPORT_2026-06-14.md` is current.
- [ ] `docs/DEMO_FLOW.md` is current.
- [ ] `docs/DEMO_TRANSCRIPT.md` is current.
- [ ] `examples/demo-json-rpc-flow.md` is current.
