import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const INST_ID = process.env.OKX_INST_ID ?? 'PROS-USDT';
const BAR = process.env.OKX_BAR ?? '1H';
const YEARS = Number(process.env.OKX_YEARS ?? 3);
const LIMIT = Number(process.env.OKX_LIMIT ?? 300);
const SLEEP_MS = Number(process.env.OKX_SLEEP_MS ?? 180);
const OKX_BASE = 'https://www.okx.com';
const execFileAsync = promisify(execFile);

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const datasetDir = join(rootDir, 'assets', 'market-data', 'okx');
const datasetPath = join(datasetDir, 'PROS_USDT_1H.okx.jsonl');
const manifestPath = join(rootDir, 'assets', 'market-data', 'manifest.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function okxGet(path, params) {
  const url = new URL(path, OKX_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  let payload;
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    payload = await response.json();
  } catch (error) {
    payload = JSON.parse(await powershellWebRequest(url.toString()));
  }
  if (payload.code !== '0') {
    throw new Error(`OKX API error ${payload.code}: ${payload.msg}`);
  }
  return payload.data;
}

async function powershellWebRequest(url) {
  const command = `$ProgressPreference='SilentlyContinue'; (Invoke-WebRequest -Uri ${JSON.stringify(url)} -UseBasicParsing -TimeoutSec 30).Content`;
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command], {
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout;
}

function parseOkxCandle(row) {
  const [ts, open, high, low, close, volume, volumeCcy, volumeCcyQuote, confirm] = row;
  const time = Number(ts);
  return {
    time,
    iso: new Date(time).toISOString(),
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
    volumeCcy: Number(volumeCcy),
    quoteVolume: Number(volumeCcyQuote),
    confirm: confirm === '1',
    source: 'okx-market-history-candles',
  };
}

async function loadExistingManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    return { version: 1, datasets: [] };
  }
}

async function main() {
  const endTime = Date.now();
  const targetStartTime = endTime - YEARS * 365 * 24 * 60 * 60 * 1000;
  const byTime = new Map();
  let after;
  let page = 0;

  while (true) {
    const rows = await okxGet('/api/v5/market/history-candles', {
      instId: INST_ID,
      bar: BAR,
      limit: LIMIT,
      after,
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      const candle = parseOkxCandle(row);
      if (candle.time >= targetStartTime) byTime.set(candle.time, candle);
    }

    page += 1;
    const oldest = Number(rows.at(-1)[0]);
    const newest = Number(rows[0][0]);
    console.log(JSON.stringify({
      page,
      rows: rows.length,
      newest: new Date(newest).toISOString(),
      oldest: new Date(oldest).toISOString(),
      kept: byTime.size,
    }));

    if (oldest <= targetStartTime) break;
    if (after === oldest) break;
    after = oldest;
    await sleep(SLEEP_MS);
  }

  const candles = [...byTime.values()].sort((a, b) => a.time - b.time);
  await mkdir(datasetDir, { recursive: true });
  await writeFile(datasetPath, `${candles.map((candle) => JSON.stringify(candle)).join('\n')}\n`);

  const existing = await loadExistingManifest();
  const datasetId = 'okx:PROS_USDT:1H';
  const dataset = {
    datasetId,
    source: 'okx-market-history-candles',
    exchange: 'OKX',
    market: 'spot',
    instId: INST_ID,
    pair: 'PROS/USDT',
    baseAsset: { symbol: 'PROS' },
    quoteAsset: { symbol: 'USDT' },
    interval: BAR,
    format: 'jsonl',
    path: 'assets/market-data/okx/PROS_USDT_1H.okx.jsonl',
    candleCount: candles.length,
    startTime: candles[0]?.time ?? null,
    endTime: candles.at(-1)?.time ?? null,
    generatedAt: new Date().toISOString(),
    requestedYears: YEARS,
    marketEvidence: true,
    realMarketPrice: true,
    cexComparable: true,
    mainnetProsComparable: true,
    tradeDerived: true,
    volumeAvailable: true,
    preferredForBacktest: true,
    dataSource: 'OKX public REST API /api/v5/market/history-candles',
    limitations: [
      'Coverage is limited to the history returned by OKX for PROS-USDT.',
      'The newest in-progress candle may have confirm=false.',
    ],
  };
  const otherDatasets = Array.isArray(existing.datasets)
    ? existing.datasets.filter((item) => item.datasetId !== datasetId)
    : [];
  const manifest = {
    ...existing,
    version: existing.version ?? 1,
    generatedAt: new Date().toISOString(),
    primaryMarketDatasetId: datasetId,
    datasets: [dataset, ...otherDatasets],
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(JSON.stringify({
    datasetPath,
    manifestPath,
    candleCount: candles.length,
    first: candles[0],
    last: candles.at(-1),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
