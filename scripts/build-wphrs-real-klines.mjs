import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Interface } from 'ethers';

const RPC_URL = 'https://atlantic.dplabs-internal.com';
const NETWORK = 'atlantic-testnet';
const CHAIN_ID = 688689;
const HOUR_MS = 60 * 60 * 1000;
const MAX_BLOCK_SPAN = 999;
const CONCURRENCY = Number(process.env.WPHRS_SCAN_CONCURRENCY ?? 6);
const RPC_RETRY_LIMIT = Number(process.env.WPHRS_RPC_RETRY_LIMIT ?? 8);

const WPHRS = '0x838800b758277CC111B2d48Ab01e5E164f8E9471';
const USDT = '0xE7E84B8B4f39C507499c40B4ac199B050e2882d5';
const USDC = '0xcfC8330f4BCAB529c625D12781b1C19466A9Fc8B';
const WETH = '0x7d211F77525ea39A0592794f793cC1036eEaccD5';

const POOLS = [
  {
    pair: 'WPHRS/USDT',
    address: '0xAB19d9EE718C6ED0C1E1809c664456Ee788D454c',
    quoteSymbol: 'USDT',
    quoteAddress: USDT,
    quoteDecimals: 6,
  },
  {
    pair: 'WPHRS/WETH',
    address: '0x1B9b0AE0E705a9e4A257432ED16658bf0af37323',
    quoteSymbol: 'WETH',
    quoteAddress: WETH,
    quoteDecimals: 18,
  },
];

const POOL_ABI = [
  'event Swap(address indexed sender,address indexed recipient,int256 amount0,int256 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
];
const ERC20_ABI = ['function decimals() view returns (uint8)'];
const iface = new Interface(POOL_ABI);
const erc20Iface = new Interface(ERC20_ABI);
const SWAP_TOPIC = iface.getEvent('Swap').topicHash;

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const datasetDir = join(rootDir, 'assets', 'market-data', NETWORK);
const manifestPath = join(rootDir, 'assets', 'market-data', 'manifest.json');

async function rpc(method, params = []) {
  for (let attempt = 0; attempt <= RPC_RETRY_LIMIT; attempt += 1) {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const payload = await response.json();
    if (!payload.error) {
      return payload.result;
    }
    const retryable = payload.error.message?.includes('Request too fast')
      || payload.error.message?.includes('cu limit exceeded')
      || payload.error.code === -32011;
    if (!retryable || attempt === RPC_RETRY_LIMIT) {
      throw new Error(`${method} failed: ${JSON.stringify(payload.error)}`);
    }
    await sleep(500 * (attempt + 1));
  }
  throw new Error(`${method} failed after retries`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function call(address, fragment, args = []) {
  const data = iface.encodeFunctionData(fragment, args);
  const result = await rpc('eth_call', [{ to: address, data }, 'latest']);
  return iface.decodeFunctionResult(fragment, result)[0];
}

async function callErc20(address, fragment, args = []) {
  const data = erc20Iface.encodeFunctionData(fragment, args);
  const result = await rpc('eth_call', [{ to: address, data }, 'latest']);
  return erc20Iface.decodeFunctionResult(fragment, result)[0];
}

async function hasCode(address, blockNumber) {
  const code = await rpc('eth_getCode', [address, `0x${blockNumber.toString(16)}`]);
  return code !== '0x';
}

async function findFirstCodeBlock(address, latestBlockNumber) {
  let low = 0;
  let high = latestBlockNumber;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (await hasCode(address, mid)) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}

async function getBlockTimestamp(blockNumber) {
  const block = await rpc('eth_getBlockByNumber', [`0x${blockNumber.toString(16)}`, false]);
  return Number(BigInt(block.timestamp)) * 1000;
}

function chunkRanges(fromBlock, toBlock) {
  const ranges = [];
  for (let from = fromBlock; from <= toBlock; from += MAX_BLOCK_SPAN) {
    ranges.push([from, Math.min(toBlock, from + MAX_BLOCK_SPAN - 1)]);
  }
  return ranges;
}

async function scanSwapLogs(poolAddress, fromBlock, toBlock) {
  const ranges = chunkRanges(fromBlock, toBlock);
  const logs = [];
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (cursor < ranges.length) {
      const [from, to] = ranges[cursor++];
      const result = await rpc('eth_getLogs', [{
        address: poolAddress,
        fromBlock: `0x${from.toString(16)}`,
        toBlock: `0x${to.toString(16)}`,
        topics: [SWAP_TOPIC],
      }]);
      logs.push(...result);
      completed += 1;
      if (completed % 1000 === 0) {
        console.log(JSON.stringify({ poolAddress, completed, total: ranges.length, logs: logs.length }));
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ranges.length) }, worker));
  return logs.sort((a, b) => {
    const blockDelta = Number(BigInt(a.blockNumber) - BigInt(b.blockNumber));
    if (blockDelta !== 0) return blockDelta;
    return Number(BigInt(a.logIndex) - BigInt(b.logIndex));
  });
}

function sqrtPriceToHumanPrice({ sqrtPriceX96, token0, token1, token0Decimals, token1Decimals, baseToken }) {
  const sqrt = BigInt(sqrtPriceX96.toString());
  const numerator = sqrt * sqrt;
  const denominator = 2n ** 192n;
  const decimalFactor = 10 ** (Number(token0Decimals) - Number(token1Decimals));
  const token1PerToken0 = (Number(numerator) / Number(denominator)) * decimalFactor;

  if (sameAddress(baseToken, token0)) {
    return token1PerToken0;
  }
  if (sameAddress(baseToken, token1)) {
    return token1PerToken0 === 0 ? 0 : 1 / token1PerToken0;
  }
  throw new Error(`Base token ${baseToken} is not in pool ${token0}/${token1}`);
}

function amountToHuman(amount, decimals) {
  const negative = amount < 0n;
  const value = negative ? -amount : amount;
  const scaled = Number(value) / 10 ** Number(decimals);
  return negative ? -scaled : scaled;
}

function sameAddress(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

async function decodeSwaps(pool, logs, token0, token1, token0Decimals, token1Decimals) {
  const timestampCache = new Map();
  const trades = [];

  for (const log of logs) {
    const blockNumber = Number(BigInt(log.blockNumber));
    if (!timestampCache.has(blockNumber)) {
      timestampCache.set(blockNumber, await getBlockTimestamp(blockNumber));
    }
    const parsed = iface.parseLog(log);
    const amount0 = BigInt(parsed.args.amount0.toString());
    const amount1 = BigInt(parsed.args.amount1.toString());
    const price = sqrtPriceToHumanPrice({
      sqrtPriceX96: parsed.args.sqrtPriceX96,
      token0,
      token1,
      token0Decimals,
      token1Decimals,
      baseToken: WPHRS,
    });
    const baseAmount = sameAddress(WPHRS, token0)
      ? Math.abs(amountToHuman(amount0, token0Decimals))
      : Math.abs(amountToHuman(amount1, token1Decimals));
    const quoteAmount = sameAddress(pool.quoteAddress, token0)
      ? Math.abs(amountToHuman(amount0, token0Decimals))
      : sameAddress(pool.quoteAddress, token1)
        ? Math.abs(amountToHuman(amount1, token1Decimals))
        : baseAmount * price;

    trades.push({
      time: timestampCache.get(blockNumber),
      blockNumber,
      txHash: log.transactionHash,
      logIndex: Number(BigInt(log.logIndex)),
      price,
      baseVolume: baseAmount,
      quoteVolume: quoteAmount,
    });
  }
  return trades;
}

function aggregateHourly(trades) {
  const buckets = new Map();
  for (const trade of trades) {
    const hour = Math.floor(trade.time / HOUR_MS) * HOUR_MS;
    const candle = buckets.get(hour) ?? {
      time: hour,
      iso: new Date(hour).toISOString(),
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
      volume: 0,
      quoteVolume: 0,
      tradeCount: 0,
      firstTxHash: trade.txHash,
      lastTxHash: trade.txHash,
      source: 'faroswap-v3-swap-events',
    };
    candle.high = Math.max(candle.high, trade.price);
    candle.low = Math.min(candle.low, trade.price);
    candle.close = trade.price;
    candle.volume += trade.baseVolume;
    candle.quoteVolume += trade.quoteVolume;
    candle.tradeCount += 1;
    candle.lastTxHash = trade.txHash;
    buckets.set(hour, candle);
  }
  return [...buckets.values()].sort((a, b) => a.time - b.time).map(roundCandle);
}

function roundCandle(candle) {
  return {
    ...candle,
    open: round(candle.open),
    high: round(candle.high),
    low: round(candle.low),
    close: round(candle.close),
    volume: round(candle.volume),
    quoteVolume: round(candle.quoteVolume),
  };
}

function round(value) {
  if (!Number.isFinite(value)) return value;
  return Number(value.toPrecision(12));
}

async function buildPoolDataset(pool, latestBlockNumber) {
  const token0 = await call(pool.address, 'token0');
  const token1 = await call(pool.address, 'token1');
  const token0Decimals = await callErc20(token0, 'decimals');
  const token1Decimals = await callErc20(token1, 'decimals');
  const firstCodeBlock = await findFirstCodeBlock(pool.address, latestBlockNumber);
  const firstCodeTime = new Date(await getBlockTimestamp(firstCodeBlock)).toISOString();
  const logs = await scanSwapLogs(pool.address, firstCodeBlock, latestBlockNumber);
  const trades = await decodeSwaps(pool, logs, token0, token1, token0Decimals, token1Decimals);
  const candles = aggregateHourly(trades);
  const fileName = `${pool.pair.replace('/', '_')}_1H.real.jsonl`;
  const datasetPath = join(datasetDir, fileName);

  if (candles.length > 0) {
    await writeFile(datasetPath, `${candles.map((candle) => JSON.stringify(candle)).join('\n')}\n`);
  }

  return {
    datasetId: `${NETWORK}:${pool.pair.replace('/', '_')}:1H:faroswap-v3-swaps`,
    network: NETWORK,
    chainId: CHAIN_ID,
    pair: pool.pair,
    interval: '1H',
    format: 'jsonl',
    path: candles.length > 0 ? `assets/market-data/${NETWORK}/${fileName}` : null,
    poolAddress: pool.address,
    dex: 'FaroSwap',
    poolType: 'UniswapV3-compatible',
    token0,
    token1,
    token0Decimals: Number(token0Decimals),
    token1Decimals: Number(token1Decimals),
    baseAsset: { symbol: 'WPHRS', address: WPHRS, decimals: 18 },
    quoteAsset: { symbol: pool.quoteSymbol, address: pool.quoteAddress, decimals: pool.quoteDecimals },
    firstCodeBlock,
    firstCodeTime,
    latestObservedBlock: latestBlockNumber,
    swapEventCount: logs.length,
    tradeCount: trades.length,
    candleCount: candles.length,
    startTime: candles.at(0)?.time ?? null,
    endTime: candles.at(-1)?.time ?? null,
    marketEvidence: candles.length > 0,
    realMarketPrice: candles.length > 0,
    dataSource: 'Pharos Atlantic RPC eth_getLogs over FaroSwap V3 Swap events',
    limitations: candles.length > 0
      ? ['Hourly candles only include hours that had at least one Swap event.']
      : ['No Swap events were found for this pool over the scanned on-chain range.'],
  };
}

async function main() {
  await mkdir(datasetDir, { recursive: true });
  const latestBlockNumber = Number(BigInt(await rpc('eth_blockNumber')));
  const latestObservedBlockTime = new Date(await getBlockTimestamp(latestBlockNumber)).toISOString();
  const datasets = [];

  for (const pool of POOLS) {
    console.log(JSON.stringify({ status: 'scanning', pair: pool.pair, poolAddress: pool.address }));
    datasets.push(await buildPoolDataset(pool, latestBlockNumber));
  }

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'real-on-chain-swap-events',
    latestObservedBlock: latestBlockNumber,
    latestObservedBlockTime,
    datasets,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
