const DEFAULT_MCP_URL = 'http://150.158.28.155:3011/mcp';
const DEFAULT_HEALTH_URL = 'http://150.158.28.155:3011/health';
const REQUEST_TIMEOUT_MS = Number(process.env.JUDGE_SMOKE_TIMEOUT_MS ?? 180_000);

const mcpUrl = process.argv[2] ?? process.env.MCP_URL ?? DEFAULT_MCP_URL;
const healthUrl = process.argv[3] ?? process.env.HEALTH_URL ?? DEFAULT_HEALTH_URL;

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

const x402Tools = [
  'x402_payment_status',
  'x402_product_catalog',
  'x402_quote',
  'x402_receipt_verify',
];

const checks = [];

function addCheck(name, ok, detail = '') {
  checks.push({ name, ok, detail });
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
    const parsed = JSON.parse(line);
    if (parsed.result || parsed.error) return parsed;
  }

  throw new Error(`Unable to parse MCP response: ${trimmed.slice(0, 200)}`);
}

async function postMcp(body) {
  const response = await fetchWithTimeout(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MCP HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return parseMcpResponse(text);
}

async function callTool(id, name, args = {}) {
  const rpc = await postMcp({
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name, arguments: args },
  });

  if (rpc.error) {
    throw new Error(`${name} returned JSON-RPC error: ${JSON.stringify(rpc.error)}`);
  }

  const text = rpc.result?.content?.[0]?.text;
  if (!text) {
    throw new Error(`${name} returned no text content`);
  }
  return JSON.parse(text);
}

function renderCheck(check) {
  const mark = check.ok ? 'PASS' : 'FAIL';
  return `- ${mark}: ${check.name}${check.detail ? ` - ${check.detail}` : ''}`;
}

console.log('# Pharos Skill Judge Smoke Test');
console.log('');
console.log(`Health endpoint: ${healthUrl}`);
console.log(`MCP endpoint: ${mcpUrl}`);
console.log('');

let health;
try {
  const response = await fetchWithTimeout(healthUrl);
  health = await response.json();
  addCheck('health endpoint responds', response.ok, `status=${health.status ?? response.status}`);
  addCheck('health status is ok', health.status === 'ok', `status=${health.status}`);
} catch (error) {
  addCheck('health endpoint responds', false, error.message);
}

let tools = [];
try {
  const list = await postMcp({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
  tools = list.result?.tools ?? [];
  const names = tools.map((tool) => tool.name);
  addCheck('tools/list returns at least 10 core tools', tools.length >= requiredTools.length, `count=${tools.length}`);
  for (const tool of requiredTools) {
    addCheck(`tools/list exposes ${tool}`, names.includes(tool));
  }
  for (const tool of x402Tools) {
    addCheck(`tools/list exposes optional ${tool}`, names.includes(tool));
  }
} catch (error) {
  addCheck('tools/list returns tools', false, error.message);
}

let network;
try {
  network = await callTool(2, 'pharos_network_status');
  addCheck('network is atlantic-testnet', network.network === 'atlantic-testnet', `network=${network.network}`);
  addCheck('chainId is 688689', network.chainId === 688689, `chainId=${network.chainId}`);
  addCheck('native token is PHRS', network.nativeToken === 'PHRS', `nativeToken=${network.nativeToken}`);
} catch (error) {
  addCheck('pharos_network_status returns network metadata', false, error.message);
}

let wallet;
try {
  wallet = await callTool(3, 'pharos_wallet_info');
  addCheck('wallet info is read-only', wallet.readOnly === true, `readOnly=${wallet.readOnly}`);
  addCheck('private key is not returned', wallet.privateKeyReturned === false, `privateKeyReturned=${wallet.privateKeyReturned}`);
} catch (error) {
  addCheck('pharos_wallet_info returns privacy-safe output', false, error.message);
}

let x402;
try {
  x402 = await callTool(5, 'x402_payment_status');
  addCheck('x402 status tool succeeds', x402.success === true, `success=${x402.success}`);
  addCheck('x402 settlement broadcast disabled', x402.settlementBroadcastEnabled === false, `settlement=${x402.settlementBroadcastEnabled}`);
  addCheck('x402 on-chain writes disabled', x402.onChainWritesEnabled === false, `onChainWrites=${x402.onChainWritesEnabled}`);
} catch (error) {
  addCheck('x402_payment_status returns safe payment status', false, error.message);
}

let loop;
try {
  loop = await callTool(6, 'quant_loop_run', {
    description:
      'Generate a WBTC trend and DCA research strategy using the local BTCUSDT three-year proxy dataset, with volatility filter, risk-off exit, and max exposure control. Run full multi-period backtests, produce risk-aware advice, simulate decisions, and export a reusable artifact.',
    symbol: 'WBTC',
    chain: 'pharos-atlantic-testnet',
    initialCapital: 1000,
    useOpenAI: false,
  });

  const safety = loop.artifact?.safety ?? {};
  const periods = loop.backtestSummary ?? [];
  addCheck('quant_loop_run succeeds', loop.success === true, `success=${loop.success}`);
  addCheck('closed loop stage is returned', loop.stage === 'phase1_skill_closed_loop', `stage=${loop.stage}`);
  addCheck('deterministic generation mode is used', loop.executionModeSummary?.generationMode === 'deterministic', `mode=${loop.executionModeSummary?.generationMode}`);
  addCheck('provider timeout is 90000ms', loop.executionModeSummary?.providerTimeoutMs === 90000, `timeout=${loop.executionModeSummary?.providerTimeoutMs}`);
  addCheck('backtest summary has 7 periods', periods.length === 7, `periods=${periods.length}`);
  addCheck('WBTC proxy market dataset is used', loop.dataSourceSummary?.sources?.some((source) => String(source).includes('Friend server Binance spot 1h OHLCV CSV snapshot')), `sources=${JSON.stringify(loop.dataSourceSummary?.sources)}`);
  addCheck('WBTC proxy data is market evidence', loop.dataSourceSummary?.marketEvidence === true, `marketEvidence=${loop.dataSourceSummary?.marketEvidence}`);
  addCheck('all backtest periods have trades', periods.every((period) => Number(period.totalTrades) > 0), `trades=${periods.map((period) => `${period.period}:${period.totalTrades}`).join(',')}`);
  addCheck('artifactId is present', Boolean(loop.artifact?.artifactId), loop.artifact?.artifactId ?? '');
  addCheck('codeHash is present', /^sha256:[a-f0-9]{64}$/.test(loop.artifact?.codeHash ?? ''), loop.artifact?.codeHash ?? '');
  addCheck('live trading disabled', safety.liveTrading?.enabled === false, `liveTrading=${safety.liveTrading?.enabled}`);
  addCheck('transaction broadcast disabled', safety.broadcastTransactions === false, `broadcast=${safety.broadcastTransactions}`);
  addCheck('on-chain writes disabled', safety.onChainWrites === false, `onChainWrites=${safety.onChainWrites}`);
  addCheck('private key exposure disabled', safety.privateKeyExposure === false, `privateKeyExposure=${safety.privateKeyExposure}`);
} catch (error) {
  addCheck('quant_loop_run completes deterministic review path', false, error.message);
}

const failed = checks.filter((check) => !check.ok);

console.log('## Checks');
console.log('');
for (const check of checks) {
  console.log(renderCheck(check));
}

console.log('');
console.log('## Summary');
console.log('');
console.log(JSON.stringify(
  {
    ok: failed.length === 0,
    failedChecks: failed.length,
    health: health
      ? {
          status: health.status,
          service: health.service,
          phase: health.phase,
          network: health.network,
        }
      : null,
    toolCount: tools.length,
    network: network
      ? {
          network: network.network,
          chainId: network.chainId,
          nativeToken: network.nativeToken,
          blockNumber: network.blockNumber,
        }
      : null,
    wallet: wallet
      ? {
          walletConfigured: wallet.walletConfigured,
          readOnly: wallet.readOnly,
          privateKeyReturned: wallet.privateKeyReturned,
        }
      : null,
    x402: x402
      ? {
          enabled: x402.enabled,
          mode: x402.mode,
          settlementBroadcastEnabled: x402.settlementBroadcastEnabled,
          onChainWritesEnabled: x402.onChainWritesEnabled,
        }
      : null,
    loop: loop
      ? {
          success: loop.success,
          stage: loop.stage,
          generationMode: loop.executionModeSummary?.generationMode,
          adviceMode: loop.executionModeSummary?.adviceMode,
          providerTimeoutMs: loop.executionModeSummary?.providerTimeoutMs,
          backtestPeriods: loop.backtestSummary?.length,
          artifactId: loop.artifact?.artifactId,
          codeHash: loop.artifact?.codeHash,
          liveTradingEnabled: loop.artifact?.safety?.liveTrading?.enabled,
          broadcastTransactions: loop.artifact?.safety?.broadcastTransactions,
          onChainWrites: loop.artifact?.safety?.onChainWrites,
        }
      : null,
  },
  null,
  2,
));

if (failed.length > 0) {
  process.exit(1);
}
