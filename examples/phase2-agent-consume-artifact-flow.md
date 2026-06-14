# Phase 2 Agent Artifact Consumption Flow

This example shows how a future Pharos Agent could consume an artifact produced by this Phase 1 Skill.

The artifact is research input only. It is not a trading authorization and must not cause swaps, approvals, transfers, deployments, or transaction broadcasts by itself.

## Inputs

- Strategy artifact from `strategy_export_artifact` or `quant_loop_run`.
- Machine-readable schema: `assets/artifact.schema.json`.
- Optional read-only wallet state from a separate wallet Skill.
- Optional read-only market/oracle state from separate oracle or data Skills.

## Flow

1. Load the artifact JSON.
2. Validate the artifact against `assets/artifact.schema.json`.
3. Confirm `schemaVersion = pharos.quant.skill.artifact.v1`.
4. Confirm `target.chain = pharos-atlantic-testnet`.
5. Confirm `target.symbol = PHRS`.
6. Confirm `safety.researchOnly = true`.
7. Confirm `safety.liveTrading.enabled = false`.
8. Confirm `safety.broadcastTransactions = false`.
9. Confirm `safety.onChainWrites = false`.
10. Confirm `safety.privateKeyExposure = false`.
11. Review `validation.errors` and stop if any critical error exists.
12. Review `backtestSummary` for coverage, drawdown, risk score, stability score, data quality, and trade activity.
13. Verify `codeHash` if the full strategy code is available.
14. Query wallet, oracle, DEX, or execution context through separate Skills only.
15. Produce a dry-run execution plan with max notional, slippage limits, router/token allowlists, and chain ID checks.
16. Require explicit user confirmation before any Phase 2 write-capable Skill can broadcast a transaction.

## Pseudocode

```js
function consumePharosStrategyArtifact(artifact, context) {
  validateJsonSchema(artifact, 'assets/artifact.schema.json');

  if (artifact.schemaVersion !== 'pharos.quant.skill.artifact.v1') {
    return { action: 'REJECT', reason: 'Unsupported artifact schema version.' };
  }

  if (artifact.target.chain !== 'pharos-atlantic-testnet') {
    return { action: 'REJECT', reason: 'Artifact target chain is not Pharos Atlantic Testnet.' };
  }

  const safety = artifact.safety;
  if (
    safety.researchOnly !== true ||
    safety.liveTrading?.enabled !== false ||
    safety.broadcastTransactions !== false ||
    safety.onChainWrites !== false ||
    safety.privateKeyExposure !== false
  ) {
    return { action: 'REJECT', reason: 'Artifact safety boundary is not Phase 1 research-only.' };
  }

  const highRisk = artifact.backtestSummary?.some((period) => {
    return period.maxDrawdownPct < -20 || period.riskScore < 40;
  });

  if (highRisk) {
    return {
      action: 'RESEARCH_ONLY',
      reason: 'Risk diagnostics require human review before any execution planning.',
    };
  }

  return {
    action: 'DRY_RUN_PLAN_ONLY',
    reason: 'Artifact is eligible for a separate Phase 2 dry-run planner, not direct execution.',
    requiredGuards: [
      'chainId=688689',
      'routerAllowlist',
      'tokenAllowlist',
      'maxNotionalLimit',
      'slippageLimit',
      'explicitUserConfirmation',
    ],
  };
}
```

## Expected Agent Output

A future Agent should return a plan like:

```json
{
  "decision": "DRY_RUN_PLAN_ONLY",
  "broadcastTransactions": false,
  "onChainWrites": false,
  "requiresUserConfirmation": true,
  "reason": "The artifact passed research safety checks and can be used only as input to a separate guarded execution planner."
}
```
