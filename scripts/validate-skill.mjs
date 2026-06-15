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
  'assets/x402-products.json',
  'assets/artifact.schema.json',
  'docs/PHASE2_ARTIFACT_REUSE.md',
  'examples/consume-artifact-example.json',
  'examples/phase2-agent-consume-artifact-flow.md',
  'references/x402-payments.md',
  'examples/x402-paid-artifact-flow.md',
  'scripts/judge-smoke.mjs',
];

const coreTools = [
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

const x402Tools = [
  'x402_payment_status',
  'x402_product_catalog',
  'x402_quote',
  'x402_receipt_verify',
];

const requiredTools = [...coreTools, ...x402Tools];

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
assertCheck(skill.includes('assets/artifact.schema.json'), 'SKILL.md lists artifact schema asset', 'artifact schema asset missing');

const readme = await readText('README.md');
assertCheck(readme.includes('## Judge Quick Test'), 'README has Judge Quick Test', 'judge quick path missing');
assertCheck(readme.includes('## Local Reproduction'), 'README has Local Reproduction', 'local reproduction notes missing');
assertCheck(readme.includes('npm run judge:smoke'), 'README documents judge smoke test', 'judge smoke command missing');
assertCheck(readme.includes('## Artifact Reuse For Future Agents'), 'README has artifact reuse section', 'artifact reuse section missing');
assertCheck(readme.includes('## Optional x402 Paid Gateway'), 'README has optional x402 section', 'x402 section missing');
assertCheck(readme.includes('Accept: application/json, text/event-stream'), 'README documents MCP Accept header', 'MCP Accept header missing');
assertCheck(readme.includes('"useOpenAI": false'), 'README quick test uses deterministic path', 'useOpenAI=false missing from quick test');

const demoJsonRpc = await readText('examples/demo-json-rpc-flow.md');
assertCheck(demoJsonRpc.includes('Accept: application/json, text/event-stream'), 'JSON-RPC demo documents MCP Accept header', 'MCP Accept header missing');
assertCheck(demoJsonRpc.includes('"useOpenAI": false'), 'JSON-RPC demo defaults to deterministic path', 'useOpenAI=false missing from demo');

const phase2Reuse = await readText('docs/PHASE2_ARTIFACT_REUSE.md');
assertCheck(phase2Reuse.includes('assets/artifact.schema.json'), 'Phase 2 reuse doc references artifact schema', 'artifact schema reference missing');
assertCheck(phase2Reuse.includes('disabled by default'), 'Phase 2 reuse doc keeps execution disabled by default', 'execution guardrail missing');
assertCheck(phase2Reuse.includes('examples/phase2-agent-consume-artifact-flow.md'), 'Phase 2 reuse doc links detailed flow', 'detailed flow link missing');

const x402Payments = await readText('references/x402-payments.md');
assertCheck(x402Payments.includes('X402_ENABLED=false'), 'x402 payment doc documents default disabled state', 'x402 default disabled missing');
assertCheck(x402Payments.includes('x402_quote'), 'x402 payment doc lists quote flow', 'x402 quote missing');

const x402PaidFlow = await readText('examples/x402-paid-artifact-flow.md');
assertCheck(x402PaidFlow.includes('HTTP/1.1 402 Payment Required'), 'x402 paid flow shows 402 response', '402 response missing');
assertCheck(x402PaidFlow.includes('x402_receipt_verify'), 'x402 paid flow includes receipt verify', 'receipt verify missing');

const consumeExample = await readJson('examples/consume-artifact-example.json');
assertCheck(consumeExample.artifactRef?.schema === 'assets/artifact.schema.json', 'consume artifact example references schema', 'schema reference missing');
assertCheck(Array.isArray(consumeExample.requiredChecks), 'consume artifact example has required checks', 'requiredChecks missing');

const phase2Flow = await readText('examples/phase2-agent-consume-artifact-flow.md');
assertCheck(phase2Flow.includes('not a trading authorization'), 'Phase 2 flow rejects trading authorization framing', 'trading authorization warning missing');
assertCheck(phase2Flow.includes('DRY_RUN_PLAN_ONLY'), 'Phase 2 flow uses dry-run-only decision', 'dry-run decision missing');
assertCheck(phase2Flow.includes('explicitUserConfirmation'), 'Phase 2 flow requires explicit confirmation', 'explicit confirmation guard missing');

const packageJson = await readJson('package.json');
assertCheck(packageJson.scripts?.['judge:smoke'] === 'node scripts/judge-smoke.mjs', 'package.json defines judge:smoke', 'judge smoke script missing');

const x402Products = await readJson('assets/x402-products.json');
assertCheck(Array.isArray(x402Products.products), 'assets/x402-products.json has product list', 'x402 products missing');
assertCheck(x402Products.settlementBroadcastEnabled === false, 'x402 products disable settlement broadcast', 'x402 settlement should be false');

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

const artifactSchema = await readJson('assets/artifact.schema.json');
assertCheck(artifactSchema.properties?.safety, 'artifact schema defines safety object', 'safety schema missing');
const safetyRequired = artifactSchema.properties?.safety?.required ?? [];
for (const field of ['researchOnly', 'liveTrading', 'broadcastTransactions', 'onChainWrites', 'privateKeyExposure']) {
  assertCheck(safetyRequired.includes(field), `artifact schema requires safety.${field}`, `safety.${field} not required`);
}
assertCheck(artifactSchema.properties?.codeHash?.pattern === '^sha256:[a-f0-9]{64}$', 'artifact schema validates codeHash format', 'codeHash pattern missing');

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
