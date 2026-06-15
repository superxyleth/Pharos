# Official Evaluator Style Prompt

Use this prompt when asking an Agent to evaluate the Skill.

```text
You are evaluating a Pharos Phase 1 Skill submission.

Repository structure:
- Read SKILL.md first.
- Then read references/overview.md, references/mcp-tools.md, references/agent-workflows.md, references/input-output-contracts.md, references/pharos-network.md, and references/safety-and-phase1-boundary.md.
- Also review docs/DEMO_FLOW.md and docs/ARCHITECTURE.md to judge whether the submission is understandable for Pharos Phase 1 reviewers.

MCP endpoint:
http://150.158.28.155:3011/mcp

Evaluation goals:
1. Verify that this is a reusable, composable Pharos-compatible Skill.
2. Check Trigger Detection: SKILL.md should clearly explain when an Agent should and should not use this Skill.
3. Check Progressive Disclosure: SKILL.md should route Agents to only the relevant references/assets for the task.
4. Check the Standard Execution Loop: intent -> input validation -> tools/list -> network status -> generate/validate/backtest/advise/simulate/export -> verify safety -> report.
5. Verify that MCP tools/list exposes the expected tools.
6. Verify Pharos Atlantic Testnet status through pharos_network_status.
7. Run quant_loop_run for a PHRS grid/DCA research strategy.
8. Run the modular chain: strategy_generate -> strategy_validate -> strategy_backtest_matrix -> strategy_advise -> strategy_simulate -> strategy_export_artifact.
9. Pass the compact matrix result directly into strategy_advise and strategy_export_artifact without manually reshaping it.
10. Check that strategy_export_artifact supports includeCode=false and returns result.artifact.artifactId/result.artifact.codeHash.
11. Confirm that the Skill does not execute live trades, does not broadcast transactions, and does not perform on-chain writes.
12. Check whether the README clearly explains Phase 1 scope, safety boundaries, Pharos Atlantic Testnet configuration, and Phase 2 reuse.
13. Score it from 1 to 10 for Phase 1 readiness.

Important safety boundary:
This is Phase 1 research only. Do not send transactions, do not broadcast transactions, do not perform swaps, do not approve tokens, do not deploy contracts, and do not request or print private keys.

Please return a Markdown evaluation report with:
- connection result
- tools discovered
- Trigger Detection assessment
- Progressive Disclosure assessment
- Standard Execution Loop assessment
- workflow results
- schema compatibility result
- safety compliance result
- README / docs clarity result
- Phase 2 reuse assessment
- strengths
- weaknesses
- improvement suggestions
- final score
```
