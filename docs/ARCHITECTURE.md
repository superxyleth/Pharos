# Architecture

## High-Level Flow

```mermaid
flowchart LR
  User["User / Evaluator"] --> Agent["AI Agent"]
  Agent --> SkillPkg["Skill Package<br/>SKILL.md + references + assets"]
  Agent --> MCPClient["MCP Client"]
  MCPClient --> Server["Pharos Quant Skill MCP Server"]
  Server --> Tools["MCP Tools"]
  Tools --> Generator["Strategy Generator"]
  Tools --> Validator["Strategy Validator"]
  Tools --> Sandbox["Strategy Sandbox"]
  Tools --> Backtest["Backtest Engine"]
  Tools --> Advisor["Risk Advisor"]
  Tools --> Simulator["Sandbox Simulator"]
  Tools --> Artifact["Artifact Exporter"]
  Tools --> RPC["Pharos Atlantic RPC<br/>readonly"]
```

## Runtime Responsibilities

The Skill package layer helps Agents understand the capability:

- `SKILL.md`
- `references/`
- `assets/`

The MCP runtime layer executes the capability:

- `tools/list`
- `tools/call`
- strategy lifecycle tools
- Pharos read-only tools

## Data Flow

```mermaid
sequenceDiagram
  participant Agent
  participant MCP as MCP Server
  participant Gen as Strategy Generator
  participant Val as Validator
  participant BT as Backtest Engine
  participant Adv as Advisor
  participant Sim as Simulator
  participant Art as Artifact Exporter
  participant RPC as Pharos RPC Readonly

  Agent->>MCP: tools/list
  Agent->>MCP: pharos_network_status
  MCP->>RPC: eth_chainId / blockNumber
  RPC-->>MCP: chainId 688689 / block
  Agent->>MCP: quant_loop_run
  MCP->>Gen: generate strategy
  MCP->>Val: validate sandbox contract
  MCP->>BT: run 7-period matrix
  MCP->>Adv: produce risk advice
  MCP->>Sim: simulate decisions
  MCP->>Art: export artifact
  MCP-->>Agent: closed-loop result
```

## Phase 1 Boundary

```mermaid
flowchart TD
  Allowed["Allowed<br/>research, validation, backtest, simulation, artifact export, readonly RPC"] --> Skill["Phase 1 Skill"]
  Blocked["Blocked<br/>live trading, transaction broadcast, swaps, approvals, deployments, on-chain writes"] --> Guard["Safety Boundary"]
  Guard --> Skill
```

## Phase 2 Extension Point

Future Phase 2 Agents can consume exported strategy artifacts and combine them with wallet, oracle, DEX, or execution Skills under strict risk controls.

Execution should remain a separate disabled-by-default module with Atlantic Testnet guards, max notional limits, slippage limits, dry-run transaction plans, and explicit confirmation.
