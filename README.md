# Pharos Quant Strategy Lifecycle Skill

Pharos Quant Strategy Lifecycle Skill is a Phase 1 MCP Skill that lets AI Agents generate, validate, backtest, simulate, and export reusable PHRS strategy artifacts on Pharos Atlantic Testnet, with no live trading or transaction broadcasting.

## Judge Quick Test

Public repository:

```text
https://github.com/superxyleth/Pharos
```

Health endpoint:

```text
http://150.158.28.155:3011/health
```

MCP endpoint:

```text
http://150.158.28.155:3011/mcp
```

Required MCP Streamable HTTP headers:

```http
Content-Type: application/json
Accept: application/json, text/event-stream
```

Quick health check:

```bash
curl http://150.158.28.155:3011/health
```

Tool discovery request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

Network status request:

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

One-call deterministic review path:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "quant_loop_run",
    "arguments": {
      "description": "Generate a PHRS grid and DCA research strategy with trend filter, volatility filter, risk-off exit, and max exposure control. Run full multi-period backtests, produce risk-aware advice, simulate decisions, and export a reusable artifact.",
      "symbol": "PHRS",
      "chain": "pharos-atlantic-testnet",
      "initialCapital": 1000,
      "useOpenAI": false
    }
  }
}
```

Expected checks:

- `tools/list` exposes 10 tools.
- `pharos_network_status.chainId = 688689`.
- `quant_loop_run` returns 7 backtest periods.
- `executionModeSummary.providerTimeoutMs = 90000`.
- `artifact.artifactId` and `artifact.codeHash` are present.
- `liveTrading.enabled = false`.
- `broadcastTransactions = false`.
- `onChainWrites = false`.

## Local Reproduction

Recommended runtime:

```text
Node.js 20+
```

Install and validate the Skill package:

```bash
npm install
npm run validate:skill
npm test
```

Run the official-review-style public smoke test:

```bash
npm run judge:smoke
```

Local MCP runtime:

```bash
npm run mcp
```

Then, in another terminal:

```bash
npm run test:mcp
```

Reproducibility notes:

- Public review does not require a local `.env`; reviewers can use the public MCP endpoint above.
- `OPENAI_API_KEY` is optional. The recommended judging path uses `useOpenAI=false` for deterministic reproducibility.
- `PRIVATE_KEY` is not required for public evaluation. Wallet output is read-only and does not return private keys.
- `npm run test:openai` is optional and only checks the AI provider path.

## Artifact Reuse For Future Agents

The exported strategy artifact is a research and risk-validation input, not a trading authorization.

Future Phase 2 Agents should:

1. Load the artifact from `strategy_export_artifact` or `quant_loop_run`.
2. Validate it against `assets/artifact.schema.json`.
3. Confirm `safety.researchOnly = true`.
4. Confirm `safety.liveTrading.enabled = false`.
5. Confirm `safety.broadcastTransactions = false`.
6. Confirm `safety.onChainWrites = false`.
7. Review risk, drawdown, data quality, and trade activity diagnostics.
8. Use any wallet, oracle, DEX, or execution Skill as a separate disabled-by-default module with its own dry-run, limits, and explicit confirmation.

See `docs/PHASE2_ARTIFACT_REUSE.md`, `examples/consume-artifact-example.json`, and `examples/phase2-agent-consume-artifact-flow.md`.

面向 Pharos Skill-to-Agent Dual Cascade Hackathon Phase 1 的 Pharos-compatible Skill package + MCP service runtime。

本项目提供一个标准化、可复用的 Skill 模块，帮助 Agent 将自然语言交易想法转成可执行策略代码，并完成沙箱校验、多周期回测、AI 优化建议、模拟执行、策略产物导出，以及 Pharos Atlantic 测试网 RPC/钱包只读检查。

项目同时提供两层 Agent 接入方式：

- Skill package：`SKILL.md`、`references/`、`assets/`，方便 Agent 按官方 Skill Engine 风格读取说明、能力索引、输入输出契约和安全边界。
- MCP runtime：HTTP MCP endpoint，方便 Agent 通过 `tools/list` 和 `tools/call` 发现并执行工具。

本项目不广播链上交易，不执行真实买卖，不触碰用户资产。当前提交目标是提供一个可复用、可验证、可组合的 Phase 1 Skill 模块。

## Hackathon Submission

- 黑客松阶段：Pharos Skill-to-Agent Dual Cascade Hackathon Phase 1
- 提交类型：Pharos-compatible Skill package + MCP Skill runtime
- 目标网络：Pharos Atlantic Testnet
- 链 ID：`688689`
- 核心能力：策略生成、策略校验、多周期回测、模拟执行、策略产物导出、Pharos RPC/钱包只读检查
- 安全边界：Phase 1 不包含 live trading，不广播交易，不执行链上写入
- 官方技术文档：https://docs.pharosnetwork.xyz/

推荐英文定位：

```text
A Pharos-compatible MCP Skill that exposes a reusable quant strategy lifecycle to AI Agents.
```

## Phase 1 Safety Boundary

- Research only
- Backtest only
- Sandbox simulation only
- Artifact export only
- No live trading
- No transaction broadcast
- No private key exposure
- No on-chain state changes

## 项目定位

Phase 1 的目标是沉淀可复用 Skill。本项目聚焦一个完整但边界清晰的量化策略闭环：

1. 用户输入自然语言策略需求
2. 生成符合沙箱规范的 JavaScript 策略代码
3. 校验策略代码安全性
4. 执行单周期或多周期回测
5. 根据回测结果给出策略优化建议
6. 进行模拟执行，不发送链上交易
7. 导出标准化策略产物
8. 检查 Pharos Atlantic RPC、链 ID、区块高度和本地钱包余额

## Skill Package 结构

本项目新增了官方 Skill Engine 风格的文件包结构：

```text
SKILL.md
references/
  overview.md
  mcp-tools.md
  agent-workflows.md
  input-output-contracts.md
  pharos-network.md
  safety-and-phase1-boundary.md
  evaluation-guide.md
  future-phase2-execution.md
assets/
  networks.json
  tokens.json
  mcp-endpoints.json
  artifact.schema.json
```

Agent 推荐阅读顺序：

1. `SKILL.md`
2. `references/overview.md`
3. `references/safety-and-phase1-boundary.md`
4. `references/mcp-tools.md`
5. `references/agent-workflows.md`
6. `references/input-output-contracts.md`
7. 连接 MCP endpoint 并调用 `tools/list`

官方评测员风格测试提示词：

```text
examples/evaluator-prompt.md
```

Demo 与架构文档：

- `docs/DEMO_FLOW.md`
- `docs/ARCHITECTURE.md`
- `docs/DORAHACKS_SUBMISSION_SUMMARY.md`
- `docs/SUBMISSION_CHECKLIST.md`
- `docs/DEMO_TRANSCRIPT.md`
- `docs/AGENT_EVALUATION_REPORT_2026-06-14.md`
- `docs/PHASE2_ARTIFACT_REUSE.md`
- `examples/demo-json-rpc-flow.md`
- `examples/consume-artifact-example.json`

## MCP 工具

- `pharos_network_status`：检查 Pharos Atlantic RPC、链 ID `688689`、当前区块高度。
- `pharos_wallet_info`：从本地 `.env` 的 `PRIVATE_KEY` 派生钱包地址，并查询 PHRS 余额；不会返回私钥。
- `strategy_generate`：根据自然语言策略需求生成沙箱可执行策略代码。
- `strategy_validate`：校验策略代码是否符合 `exports.evaluate(ctx)` 规范，并拦截危险 API。
- `strategy_backtest`：执行单周期回测，返回收益率、胜率、最大回撤、Sharpe、交易次数等指标。
- `strategy_backtest_matrix`：执行 `1D`、`1W`、`1M`、`6M`、`1Y`、`2Y`、`3Y` 多周期回测。
- `strategy_advise`：根据策略代码和回测结果给出风险提示与优化建议。
- `strategy_simulate`：基于样例行情或外部传入行情进行模拟决策，不广播交易。
- `strategy_export_artifact`：导出策略代码、参数、回测摘要、风险说明和使用规范。
- `quant_loop_run`：一键执行 Phase 1 闭环：生成、校验、回测、建议、模拟、导出。

## 环境变量

复制示例配置：

```bash
copy .env.example .env
```

需要配置：

```env
OPENAI_API_KEY=replace_with_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=90000

PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
PHAROS_CHAIN_ID=688689

PRIVATE_KEY=0xreplace_with_private_key
PORT=3001
```

说明：

- `OPENAI_BASE_URL` 支持 OpenAI 兼容中转服务。
- `OPENAI_TIMEOUT_MS` 用于避免模型调用无限阻塞；默认建议为 `90000`。AI 生成和建议以策略质量、风险审查为优先，耗时较长是可接受的，超时后工具会走可控 fallback。
- `PRIVATE_KEY` 只用于本地派生地址和查询余额，不会被工具返回。
- 未配置 `PRIVATE_KEY` 时，策略生成、回测、模拟等功能仍可使用，钱包检查会提示未配置。

## 安装与启动

```bash
npm install
npm run typecheck
npm run mcp
```

默认服务地址：

```text
http://localhost:3001
```

MCP 端点：

```text
http://localhost:3001/mcp
```

公网 MCP 端点：

```text
http://150.158.28.155:3011/mcp
```

健康检查：

```text
http://localhost:3001/health
```

公网健康检查：

```text
http://150.158.28.155:3011/health
```

## 示例调用

启动 MCP 服务后，在另一个终端执行：

MCP Streamable HTTP clients should include these headers:

```http
Content-Type: application/json
Accept: application/json, text/event-stream
```

Missing the `Accept` header may return `406 Not Acceptable`.

```bash
node scripts/mcp-call.mjs examples/pharos-network-status.json
node scripts/mcp-call.mjs examples/pharos-wallet-info.json
node scripts/mcp-call.mjs examples/strategy-generate.json
node scripts/mcp-call.mjs examples/strategy-backtest.json
node scripts/mcp-call.mjs examples/strategy-backtest-matrix.json
node scripts/mcp-call.mjs examples/quant-loop-run.json
```

官方评测员风格 Prompt：

```bash
type examples\evaluator-prompt.md
```

完整 JSON-RPC demo 请求：

```bash
type examples\demo-json-rpc-flow.md
```

## 测试

```bash
npm run test:backtest
npm run test:pharos
npm run test:openai
npm run test:mcp
```

也可以运行聚合测试：

```bash
npm test
```

Skill package self-check:

```bash
npm run validate:skill
```

Use offline mode when you only want to validate local package files without checking the public endpoint:

```bash
npm run validate:skill -- --offline
```

测试说明：

- `test:backtest` 会运行多周期回测 smoke test。
- `test:pharos` 会检查 Pharos Atlantic RPC，并在配置 `PRIVATE_KEY` 时查询钱包余额。
- `test:openai` 会验证 OpenAI 兼容接口是否可用。
- `test:mcp` 需要先启动 `npm run mcp`，用于验证 MCP `tools/list`。
- `validate:skill` 会检查 `SKILL.md`、`references/`、`assets/`、Phase 1 安全开关、官方 Atlantic Testnet 参数和公网 MCP 只读可用性。

## 策略代码规范

策略必须定义：

```js
exports.evaluate = function(ctx) {
  return { action: 'HOLD', reason: 'example' };
};
```

`ctx` 包含：

- `candle`：当前 K 线
- `candles`：截至当前的历史 K 线
- `indicators`：预计算指标，包括 `ema20`、`ema50`、`rsi14`、`atr14`、`previousClose`
- `index`：当前 K 线索引
- `state`：策略状态
- `position`：模拟持仓状态
- `initialCapital`：初始资金
- `equity`：当前权益

策略返回值示例：

```js
{
  action: 'BUY',
  amountUsd: 10,
  fraction: 1,
  reason: 'scheduled buy',
  statePatch: { lastBuyIndex: ctx.index }
}
```

支持动作：

- `BUY`
- `SELL`
- `HOLD`

禁止在策略代码中使用：

- `require`
- `import`
- `process`
- `fs`
- `child_process`
- `eval`
- `Function`
- 网络请求

## 回测数据覆盖

回测采用完整周期 + 自适应 K 线粒度，不用少量 partial data 冒充完整周期。

本项目优先保证回测覆盖透明、风险诊断和策略质量，不以最低延迟为核心目标。负收益是有效诊断结果，代表策略风险被发现，不代表工具失败。

默认矩阵：

| 周期 | K 线粒度 | 覆盖 |
| --- | --- | --- |
| `1D` | `5m` | 完整周期 |
| `1W` | `15m` | 完整周期 |
| `1M` | `1H` | 完整周期 |
| `6M` | `4H` | 完整周期 |
| `1Y` | `1D` | 完整周期 |
| `2Y` | `1D` | 完整周期 |
| `3Y` | `1D` | 完整周期 |

如果外部数据 Skill 注入了更高频 K 线，回测引擎会按完整输入跨度聚合为目标 OHLCV 桶，而不是只截取最后一小段。外部数据结果会标记 `coverage: "provided-input-span"`，避免把不足周期的数据误报成完整周期。

回测结果会返回：

- `startTime` / `endTime`
- `dataQuality`
- `noTradeReason`
- `tradeActivityScore`
- `entrySignalCount`
- `blockedSignalCount`
- `riskScore`
- `stabilityScore`
- `capitalEfficiencyScore`
- `strategyQuality`

`strategyQuality` 会标记策略是否包含趋势过滤、波动过滤、敞口限制、止损/风险关闭逻辑，以及是否使用 `ctx.indicators`。

## 评委测试路径

完整质量路径：

```json
{
  "useOpenAI": true
}
```

AI-backed generation / advice 可能耗时 60-90 秒，这是预期行为。该路径用于评估策略质量、风险建议和完整闭环。

可用性 smoke path：

```json
{
  "useOpenAI": false
}
```

该路径用于快速确认工具链可用，不作为策略质量评估的唯一依据。

## Pharos 网络

默认网络为 Pharos Atlantic Testnet：

- RPC：`https://atlantic.dplabs-internal.com`
- Chain ID：`688689`
- Native Token：`PHRS`
- Explorer：`https://atlantic.pharosscan.xyz/`
- Source：Pharos official docs `https://docs.pharosnetwork.xyz/`

机器可读配置：

```json
{
  "network": "Pharos Atlantic Testnet",
  "chainId": 688689,
  "rpc": "https://atlantic.dplabs-internal.com",
  "explorer": "https://atlantic.pharosscan.xyz/",
  "nativeToken": "PHRS"
}
```

当前项目只执行只读 RPC 检查，不发起转账、部署或合约写入。

更多公开网络与资产元信息见：

- `assets/networks.json`
- `assets/tokens.json`
- `assets/mcp-endpoints.json`
- `assets/artifact.schema.json`

## Phase 1 提交重点

本项目的 Phase 1 提交重点是：

- 标准化 MCP Skill 接口
- 可复用的策略生成、校验、回测、模拟能力
- 可验证的 Pharos Atlantic RPC 和钱包只读检查
- 清晰的输入输出 schema
- 可直接运行的示例调用和 smoke test

当前项目仅提供研究、回测和模拟能力，不包含链上写入或真实交易执行。

## Phase 2 复用方向

Future Phase 2 Agents can consume exported strategy artifacts and combine them with wallet, oracle, DEX, or execution Skills under strict risk controls.

当前 artifact 是策略研究产物，不是交易授权。未来如接入执行型 Skill，应作为独立、默认关闭、强确认的模块，并继续保留本项目的研究闭环作为前置风控步骤。
