# Agent Workflows

## Minimal Evaluation Flow

1. Call `tools/list`.
2. Confirm the tool list contains `quant_loop_run`.
3. Call `pharos_network_status`.
4. Call `quant_loop_run` with a PHRS strategy idea.
5. Confirm the result contains generated code, validation, backtest summary, advice, simulation, artifact, and `liveTrading.enabled = false`.

## Modular Evaluation Flow

1. `strategy_generate`
2. `strategy_validate`
3. `strategy_backtest_matrix`
4. `strategy_advise`
5. `strategy_simulate`
6. `strategy_export_artifact`

The matrix result can be passed directly into `strategy_advise.results` and `strategy_export_artifact.backtests`.

## Recommended Demo Prompt

```text
Use the Pharos Quant Strategy Lifecycle MCP Skill. First list tools, then call pharos_network_status. Next run quant_loop_run for a PHRS grid/DCA research strategy with multi-period backtesting and artifact export. This is Phase 1 research only: do not execute live trades, do not broadcast transactions, and do not perform on-chain writes.
```

## Output Review Checklist

- MCP connection succeeds.
- Tool discovery succeeds.
- Network status returns chain ID `688689`.
- Strategy generation succeeds.
- Validation succeeds.
- Backtest matrix includes all 7 periods.
- Advice includes risk-aware improvements.
- Simulation returns decisions without execution.
- Artifact export returns `artifactId` and `codeHash`.
- Safety boundary says no live trading and no transaction broadcast.

