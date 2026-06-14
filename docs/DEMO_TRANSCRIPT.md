# Public Demo Transcript

Latest public endpoint smoke transcript for Pharos Phase 1 review.

Test time: 2026-06-14 20:18 CST.

## Endpoint

Health:

```text
http://150.158.28.155:3011/health
```

MCP:

```text
http://150.158.28.155:3011/mcp
```

## 1. Health Check

Result: passed.

Observed:

```json
{
  "status": "ok",
  "service": "pharos-quant-strategy-lifecycle-skill",
  "phase": "phase1-skill",
  "network": "pharos-atlantic-testnet",
  "mcpEndpoint": "/mcp"
}
```

Latency: about 53 ms.

## 2. Tool Discovery

MCP request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

Result: passed.

Discovered 10 tools:

- `pharos_network_status`
- `pharos_wallet_info`
- `strategy_generate`
- `strategy_validate`
- `strategy_backtest`
- `strategy_backtest_matrix`
- `strategy_advise`
- `strategy_simulate`
- `strategy_export_artifact`
- `quant_loop_run`

Latency: about 54 ms.

## 3. Pharos Network Status

Tool: `pharos_network_status`

Result: passed.

Observed:

```json
{
  "network": "atlantic-testnet",
  "chainId": 688689,
  "nativeToken": "PHRS",
  "blockNumber": 24176503
}
```

Latency: about 1089 ms.

## 4. Wallet Default Privacy

Tool: `pharos_wallet_info`

Result: passed.

Observed default behavior:

```json
{
  "walletConfigured": true,
  "readOnly": true,
  "privateKeyReturned": false,
  "addressReturned": false,
  "balanceReturned": false
}
```

The public endpoint does not return private keys. It also omits public address and balance by default.

Latency: about 24 ms.

## 5. Closed Loop Demo

Tool: `quant_loop_run`

Input:

```json
{
  "description": "Generate a PHRS grid and DCA research strategy with trend filter, volatility filter, risk-off exit, and max exposure control. Run full multi-period backtests, produce risk-aware advice, simulate decisions, and export a reusable artifact.",
  "symbol": "PHRS",
  "chain": "pharos-atlantic-testnet",
  "initialCapital": 1000,
  "useOpenAI": false
}
```

Result: passed.

Observed:

- generated strategy stage completed
- validation stage completed
- backtest matrix stage completed
- advice stage completed
- simulation stage completed
- artifact export stage completed
- `liveTrading.enabled = false`

Execution mode:

```json
{
  "generationMode": "deterministic",
  "generationUsedFallback": false,
  "adviceMode": "ai-backed",
  "adviceUsedFallback": false,
  "providerTimeoutMs": 90000,
  "qualityNote": "Deterministic generation completed; AI-backed advice completed without fallback."
}
```

First period summary:

```json
{
  "period": "1D",
  "timeframe": "5m",
  "coverage": "full-period",
  "candleCount": 288,
  "totalReturnPct": 0.1795,
  "totalTrades": 39,
  "noTradeReason": null,
  "tradeActivityScore": 33.8542,
  "entrySignalCount": 21,
  "blockedSignalCount": 0
}
```

Total latency: about 35 seconds.

## 6. Backtest Matrix And Lightweight Artifact

Tools:

- `strategy_backtest_matrix`
- `strategy_export_artifact`

Result: passed.

Backtest matrix:

```json
{
  "periods": ["1D", "1W", "1M", "6M", "1Y", "2Y", "3Y"],
  "fieldsPresent": true,
  "tradeDiagnosticsPresent": true
}
```

Lightweight artifact:

```json
{
  "detailMode": "summary",
  "artifactId": "pharos-64655ca4c3f1f1b5",
  "codeHash": "sha256:8e835777eb2f2d6fd690ef5ffbc47cb9708c4868c4c186844febbc4b31934819",
  "safety": {
    "researchOnly": true,
    "liveTrading": {
      "enabled": false
    },
    "broadcastTransactions": false,
    "onChainWrites": false,
    "privateKeyExposure": false
  }
}
```

The lightweight artifact returns a summary and hash instead of embedding the full strategy code body.

## Review Conclusion

The public endpoint is reachable, discoverable, and aligned with Pharos Phase 1 safety expectations. The Skill exposes a reusable strategy lifecycle and exports artifacts that later Agents can consume without enabling live trading or on-chain writes.
