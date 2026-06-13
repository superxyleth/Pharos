# Pharos Quant Strategy Lifecycle Skill

Reusable Phase 1 MCP Skill for the Pharos Skill-to-Agent Dual Cascade Hackathon.

This project extracts the highest-value loop from the original ChainAlpha Quant project, excluding the cemetery purchase module and app-specific UI/payment code. The Skill turns natural-language strategy ideas into sandboxed executable JavaScript, validates the strategy, runs single and multi-period backtests, provides optimization advice, simulates decisions, exports a reusable strategy artifact, and checks Pharos Atlantic RPC/wallet readiness.

## Why This Skill

The original project's strongest capability is the quant strategy lifecycle:

1. Natural-language strategy generation
2. Sandboxed strategy execution
3. Backtest metrics
4. Multi-period validation
5. AI strategy advice
6. Mock simulation
7. Artifact export for later Agent composition

Phase 1 focuses on a standardized reusable Skill. Phase 2 can compose this Skill with execution, data, marketplace, or payment Skills to build a full autonomous Pharos Agent.

## MCP Tools

- `pharos_network_status` - check Pharos Atlantic RPC, chain ID `688689`, and block height.
- `pharos_wallet_info` - derive the local `.env` wallet address and PHRS balance without exposing `PRIVATE_KEY`.
- `strategy_generate` - generate sandbox-compatible JavaScript strategy code.
- `strategy_validate` - check `exports.evaluate(ctx)` and block unsafe APIs.
- `strategy_backtest` - run one backtest period.
- `strategy_backtest_matrix` - run `1D`, `1W`, `1M`, `6M`, `1Y`, `2Y`, `3Y`.
- `strategy_advise` - review code and backtest results.
- `strategy_simulate` - evaluate decisions without broadcasting transactions.
- `strategy_export_artifact` - package code, metrics, and risk notes for Phase 2.
- `quant_loop_run` - run the full Phase 1 closed loop.

No tool broadcasts transactions. Live trading is intentionally left for Phase 2 Agent composition with explicit user confirmation.

## Setup

```bash
copy .env.example .env
# Fill OPENAI_API_KEY, optional OPENAI_BASE_URL/OPENAI_MODEL, and optional PRIVATE_KEY.
npm install
npm run typecheck
```

The default Pharos network is Atlantic testnet:

- RPC: `https://atlantic.dplabs-internal.com`
- Chain ID: `688689`
- Native token: `PHRS`
- Explorer: `https://atlantic.pharosscan.xyz/`

## Run

```bash
npm run mcp
```

Then call:

```bash
node scripts/mcp-call.mjs examples/pharos-network-status.json
node scripts/mcp-call.mjs examples/quant-loop-run.json
```

## Smoke Tests

```bash
npm run test:backtest
npm run test:pharos
npm run test:openai
```

`test:openai` requires a working OpenAI-compatible endpoint. `test:pharos` works with the default RPC and includes wallet info only when `PRIVATE_KEY` is configured.

## Strategy Contract

Strategies must define:

```js
exports.evaluate = function(ctx) {
  return { action: 'HOLD', reason: 'example' };
};
```

`ctx` contains:

- `candle`
- `candles`
- `index`
- `state`
- `position`
- `initialCapital`
- `equity`

Expected return:

```js
{
  action: 'BUY' | 'SELL' | 'HOLD',
  amountUsd: 10,
  fraction: 1,
  reason: 'plain explanation',
  statePatch: {}
}
```

Blocked APIs include `require`, `import`, `process`, `fs`, `child_process`, `eval`, `Function`, and network access.

## Migration Scope

Included from the previous project conceptually:

- strategy generation
- sandbox validation
- backtest engine
- metrics
- strategy advice
- paper/mock simulation idea
- MCP tool schema style

Excluded:

- cemetery purchase module
- Next.js frontend
- OKX x402 gateway
- OnchainOS wallet login
- production strategy marketplace database
- live swap execution
- `.data`, `.next`, `node_modules`, and backup files

## Phase 2 Path

This Skill can later be composed into a full Pharos Agent that:

1. Receives a user objective
2. Generates and validates a strategy
3. Runs multi-period backtests
4. Simulates the strategy
5. Checks wallet and network readiness
6. Requests explicit confirmation
7. Calls a separate execution Skill for on-chain actions
