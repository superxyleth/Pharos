# Phase 2 Artifact Reuse

This project is a Phase 1 research-only Skill. It does not execute trades or write to chain.

The exported artifact is designed to become a reusable input for later Pharos Agents. A future Phase 2 Agent can consume the artifact as a research and risk-validation layer before deciding whether a separate execution Skill should be used.

## Artifact Contract

Artifacts follow:

```text
pharos.quant.skill.artifact.v1
```

Machine-readable schema:

```text
assets/artifact.schema.json
```

Important fields:

- `artifactId`: stable artifact identifier.
- `codeHash`: SHA-256 hash of the strategy code.
- `target`: chain and symbol metadata.
- `validation`: sandbox contract and safety validation result.
- `backtestSummary`: full-period adaptive-timeframe research diagnostics.
- `safety`: fixed Phase 1 safety flags.
- `usage`: expected `exports.evaluate(ctx)` interface.

## Safe Consumption Flow

1. Read the artifact.
2. Validate it against `assets/artifact.schema.json`.
3. Confirm `schemaVersion = pharos.quant.skill.artifact.v1`.
4. Confirm `safety.researchOnly = true`.
5. Confirm `safety.liveTrading.enabled = false`.
6. Confirm `safety.broadcastTransactions = false`.
7. Confirm `safety.onChainWrites = false`.
8. Confirm `safety.privateKeyExposure = false`.
9. Verify `codeHash` if the full code body is available.
10. Review validation errors and warnings.
11. Review backtest coverage, data quality, risk score, stability score, and trade activity diagnostics.
12. Treat the artifact as research input only unless a separate execution Skill performs its own guards and confirmations.

## Phase 2 Execution Boundary

Execution should remain outside this Phase 1 Skill.

If a future Agent combines this artifact with wallet, DEX, oracle, or execution Skills, the execution module should be separate and disabled by default. It should require:

- explicit user intent
- Atlantic Testnet chain ID verification
- allowlisted routers and tokens
- max notional limits
- slippage limits
- dry-run transaction plan
- explicit confirmation
- transaction hash output only

This separation keeps the current Skill reusable and safe while allowing future Agents to compose it into richer Pharos workflows.

## Example

See:

```text
examples/consume-artifact-example.json
examples/phase2-agent-consume-artifact-flow.md
```

These examples show how an Agent can record the artifact identity, verify safety flags, validate the schema, review risk diagnostics, and decide whether it is eligible for a separate dry-run execution planner.
