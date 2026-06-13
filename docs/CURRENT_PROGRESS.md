# Pharos Quant Strategy Lifecycle Skill 当前进度

更新时间：2026-06-13 23:50 CST

## 项目定位

本项目是面向 DoraHacks Pharos Phase 1 / Skill-to-Agent Dual Cascade Hackathon 的 Pharos-compatible Skill package + MCP service runtime。

当前只聚焦 Phase 1：

- 标准化、可复用的 MCP Skill
- 官方 Skill Engine 风格的 `SKILL.md` + `references/` + `assets/`
- 面向 Pharos Atlantic Testnet
- 提供量化策略生命周期能力
- 不做实盘交易
- 不广播链上交易
- 可供后续 Agent 调用

项目名称：

`pharos-quant-strategy-lifecycle-skill`

本地工作区：

`D:\Hackathons\0 PHAROS`

GitHub 仓库：

`git@github.com:superxyleth/Pharos.git`

当前仓库是否公开：

用户暂未公开 GitHub 仓库。功能测试优先通过公网 MCP endpoint 进行。

服务器部署路径：

`/opt/projects/pharos-quant-strategy-lifecycle-skill`

公网 MCP 地址：

`http://150.158.28.155:3011/mcp`

Health 地址：

`http://150.158.28.155:3011/health`

## 重要操作约束

不要批量删除文件或目录。

禁止使用：

- `del /s`
- `rd /s`
- `rmdir /s`
- `Remove-Item -Recurse`
- `rm -rf`

如需删除文件，只能一次删除一个明确路径的文件。

这些内容不能提交到 Git：

- `.env`
- `.ssh`
- `.tools`
- `.codex`
- `.gitconfig`

每次推送 GitHub 必须使用：

```cmd
memory-push.cmd "本次推送说明"
```

不要直接 `git push`。

## 技术栈

- Node.js / TypeScript
- Express HTTP 服务
- `@modelcontextprotocol/sdk`
- OpenAI SDK
- ethers
- zod
- dotenv
- tsx
- TypeScript typecheck

核心入口：

`src/server.ts`

配置读取：

`src/config.ts`

本地环境变量：

`.env`

示例环境变量：

`.env.example`

Skill package 入口：

`SKILL.md`

重要文档：

- `references/overview.md`
- `references/mcp-tools.md`
- `references/agent-workflows.md`
- `references/input-output-contracts.md`
- `references/pharos-network.md`
- `references/safety-and-phase1-boundary.md`
- `references/evaluation-guide.md`
- `references/future-phase2-execution.md`
- `docs/DEMO_FLOW.md`
- `docs/ARCHITECTURE.md`
- `docs/PHAROS_HACKATHON_REQUIREMENTS.md`
- `examples/evaluator-prompt.md`

公开元信息：

- `assets/networks.json`
- `assets/tokens.json`
- `assets/mcp-endpoints.json`

## 环境变量

项目会读取以下变量：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `PHAROS_RPC_URL`
- `PHAROS_CHAIN_ID`
- `PRIVATE_KEY`
- `PORT`

服务器 `.env` 已配置：

- OpenAI 中转配置
- Pharos Atlantic RPC
- Pharos Chain ID `688689`
- PRIVATE_KEY
- PORT `3011`

不要在聊天、README、日志或 Git 中暴露密钥内容。

## Pharos 网络

目标网络：

`Pharos Atlantic Testnet`

Chain ID：

`688689`

RPC：

`https://atlantic.dplabs-internal.com`

原生 Token：

`PHRS`

浏览器：

`https://atlantic.pharosscan.xyz/`

官方必读文档：

`https://docs.pharosnetwork.xyz/`

后续涉及 Pharos 网络、测试网资产、JSON-RPC、开发工具、x402 或链上能力扩展时，先核对该官方文档，再修改代码或提交说明。

## MCP 工具能力

当前 MCP 服务已经暴露以下工具：

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

核心闭环是：

1. 根据自然语言生成策略
2. 校验策略代码安全性和接口契约
3. 多周期回测
4. 生成策略优化建议
5. 沙盒模拟策略决策
6. 导出可复用策略 artifact

Phase 1 明确不做 live trading。

当前已优化的 Agent 串联能力：

- `strategy_backtest_matrix` compact 输出保留 `trades: []`、`equityCurve: []`、`detailMode: "compact"`。
- compact backtest result 已包含 `winRateBasis`、`realizedPnl`、`unrealizedPnl`、`openPositionValue`、`openPositionCost`、`exposurePct`。
- `strategy_advise.results` 可直接接收完整 matrix object。
- `strategy_export_artifact.backtests` 可直接接收完整 matrix object。
- `strategy_export_artifact` 支持 `includeCode=false`，返回轻量 artifact：`artifactId`、`codeHash`、`detailMode: "summary"`。

## 本地已完成

已经完成的迁移和整理：

- 将旧项目核心量化策略能力抽成 MCP Skill
- 移除与本项目无关的旧项目说明
- README 改成中文
- README 只保留 Phase 1 相关内容
- README 顶部已加入 Hackathon Submission 信息
- 已加入 `.env.example`
- 已加入 examples
- 已加入测试脚本
- 已接入 OpenAI 中转配置
- 已接入 Pharos RPC / 钱包读取
- 已通过本地测试
- 已通过服务器部署测试
- 已新增 Pharos-compatible Skill package 结构：`SKILL.md`、`references/`、`assets/`
- 已新增官方评测员风格测试提示词：`examples/evaluator-prompt.md`
- 已新增 Demo Flow：`docs/DEMO_FLOW.md`
- 已新增架构图文档：`docs/ARCHITECTURE.md`
- README 已强化 Phase 1 安全边界、Pharos 网络配置、Phase 2 artifact 复用叙事

当前本地 Git 状态在最后一次检查时是干净的。

最近已知提交：

`fee715b`

最近已知 tag：

`memory/20260613-222146-strengthen-hackathon-demo-docs-and-phase`

## 服务器部署状态

服务器：

`ubuntu@150.158.28.155`

部署路径：

`/opt/projects/pharos-quant-strategy-lifecycle-skill`

服务名：

`pharos-quant-skill.service`

服务状态：

`active`

监听端口：

`3011`

监听地址：

`*:3011`

Node.js 已安装：

`v20.20.2`

npm 已安装：

`10.8.2`

3011 端口安全组已经放行，公网访问已经验证通过。

部署方式备注：

- 服务器部署目录当前不是 Git 仓库，直接 `git pull` 会报 `fatal: not a git repository`。
- 最近一次部署使用 Python `paramiko` + SFTP，从本地上传当前 Git 跟踪文件到 `/opt/projects/pharos-quant-strategy-lifecycle-skill`。
- 部署时没有删除服务器文件，只覆盖上传 Git 跟踪文件。
- 服务器 sudo 重启服务使用用户提供的 `ubuntu` 密码完成。
- 如后续希望直接 `git pull`，需要将服务器部署目录初始化/恢复为 Git 仓库，或继续使用 SFTP 覆盖上传方式。

## 已验证结果

服务器本机验证通过：

```bash
curl http://127.0.0.1:3011/health
```

公网验证通过：

```bash
curl http://150.158.28.155:3011/health
```

返回：

```json
{
  "status": "ok",
  "service": "pharos-quant-strategy-lifecycle-skill",
  "phase": "phase1-skill",
  "network": "pharos-atlantic-testnet",
  "mcpEndpoint": "/mcp"
}
```

MCP `tools/list` 公网验证通过：

```http
POST http://150.158.28.155:3011/mcp
Content-Type: application/json
Accept: application/json, text/event-stream
```

Body：

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

已确认返回工具列表。

服务器测试通过：

```bash
npm run typecheck
npm run test:backtest
npm run test:pharos
npm run test:openai
```

OpenAI smoke test 返回：

```text
pharos-skill-ok
```

Pharos smoke test 已确认：

- RPC 可用
- Chain ID 返回 `688689`
- 钱包地址可从 PRIVATE_KEY 派生
- PHRS 余额可读取

最新公网 MCP 复测通过：

```json
{
  "ok": true,
  "toolCount": 10,
  "chainId": 688689,
  "compactDetailMode": "compact",
  "hasWinRateBasis": true,
  "adviceOk": true,
  "artifactMode": "summary",
  "quantLoopPeriods": 7,
  "liveTradingEnabled": false
}
```

最新已验证能力：

- `health` 公网可访问。
- `tools/list` 返回 10 个工具。
- `pharos_network_status` 返回 `chainId = 688689`。
- `strategy_backtest_matrix includeDetails=false` 返回 compact schema。
- 完整 matrix object 可直接传给 `strategy_advise.results`。
- 完整 matrix object 可直接传给 `strategy_export_artifact.backtests`。
- `strategy_export_artifact includeCode=false` 返回 summary artifact。
- `quant_loop_run` 返回 7 周期闭环结果。
- `liveTrading.enabled = false`。

部署时 `npm install` 提示：

```text
2 moderate severity vulnerabilities
```

当前不影响运行，后续可单独评估依赖升级。

## OpenClaw Agent 配置

OpenClaw Agent 可使用 MCP 地址：

`http://150.158.28.155:3011/mcp`

如果 Agent 与服务在同一台服务器上，也可以用：

`http://127.0.0.1:3011/mcp`

推荐先让 Agent 调用：

1. `pharos_network_status`
2. `strategy_backtest_matrix`
3. `quant_loop_run`

官方评测员风格测试提示词：

`examples/evaluator-prompt.md`

测试提示词可以让 Agent 执行类似任务：

```text
请连接 Pharos Quant Strategy Lifecycle MCP Skill，先列出工具，然后调用 pharos_network_status 检查网络状态。接着用 quant_loop_run 生成一个 PHRS 的网格/DCA 研究策略，运行多周期回测，并输出策略 artifact。注意：这是 Phase 1 Skill 测试，不要执行实盘交易，不要广播任何链上交易。
```

## 常用服务器命令

查看服务状态：

```bash
sudo systemctl status pharos-quant-skill.service --no-pager
```

重启服务：

```bash
sudo systemctl restart pharos-quant-skill.service
```

查看日志：

```bash
sudo journalctl -u pharos-quant-skill.service --no-pager -n 100
```

查看端口：

```bash
sudo ss -ltnp | grep ':3011'
```

进入部署目录：

```bash
cd /opt/projects/pharos-quant-strategy-lifecycle-skill
```

重新安装依赖：

```bash
npm install
```

运行测试：

```bash
npm run typecheck
npm run test:backtest
npm run test:pharos
npm run test:openai
```

## 下一步建议

优先级较高：

1. 用 OpenClaw Agent 真实连接公网 MCP 地址测试完整闭环。
2. 保存 Agent 调用结果，作为黑客松演示材料。
3. 保存一份 Agent 官方评测员视角的 Markdown 报告。
4. 如需继续更新 README 或 docs，使用 `memory-push.cmd "说明"` 推送。

可选增强：

1. 增加一个更短的 `examples/openclaw-agent-prompt.md`。
2. 增加演示截图或调用录屏。
3. 增加一份 DoraHacks 提交用摘要。
4. 增加一个 `demo` 示例，展示从策略生成到 artifact 导出的完整 JSON-RPC 请求。
5. 评估是否将服务器部署目录恢复成 Git 仓库，方便后续直接 `git pull`。

## 新页面接力提示

如果重新打开一个 Codex 页面，可以把下面这段直接发给它：

```text
当前项目是 D:\Hackathons\0 PHAROS 下的 Pharos Quant Strategy Lifecycle Skill。
这是 DoraHacks Pharos Phase 1 项目，定位为 Pharos-compatible Skill package + MCP service runtime，不做实盘交易。
服务器已部署到 /opt/projects/pharos-quant-strategy-lifecycle-skill。
公网 MCP 地址是 http://150.158.28.155:3011/mcp。
服务名是 pharos-quant-skill.service，3011 端口已放行，公网 health、tools/list、quant_loop_run、matrix -> advise、matrix -> artifact、includeCode=false 均已验证通过。
最近提交是 fee715b，tag 是 memory/20260613-222146-strengthen-hackathon-demo-docs-and-phase。
请先阅读 SKILL.md、references/overview.md、references/safety-and-phase1-boundary.md、references/input-output-contracts.md、docs/CURRENT_PROGRESS.md、docs/DEMO_FLOW.md、docs/ARCHITECTURE.md、README.md、package.json、src/server.ts，再继续工作。
Pharos 官方文档也要作为开发前参考：https://docs.pharosnetwork.xyz/
服务器部署目录当前不是 Git 仓库；最近一次部署用 paramiko/SFTP 上传 Git 跟踪文件，然后 npm install、npm run typecheck、sudo systemctl restart pharos-quant-skill.service。
注意不要批量删除文件，不要提交 .env/.ssh/.tools/.codex/.gitconfig，推送必须用 memory-push.cmd "说明"。
```
