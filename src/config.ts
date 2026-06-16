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
  x402: X402Config;
}

export interface X402Config {
  enabled: boolean;
  network: string;
  chainId: number;
  receiverAddress?: string;
  defaultAsset: string;
  defaultAmount: string;
  requireConfirmation: boolean;
  devAcceptUnsignedReceipt: boolean;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw);
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
    openaiTimeoutMs: readNumber('OPENAI_TIMEOUT_MS', 90_000),
    pharosRpcUrl: process.env.PHAROS_RPC_URL?.trim() || 'https://atlantic.dplabs-internal.com',
    pharosChainId: readNumber('PHAROS_CHAIN_ID', 688689),
    privateKey: normalizePrivateKey(process.env.PRIVATE_KEY),
    port: readNumber('PORT', 3001),
    x402: {
      enabled: readBoolean('X402_ENABLED', false),
      network: process.env.X402_NETWORK?.trim() || 'eip155:688689',
      chainId: readNumber('X402_CHAIN_ID', readNumber('PHAROS_CHAIN_ID', 688689)),
      receiverAddress: process.env.X402_RECEIVER_ADDRESS?.trim() || process.env.PAY_TO_ADDRESS?.trim(),
      defaultAsset: process.env.X402_DEFAULT_ASSET?.trim() || 'PHRS',
      defaultAmount: process.env.X402_DEFAULT_AMOUNT?.trim() || '0.01',
      requireConfirmation: readBoolean('X402_REQUIRE_CONFIRMATION', true),
      devAcceptUnsignedReceipt: readBoolean('X402_DEV_ACCEPT_UNSIGNED_RECEIPT', false),
    },
  };
}

export const appConfig = getConfig();
