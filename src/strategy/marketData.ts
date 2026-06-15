import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Candle } from './types.js';

export interface MarketDataset {
  datasetId: string;
  source?: string;
  exchange?: string;
  market?: string;
  instId?: string;
  pair?: string;
  interval?: string;
  format?: string;
  path: string;
  wrappedAsset?: {
    symbol?: string;
  };
  underlyingAsset?: {
    symbol?: string;
  };
  candleCount?: number;
  startTime?: number;
  endTime?: number;
  marketEvidence?: boolean;
  realMarketPrice?: boolean;
  preferredForBacktest?: boolean;
  dataSource?: string;
  limitations?: string[];
}

interface MarketManifest {
  primaryMarketDatasetId?: string;
  datasets?: MarketDataset[];
}

export interface LoadedMarketCandles {
  candles: Candle[];
  dataset: MarketDataset;
}

export function loadPreferredMarketCandles(symbol?: string): LoadedMarketCandles | null {
  const manifest = loadMarketManifest();
  if (!manifest?.datasets?.length) return null;

  const normalizedSymbol = normalizeSymbol(symbol);
  const preferred = manifest.datasets.find((dataset) => dataset.datasetId === manifest.primaryMarketDatasetId);
  const candidates = [
    preferred,
    ...manifest.datasets.filter((dataset) => dataset.datasetId !== preferred?.datasetId),
  ].filter(Boolean) as MarketDataset[];

  const dataset = candidates.find((item) => isUsableMarketDataset(item, normalizedSymbol));
  if (!dataset?.path) return null;

  const fullPath = join(process.cwd(), dataset.path);
  if (!existsSync(fullPath)) return null;

  const candles = readMarketCandles(fullPath, dataset);

  return candles.length ? { candles, dataset } : null;
}

function readMarketCandles(fullPath: string, dataset: MarketDataset): Candle[] {
  const raw = readFileSync(fullPath, 'utf8').trim();
  if (!raw) return [];

  const format = (dataset.format ?? '').toLowerCase();
  if (format === 'csv' || fullPath.toLowerCase().endsWith('.csv')) {
    return parseCsvCandles(raw);
  }

  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Candle)
    .filter((candle) => Number.isFinite(candle.time) && Number.isFinite(candle.close));
}

function parseCsvCandles(raw: string): Candle[] {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split(',').map((item) => item.trim()) ?? [];
  const index = (name: string) => header.indexOf(name);
  const timeIndex = index('timestamp');
  const openIndex = index('open');
  const highIndex = index('high');
  const lowIndex = index('low');
  const closeIndex = index('close');
  const volumeIndex = index('volume');

  if ([timeIndex, openIndex, highIndex, lowIndex, closeIndex].some((item) => item < 0)) return [];

  return lines
    .map((line) => {
      const columns = line.split(',');
      return {
        time: Number(columns[timeIndex]),
        open: Number(columns[openIndex]),
        high: Number(columns[highIndex]),
        low: Number(columns[lowIndex]),
        close: Number(columns[closeIndex]),
        volume: volumeIndex >= 0 ? Number(columns[volumeIndex]) : 0,
      };
    })
    .filter((candle) => Number.isFinite(candle.time) && Number.isFinite(candle.close));
}

export function summarizePreferredMarketData(symbol = 'WBTC') {
  const loaded = loadPreferredMarketCandles(symbol);
  if (!loaded) {
    return {
      available: false,
      symbol,
      note: 'No preferred local market dataset is available.',
    };
  }
  const first = loaded.candles[0];
  const last = loaded.candles.at(-1)!;
  return {
    available: true,
    symbol,
    datasetId: loaded.dataset.datasetId,
    pair: loaded.dataset.pair,
    exchange: loaded.dataset.exchange,
    interval: loaded.dataset.interval,
    candleCount: loaded.candles.length,
    startTime: first.time,
    endTime: last.time,
    latestClose: last.close,
    marketEvidence: Boolean(loaded.dataset.marketEvidence),
    dataSource: loaded.dataset.dataSource,
    limitations: loaded.dataset.limitations ?? [],
  };
}

function loadMarketManifest(): MarketManifest | null {
  const manifestPath = join(process.cwd(), 'assets', 'market-data', 'manifest.json');
  if (!existsSync(manifestPath)) return null;
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as MarketManifest;
}

function isUsableMarketDataset(dataset: MarketDataset, symbol: string | null): boolean {
  if (!dataset.marketEvidence || !dataset.realMarketPrice || !dataset.path) return false;
  if (!symbol) return Boolean(dataset.preferredForBacktest);
  const pair = (dataset.pair ?? '').toUpperCase();
  const datasetId = dataset.datasetId.toUpperCase();
  const instId = (dataset.instId ?? '').toUpperCase();
  const wrappedAsset = (dataset.wrappedAsset?.symbol ?? '').toUpperCase();
  const underlyingAsset = (dataset.underlyingAsset?.symbol ?? '').toUpperCase();
  return (
    pair.startsWith(`${symbol}/`) ||
    datasetId.includes(`${symbol}_`) ||
    datasetId.includes(`${symbol}-`) ||
    instId.startsWith(`${symbol}-`) ||
    wrappedAsset === symbol ||
    underlyingAsset === symbol
  );
}

function normalizeSymbol(symbol?: string): string | null {
  if (!symbol) return null;
  return symbol.split(/[/-]/)[0].trim().toUpperCase() || null;
}
