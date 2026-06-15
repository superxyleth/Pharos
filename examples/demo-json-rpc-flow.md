# Demo JSON-RPC Flow

This file contains copy-ready JSON-RPC requests for a public MCP demo.

Endpoint:

```text
http://150.158.28.155:3011/mcp
```

Headers:

```http
Content-Type: application/json
Accept: application/json, text/event-stream
```

## 1. Tool Discovery

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

## 2. Pharos Network Status

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "pharos_network_status",
    "arguments": {}
  }
}
```

Expected checks:

- `chainId` is `688689`
- native token is `PHRS`
- RPC status is available

## 3. One-Call Closed Loop

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "quant_loop_run",
    "arguments": {
      "description": "Generate a WBTC trend and DCA research strategy using BTCUSDT three-year proxy candles, run multi-period backtests, produce risk advice, simulate decisions, and export an artifact.",
      "symbol": "WBTC",
      "chain": "pharos-atlantic-testnet",
      "initialCapital": 1000,
      "useOpenAI": false
    }
  }
}
```

Expected checks:

- result includes generated strategy code
- validation succeeds
- 7 backtest periods are returned
- advice is returned
- simulation is returned
- artifact is returned
- `liveTrading.enabled` is `false`

Use `useOpenAI=false` for a reliable smoke demo. Use `useOpenAI=true` for deeper strategy-quality review when longer AI-backed generation and advice latency is acceptable.

## 4. Lightweight Artifact Export

Use the generated strategy code and the matrix result from previous calls.

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "strategy_export_artifact",
    "arguments": {
      "name": "wbtc-research-artifact",
      "description": "Reusable Phase 1 WBTC research strategy artifact using BTCUSDT proxy candles.",
      "code": "exports.evaluate = function(ctx) { return { action: 'HOLD', reason: 'demo placeholder' }; };",
      "symbol": "WBTC",
      "chain": "pharos-atlantic-testnet",
      "includeCode": false
    }
  }
}
```

Expected checks:

- response payload contains `result.artifact.artifactId`
- response payload contains `result.artifact.codeHash`
- response does not embed the full strategy code body
- response keeps the Phase 1 safety notice

## Safety Reminder

This demo is read-only and research-only. It must not send transactions, broadcast transactions, approve tokens, swap tokens, deploy contracts, or modify on-chain state.
