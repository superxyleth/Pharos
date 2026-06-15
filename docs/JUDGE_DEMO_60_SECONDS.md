# Judge Demo In 60 Seconds

This is the short review path for the Pharos Quant Strategy Lifecycle Skill.

## Public Links

```text
Repository: https://github.com/superxyleth/Pharos
Health:     http://150.158.28.155:3011/health
MCP:        http://150.158.28.155:3011/mcp
x402:       http://150.158.28.155:3011/x402/status
```

## 1. Health

```bash
curl http://150.158.28.155:3011/health
```

Expected markers:

```json
{
  "status": "ok",
  "service": "pharos-quant-strategy-lifecycle-skill",
  "network": "pharos-atlantic-testnet",
  "mcpEndpoint": "/mcp"
}
```

## 2. Tool Discovery

```bash
curl -X POST http://150.158.28.155:3011/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}"
```

Expected markers:

```text
14 tools total:
10 core research tools
4 optional x402 scaffold tools
```

## 3. Pharos Network Status

```bash
curl -X POST http://150.158.28.155:3011/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"pharos_network_status\",\"arguments\":{}}}"
```

Expected markers:

```json
{
  "network": "atlantic-testnet",
  "chainId": 688689,
  "nativeToken": "PHRS"
}
```

## 4. One-Call Skill Loop

```bash
curl -X POST http://150.158.28.155:3011/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"quant_loop_run\",\"arguments\":{\"description\":\"Generate a WBTC trend and DCA research strategy using BTCUSDT three-year proxy candles, with volatility filter, risk-off exit, and max exposure control. Run full multi-period backtests, produce risk-aware advice, simulate decisions, and export a reusable artifact.\",\"symbol\":\"WBTC\",\"chain\":\"pharos-atlantic-testnet\",\"initialCapital\":1000,\"useOpenAI\":false}}}"
```

Expected markers in the tool result payload:

```json
{
  "safetySummary": {
    "phase1Safe": true,
    "broadcastTransactions": false,
    "onChainWrites": false
  },
  "dataSourceSummary": {
    "type": "Friend server Binance spot 1h OHLCV CSV snapshot",
    "marketEvidence": true
  },
  "artifact": {
    "artifactId": "...",
    "codeHash": "sha256:..."
  }
}
```

The backtest matrix should include:

```text
1D, 1W, 1M, 6M, 1Y, 2Y, 3Y
```

Set `symbol` to `WETH` to run the same path on the ETHUSDT three-year proxy dataset.

## 5. x402 Scaffold

```bash
curl http://150.158.28.155:3011/x402/status
```

Expected markers:

```json
{
  "protocol": "x402",
  "chainId": 688689,
  "defaultAsset": "PHRS",
  "settlementBroadcastEnabled": false,
  "onChainWritesEnabled": false
}
```

Requesting a paid route without payment should return `HTTP 402 Payment Required` and a `PAYMENT-REQUIRED` payload. The core `/mcp` path remains free and reviewable.

## Positioning

This project is not judged as a profitable trading strategy. It is a reusable Pharos Phase 1 Agent Skill that turns strategy ideas into validated, risk-scored, composable artifacts for future Phase 2 Agents.
