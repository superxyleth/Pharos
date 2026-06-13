# Pharos Phase 1 Skill Hackathon Requirements

更新时间：2026-06-13

本文用于集中记录 Pharos Phase 1 / Skill-to-Agent Dual Cascade Hackathon 的报名要求、规则理解、提交材料和注意事项，方便提交前检查。

## 1. 活动基本信息

- 活动名称：Skill-to-Agent Dual Cascade Hackathon / Pharos Phase 1 Skill Hackathon
- 报名与提交入口：https://dorahacks.io/hackathon/pharos-phase1/detail
- 官方活动介绍：https://www.pharos.xyz/agent-carnival
- Pharos 官方技术文档：https://docs.pharosnetwork.xyz/
- 用户提供的报名短链：https://bit.ly/4xkU0Wx

## 2. 时间安排

当前能看到的时间信息存在多个版本，需要按更保守的时间准备。

用户提供的最新通知：

- 提交阶段：6月8日 - 6月17日 18:00 (UTC+8)
- 获胜公布：6月22日

Pharos 官方活动页公开信息：

- Phase 1 Skill Hackathon：June 8 - June 22
- Skill submission：by June 15
- Judging：June 16 - June 22

执行建议：

- 以用户提供的最新通知 `6月17日 18:00 (UTC+8)` 作为当前提交截止参考。
- 为降低风险，项目应尽量在 `6月15日` 前准备成可提交状态。
- 若 DoraHacks 页面后台显示最终截止时间，应以 DoraHacks 提交页显示为准。

## 3. 奖励与晋级

Phase 1 奖励：

- 第一阶段获胜开发者可获得 `500 PROS`。
- 官方活动页显示 Phase 1 总奖励为 `20,000 PROS / 40 winners`。

后续机会：

- 只有本次 Skill Hackathon 的获胜开发者，才有资格进入下一阶段 Agent Carnival。
- Agent Carnival 奖金池为 `25,000 PROS`。
- Phase 2 需要基于 Phase 1 验证通过的 Skills 构建 Agent。

## 4. 参赛对象

官方活动说明显示：

- 面向全球开发者开放。
- 不强制要求参赛者具备深度 Web3 经验。
- 熟悉 API、基础开发和 Agent/Skill 集成即可参与。

## 5. Phase 1 的核心目标

Phase 1 聚焦 Skill，而不是完整 Agent。

Skill 应该是：

- 标准化的功能模块。
- 可被 Agent 调用。
- 可复用、可组合。
- 能为后续 Agent Carnival 提供能力基础。
- 面向 Pharos 生态或能够服务 Pharos Agent 场景。

典型 Skill 能力示例：

- 数据获取。
- 内容生成。
- 链上信息读取。
- 交易或支付相关能力。
- 自动化工作流。
- 可被 Agent 串联调用的专业工具。

## 6. 提交材料要求

DoraHacks 页面搜索摘要显示，代码仓库链接为必填项：

- GitHub / GitLab / Bitbucket Link Required

建议准备以下材料：

- 项目名称。
- 项目简介。
- 代码仓库链接。
- README。
- Skill 功能说明。
- Agent 调用方式。
- Demo 或调用示例。
- 公网 MCP 地址或部署说明。
- 测试结果。
- 安全说明。
- Phase 1 合规说明。

## 7. 评审关注点推断

基于活动定位，评审大概率关注：

- Skill 是否真的可被 Agent 调用。
- 是否标准化、可复用、可组合。
- 是否能稳定暴露工具列表或能力接口。
- 是否与 Pharos 生态相关。
- 是否有清晰 README 和调用示例。
- 是否有实际 Demo 或测试结果。
- 是否具备安全边界。
- 是否适合进入 Phase 2 被 Agent 继续使用。

## 8. 安全与合规注意事项

本项目提交时必须强调：

- 不泄露私钥。
- 不泄露 API Key。
- 不提交 `.env`。
- 不提交 `.ssh`、`.tools`、`.codex`、`.gitconfig`。
- 不在 README、日志、聊天记录或提交材料中暴露敏感配置。
- Phase 1 不执行实盘交易。
- Phase 1 不广播链上交易。
- Phase 1 不发送交易。
- 只做研究、回测、沙盒模拟和 artifact 导出。

公开报道显示，该黑客松会关注 Skill 安全扫描能力，例如恶意代码、数据泄露、未授权网络访问、shell 执行、文件系统滥用和运行时风险等。

## 9. 我们项目与要求的匹配情况

项目名称：

`pharos-quant-strategy-lifecycle-skill`

当前匹配点：

- 是 MCP Skill 项目。
- 可通过 MCP 被 Agent 调用。
- 已部署公网 MCP 服务。
- 面向 Pharos Atlantic Testnet。
- 支持 `chainId = 688689`。
- 支持 PHRS 场景。
- 提供量化策略生命周期能力。
- 支持策略生成。
- 支持策略校验。
- 支持多周期回测。
- 支持策略建议。
- 支持沙盒模拟。
- 支持 artifact 导出。
- 支持 `quant_loop_run` 一键端到端闭环。
- 明确 `liveTrading.enabled = false`。
- 不执行实盘交易。
- 不广播链上交易。

当前已验证：

- 公网 health 可访问。
- MCP `tools/list` 可访问。
- Agent 已完成完整闭环测试。
- `quant_loop_run` 已成功跑通。

## 10. 提交前检查清单

必须检查：

- README 顶部是否包含 Hackathon Submission 信息。
- README 是否说明 Phase 1 Skill 定位。
- README 是否写明公网 MCP 地址。
- README 是否写明 Health 地址。
- README 是否写明工具列表。
- README 是否写明 No live trading / No transaction broadcast。
- GitHub 仓库是否可访问。
- `.env` 未提交。
- `.ssh` 未提交。
- `.tools` 未提交。
- `.codex` 未提交。
- `.gitconfig` 未提交。
- Agent 测试报告已保存。
- Demo prompt 已准备。
- DoraHacks 表单需要的项目简介已准备。

建议优化：

- 修复工具之间的 schema 串联体验。
- 保存一份 Agent 测试反馈。
- 增加短版 OpenClaw Agent prompt。
- 增加 DoraHacks 提交摘要。
- 增加完整 JSON-RPC Demo 示例。

## 11. 建议提交文案重点

提交时建议突出：

- This is a reusable MCP Skill for Pharos Agent workflows.
- It focuses on research-only quant strategy lifecycle automation.
- It supports strategy generation, validation, multi-period backtesting, advisory feedback, sandbox simulation, and artifact export.
- It runs on Pharos Atlantic Testnet context.
- It is safe for Phase 1: no live trading, no transaction broadcast, no on-chain writes.
- It has been tested through an external Agent with a successful end-to-end `quant_loop_run`.

## 12. 参考来源

- DoraHacks 报名页面：https://dorahacks.io/hackathon/pharos-phase1/detail
- Pharos 官方活动页：https://www.pharos.xyz/agent-carnival
- Pharos 官方技术文档：https://docs.pharosnetwork.xyz/
- 用户提供的最新通知：提交阶段 `6月8日 - 6月17日 18:00 (UTC+8)`，获胜公布 `6月22日`
- 公开安全扫描报道：https://blockster.com/pharos-taps-certik-skill-scanner-for-ai-agent-hackathon-with-150000-pros-prize-pool
