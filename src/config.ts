import { config as loadDotenv } from 'dotenv';

loadDotenv();

export interface AppConfig {
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel: string;
  openaiTimeoutMs: number;
  pharosRpcUrl: string;
  pharosChainId: number;
  privateKey?: string;
  port: number;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePrivateKey(value?: string): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  return raw.startsWith('0x') ? raw : `0x${raw}`;
}

export function getConfig(): AppConfig {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY?.trim(),
    openaiBaseUrl: process.env.OPENAI_BASE_URL?.trim(),
    openaiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
    openaiTimeoutMs: readNumber('OPENAI_TIMEOUT_MS', 30_000),
    pharosRpcUrl: process.env.PHAROS_RPC_URL?.trim() || 'https://atlantic.dplabs-internal.com',
    pharosChainId: readNumber('PHAROS_CHAIN_ID', 688689),
    privateKey: normalizePrivateKey(process.env.PRIVATE_KEY),
    port: readNumber('PORT', 3001),
  };
}

export const appConfig = getConfig();
