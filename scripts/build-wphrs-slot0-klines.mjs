import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Interface } from 'ethers';

const RPC_URL = 'https://atlantic.dplabs-internal.com';
const NETWORK = 'atlantic-testnet';
const CHAIN_ID = 688689;
const HOUR_MS = 60 * 60 * 1000;
const CONCURRENCY = Number(process.env.WPHRS_SLOT0_CONCURRENCY ?? 8);
const RETRIES = Number(process.env.WPHRS_SLOT0_RETRIES ?? 6);
const MAX_HOURS = Number(process.env.WPHRS_SLOT0_MAX_HOURS ?? 720);

const WPHRS = '0x838800b758277CC111B2d48Ab01e5E164f8E9471';
const USDT = '0xE7E84B8B4f39C507499c40B4ac199B050e2882d5';
const POOL = '0xAB19d9EE718C6ED0C1E1809c664456Ee788D454c';
const FIRST_CODE_BLOCK = 2176038;

const ABI = [
  'function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
];
const iface = new Interface(ABI);

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const datasetDir = join(rootDir, 'assets', 'market-data', NETWORK);
const datasetPath = join(datasetDir, 'WPHRS_USDT_1H.slot0.real.jsonl');
const manifestPath = join(rootDir, 'assets', 'market-data', 'manifest.json');

async function rpc(method, params = []) {
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    let payload;
    try {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      payload = await response.json();
    } catch (error) {
      if (attempt === RETRIES) throw error;
      await sleep(500 * (attempt + 1));
      continue;
    }
    if (!payload.error) return payload.result;
    const retryable = payload.error.code === -32011
      || payload.error.message?.includes('Request too fast')
      || payload.error.message?.includes('tls')
      || payload.error.message?.includes('limit');
    if (!retryable || attempt === RETRIES) {
      throw new Error(`${method} failed: ${JSON.stringify(payload.error)}`);
    }
    await sleep(400 * (attempt + 1));
  }
  throw new Error(`${method} failed after retries`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function call(address, fragment, blockTag = 'latest') {
  const data = iface.encodeFunctionData(fragment, []);
  const result = await rpc('eth_call', [{ to: address, data }, blockTag]);
  return iface.decodeFunctionResult(fragment, result);
}

async function blockTimestamp(blockNumber) {
  const block = await rpc('eth_getBlockByNumber', [`0x${blockNumber.toString(16)}`, false]);
  return Number(BigInt(block.timestamp)) * 1000;
}

function sameAddress(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

function priceFromSqrtPriceX96(sqrtPriceX96, token0, token1) {
  const sqrt = BigInt(sqrtPriceX96.toString());
  const raw = Number(sqrt * sqrt) / Number(2n ** 192n);
  const token1PerToken0 = raw * 10 ** (18 - 6);
  if (sameAddress(token0, WPHRS) && sameAddress(token1, USDT)) return token1PerToken0;
  if (sameAddress(token1, WPHRS) && sameAddress(token0, USDT)) return 1 / token1PerToken0;
  throw new Error(`Unexpected pool tokens: ${token0}/${token1}`);
}

function round(value) {
  return Number(value.toPrecision(12));
}

async function main() {
  await mkdir(datasetDir, { recursive: true });

  const latestBlock = Number(BigInt(await rpc('eth_blockNumber')));
  const firstTime = await blockTimestamp(FIRST_CODE_BLOCK);
  const latestTime = await blockTimestamp(latestBlock);
  const token0 = (await call(POOL, 'token0'))[0];
  const token1 = (await call(POOL, 'token1'))[0];

  const startHour = Math.ceil(firstTime / HOUR_MS) * HOUR_MS;
  const endHour = Math.floor(latestTime / HOUR_MS) * HOUR_MS;
  let hours = [];
  for (let time = startHour; time <= endHour; time += HOUR_MS) hours.push(time);
  if (MAX_HOURS > 0 && hours.length > MAX_HOURS) {
    hours = hours.slice(-MAX_HOURS);
  }

  const rows = new Array(hours.length);
  let cursor = 0;
  async function worker() {
    while (cursor < hours.length) {
      const index = cursor++;
      const targetTime = hours[index];
      const ratio = (targetTime - firstTime) / (latestTime - firstTime);
      const sampleBlock = Math.max(FIRST_CODE_BLOCK, Math.min(latestBlock, Math.round(FIRST_CODE_BLOCK + ratio * (latestBlock - FIRST_CODE_BLOCK))));
      const blockTag = `0x${sampleBlock.toString(16)}`;
      const slot0 = await call(POOL, 'slot0', blockTag);
      const price = round(priceFromSqrtPriceX96(slot0.sqrtPriceX96, token0, token1));
      rows[index] = {
        time: targetTime,
        iso: new Date(targetTime).toISOString(),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0,
        quoteVolume: 0,
        tradeCount: null,
        sampleBlock,
        sampleBlockTime: null,
        tick: Number(slot0.tick),
        sqrtPriceX96: slot0.sqrtPriceX96.toString(),
        source: 'faroswap-v3-slot0-historical-eth_call',
      };
      if ((index + 1) % 100 === 0) {
        console.log(JSON.stringify({ completed: index + 1, total: hours.length }));
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, hours.length) }, worker));
  await writeFile(datasetPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'real-on-chain-pool-state',
    datasets: [
      {
        datasetId: `${NETWORK}:WPHRS_USDT:1H:faroswap-v3-slot0`,
        network: NETWORK,
        chainId: CHAIN_ID,
        pair: 'WPHRS/USDT',
        interval: '1H',
        format: 'jsonl',
        path: 'assets/market-data/atlantic-testnet/WPHRS_USDT_1H.slot0.real.jsonl',
        poolAddress: POOL,
        dex: 'FaroSwap',
        poolType: 'UniswapV3-compatible',
        token0,
        token1,
        baseAsset: { symbol: 'WPHRS', address: WPHRS, decimals: 18 },
        quoteAsset: { symbol: 'USDT', address: USDT, decimals: 6 },
        firstCodeBlock: FIRST_CODE_BLOCK,
        firstCodeTime: new Date(firstTime).toISOString(),
        latestObservedBlock: latestBlock,
        latestObservedBlockTime: new Date(latestTime).toISOString(),
        candleCount: rows.length,
        startTime: rows[0]?.time ?? null,
        endTime: rows.at(-1)?.time ?? null,
        maxHoursRequested: MAX_HOURS,
        marketEvidence: false,
        realMarketPrice: false,
        onChainPoolStateEvidence: true,
        cexComparable: false,
        mainnetProsComparable: false,
        tradeDerived: false,
        volumeAvailable: false,
        dataSource: 'Pharos Atlantic RPC historical eth_call(slot0) on FaroSwap WPHRS/USDT V3 pool',
        limitations: [
          'This is Atlantic testnet WPHRS, not OKX PROS and not Pharos mainnet WPROS.',
          'The observed testnet pool state is near 1 USDT and should not be used as PROS/USD market evidence.',
          'These candles are real on-chain pool-state price snapshots, not Swap-event OHLCV.',
          'OHLC is equal within each hour because this dataset samples one slot0 state per hour.',
          'sampleBlockTime is null to keep the RPC call count low; sampleBlock is recorded for reproducibility.',
          'Volume is 0 because explorer/indexer APIs are rate-limited and full Swap-event extraction is not yet complete.',
        ],
      },
    ],
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({
    datasetPath,
    manifestPath,
    rows: rows.length,
    first: rows[0],
    last: rows.at(-1),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
