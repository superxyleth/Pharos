# Future Phase 2 Execution

The current Skill does not execute trades.

For Phase 2 Agent Carnival, an execution extension could be added as a separate module, not as a replacement for the Phase 1 research loop.

## Candidate Future Tools

- `strategy_prepare_testnet_order`
- `strategy_estimate_testnet_trade`
- `strategy_execute_testnet_trade`

## Required Guards

Any future execution module should require:

- `ENABLE_TESTNET_EXECUTION=true`
- Pharos Atlantic Testnet only
- `chainId = 688689`
- local runtime private key only
- no private key input from Agent messages
- allowlisted tokens
- allowlisted router contracts
- max notional limit
- slippage limit
- dry-run transaction plan
- explicit user confirmation
- transaction hash output only

## Current Recommendation

Keep Phase 1 submission research-only.

Use this repository as the strategy lifecycle Skill that a future execution Agent can call before deciding whether an independently guarded execution module should be used.

