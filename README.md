# Pharos Quant Strategy Lifecycle Skill

Pharos Quant Strategy Lifecycle Skill is a Phase 1 MCP Skill that lets AI Agents generate, validate, backtest, simulate, and export reusable PHRS strategy artifacts on Pharos Atlantic Testnet, with no live trading or transaction broadcasting.

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

PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
PHAROS_CHAIN_ID=688689

PRIVATE_KEY=0xreplace_with_private_key
PORT=3001
```

说明：

- `OPENAI_BASE_URL` 支持 OpenAI 兼容中转服务。
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

测试说明：

- `test:backtest` 会运行多周期回测 smoke test。
- `test:pharos` 会检查 Pharos Atlantic RPC，并在配置 `PRIVATE_KEY` 时查询钱包余额。
- `test:openai` 会验证 OpenAI 兼容接口是否可用。
- `test:mcp` 需要先启动 `npm run mcp`，用于验证 MCP `tools/list`。

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
