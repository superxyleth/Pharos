const baseUrl = (process.argv[2] || process.env.X402_SMOKE_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
const strict = process.argv.includes('--strict') || process.env.X402_SMOKE_STRICT === 'true';

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function assertCheck(name, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`- ${mark}: ${name}${detail ? ` - ${detail}` : ''}`);
  if (!ok) failed += 1;
}

let failed = 0;

console.log('# Pharos x402 Public PHRS Smoke');
console.log('');
console.log(`Base URL: ${baseUrl}`);
console.log(`Strict PHRS mode: ${strict}`);
console.log('');

const statusResponse = await fetch(`${baseUrl}/x402/status`);
const status = await readJson(statusResponse);
assertCheck('x402 status responds', statusResponse.ok, `http=${statusResponse.status}`);
assertCheck('x402 network is Pharos Atlantic', status.network === 'eip155:688689' && status.chainId === 688689, `network=${status.network}, chainId=${status.chainId}`);
assertCheck('active payment mode is PHRS receipt', status.activePaymentMode === 'native-phrs-receipt', `mode=${status.activePaymentMode}`);
assertCheck('active asset is PHRS', status.activeAsset === 'PHRS', `asset=${status.activeAsset}`);
if (strict) {
  assertCheck('facilitator URL is not externalized in PHRS mode', status.facilitatorUrlConfigured === false, `facilitator=${status.facilitatorUrlConfigured}`);
  assertCheck('active settlement verifies existing public-chain transfer', status.activeSettlement === 'server-verifies-existing-onchain-transfer', `settlement=${status.activeSettlement}`);
}

const quoteResponse = await fetch(`${baseUrl}/x402/quote`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ resource: '/paid/quant-report', method: 'POST' }),
});
const quote = await readJson(quoteResponse);
assertCheck('x402 quote succeeds', quoteResponse.ok && quote.success === true, `http=${quoteResponse.status}`);
assertCheck('quote uses exact scheme', quote.requirements?.scheme === 'exact', `scheme=${quote.requirements?.scheme}`);
assertCheck('quote targets Pharos Atlantic', quote.requirements?.network === 'eip155:688689', `network=${quote.requirements?.network}`);
assertCheck('quote asset is PHRS', quote.requirements?.asset === 'PHRS', `asset=${quote.requirements?.asset}`);
assertCheck('quote uses PHRS receipt verification', quote.requirements?.verificationMode === 'native-phrs-receipt', `verification=${quote.requirements?.verificationMode}`);
if (strict) {
  assertCheck('quote does not require a facilitator URL', quote.requirements?.facilitatorUrl === null, `facilitator=${quote.requirements?.facilitatorUrl}`);
  assertCheck('quote does not expose an ERC20 asset address', quote.requirements?.assetAddress === undefined, `assetAddress=${quote.requirements?.assetAddress}`);
}

const paidResponse = await fetch(`${baseUrl}/paid/quant-report`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ symbol: 'WBTC', dryRun: true }),
});
const paid = await readJson(paidResponse);
const paymentRequiredHeader = paidResponse.headers.get('payment-required') ?? paidResponse.headers.get('x-payment-required');
assertCheck('protected route requires payment without signature', paidResponse.status === 402, `http=${paidResponse.status}`);
assertCheck('protected route returns payment requirements', Boolean(paymentRequiredHeader || paid.paymentRequired || paid.accepts || paid.x402), paymentRequiredHeader ? 'header=present' : 'body=present');

console.log('');
console.log(JSON.stringify({
  ok: failed === 0,
  failedChecks: failed,
  x402: {
    activePaymentMode: status.activePaymentMode,
    activeAsset: status.activeAsset,
    activeSettlement: status.activeSettlement,
  },
  quote: {
    productId: quote.product?.id,
    network: quote.requirements?.network,
    asset: quote.requirements?.asset,
    verificationMode: quote.requirements?.verificationMode,
    facilitatorUrl: quote.requirements?.facilitatorUrl,
    price: quote.requirements?.price,
  },
  paidRoute: {
    status: paidResponse.status,
    paymentRequiredHeader: Boolean(paymentRequiredHeader),
  },
}, null, 2));

if (failed > 0) {
  process.exit(1);
}
