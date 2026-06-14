import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const offline = process.argv.includes('--offline') || process.env.SKILL_VALIDATE_OFFLINE === '1';

const requiredFiles = [
  'SKILL.md',
  'README.md',
  'references/overview.md',
  'references/mcp-tools.md',
  'references/agent-workflows.md',
  'references/input-output-contracts.md',
  'references/pharos-network.md',
  'references/safety-and-phase1-boundary.md',
  'references/evaluation-guide.md',
  'assets/networks.json',
  'assets/tokens.json',
  'assets/mcp-endpoints.json',
];

const requiredTools = [
  'pharos_network_status',
  'pharos_wallet_info',
  'strategy_generate',
  'strategy_validate',
  'strategy_backtest',
  'strategy_backtest_matrix',
  'strategy_advise',
  'strategy_simulate',
  'strategy_export_artifact',
  'quant_loop_run',
];

const checks = [];

function pass(name) {
  checks.push({ name, ok: true });
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
}

function assertCheck(condition, name, detail) {
  if (condition) pass(name);
  else fail(name, detail);
}

async function readText(relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

function parseMcpResponse(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);

  const dataLines = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== '[DONE]');

  for (const line of dataLines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.result || parsed.error) return parsed;
    } catch {
      // Keep scanning event-stream lines.
    }
  }

  throw new Error(`Unable to parse MCP response: ${trimmed.slice(0, 200)}`);
}

async function postMcp(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return parseMcpResponse(text);
}

for (const file of requiredFiles) {
  try {
    await fs.access(path.join(root, file));
    pass(`required file exists: ${file}`);
  } catch {
    fail(`required file exists: ${file}`, 'missing');
  }
}

const skill = await readText('SKILL.md');
assertCheck(/^---[\s\S]*?---/.test(skill), 'SKILL.md frontmatter exists', 'missing YAML frontmatter');
for (const field of ['name:', 'description:', 'version:', 'runtime:', 'network:', 'chainId:']) {
  assertCheck(skill.includes(field), `SKILL.md frontmatter has ${field}`, `missing ${field}`);
}
for (const section of ['## When To Use', '## When Not To Use', '## Capability Index', '## Progressive Disclosure Guide', '## Standard Execution Loop', '## Safety Boundary']) {
  assertCheck(skill.includes(section), `SKILL.md section exists: ${section}`, 'missing section');
}
for (const tool of requiredTools) {
  assertCheck(skill.includes(tool), `SKILL.md lists tool: ${tool}`, 'tool not listed');
}

const pharosNetwork = await readText('references/pharos-network.md');
for (const expected of [
  'https://atlantic.dplabs-internal.com',
  'wss://atlantic.dplabs-internal.com',
  'https://atlantic.pharosscan.xyz/',
  '688689',
  '500 times/5m',
  '64',
]) {
  assertCheck(pharosNetwork.includes(expected), `pharos-network documents ${expected}`, 'official network value missing');
}

const networks = await readJson('assets/networks.json');
const atlantic = networks.networks?.find((network) => network.name === 'atlantic-testnet');
assertCheck(Boolean(atlantic), 'assets/networks.json has atlantic-testnet', 'network missing');
if (atlantic) {
  assertCheck(atlantic.chainId === 688689, 'atlantic chainId is 688689', `got ${atlantic.chainId}`);
  assertCheck(atlantic.rpcUrl === 'https://atlantic.dplabs-internal.com', 'atlantic RPC matches official docs', `got ${atlantic.rpcUrl}`);
  assertCheck(atlantic.wssUrl === 'wss://atlantic.dplabs-internal.com', 'atlantic WSS matches official docs', `got ${atlantic.wssUrl}`);
  assertCheck(atlantic.explorerUrl === 'https://atlantic.pharosscan.xyz/', 'atlantic explorer matches official docs', `got ${atlantic.explorerUrl}`);
  assertCheck(atlantic.rateLimit === '500 times/5m', 'atlantic rate limit recorded', `got ${atlantic.rateLimit}`);
  assertCheck(atlantic.maxPendingTxsPerAddress === 64, 'atlantic max pending txs recorded', `got ${atlantic.maxPendingTxsPerAddress}`);
  assertCheck(atlantic.writeEnabled === false, 'atlantic writeEnabled is false', `got ${atlantic.writeEnabled}`);
}

const endpoints = await readJson('assets/mcp-endpoints.json');
assertCheck(endpoints.safety?.liveTradingEnabled === false, 'endpoint safety disables live trading', 'live trading should be false');
assertCheck(endpoints.safety?.transactionBroadcastEnabled === false, 'endpoint safety disables transaction broadcast', 'broadcast should be false');
assertCheck(endpoints.safety?.onChainWritesEnabled === false, 'endpoint safety disables on-chain writes', 'writes should be false');

if (!offline) {
  const healthUrl = process.env.SKILL_VALIDATE_HEALTH_URL ?? endpoints.public?.health;
  const mcpUrl = process.env.SKILL_VALIDATE_MCP_URL ?? process.env.MCP_URL ?? endpoints.public?.mcp;
  assertCheck(Boolean(healthUrl), 'health URL configured', 'missing health URL');
  assertCheck(Boolean(mcpUrl), 'MCP URL configured', 'missing MCP URL');

  if (healthUrl) {
    const health = await fetch(healthUrl);
    const text = await health.text();
    assertCheck(health.ok, 'public health endpoint responds', text.slice(0, 200));
  }

  if (mcpUrl) {
    const list = await postMcp(mcpUrl, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const tools = list.result?.tools ?? [];
    const toolNames = tools.map((tool) => tool.name);
    for (const tool of requiredTools) {
      assertCheck(toolNames.includes(tool), `public tools/list exposes ${tool}`, `tools: ${toolNames.join(', ')}`);
    }

    const status = await postMcp(mcpUrl, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'pharos_network_status', arguments: {} },
    });
    const statusText = JSON.stringify(status);
    assertCheck(statusText.includes('688689'), 'pharos_network_status returns chainId 688689', statusText.slice(0, 300));
    assertCheck(statusText.includes('atlantic-testnet'), 'pharos_network_status returns atlantic-testnet', statusText.slice(0, 300));
  }
} else {
  pass('endpoint validation skipped with --offline');
}

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  const prefix = check.ok ? 'PASS' : 'FAIL';
  console.log(`${prefix} ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
}

if (failed.length > 0) {
  console.error(`\nSkill validation failed: ${failed.length} issue(s).`);
  process.exit(1);
}

console.log(`\nSkill validation passed: ${checks.length} checks.`);
