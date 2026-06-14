import { JsonRpcProvider, Wallet, formatEther } from 'ethers';
import { appConfig } from './config.js';

export interface PharosNetworkStatus {
  success: true;
  network: 'atlantic-testnet';
  rpcUrl: string;
  expectedChainId: number;
  chainId: number;
  blockNumber: number;
  nativeToken: 'PHRS';
  explorerUrl: string;
}

export function getPharosProvider(): JsonRpcProvider {
  return new JsonRpcProvider(appConfig.pharosRpcUrl, appConfig.pharosChainId);
}

export async function getPharosNetworkStatus(): Promise<PharosNetworkStatus> {
  const provider = getPharosProvider();
  const [network, blockNumber] = await Promise.all([
    provider.getNetwork(),
    provider.getBlockNumber(),
  ]);
  const chainId = Number(network.chainId);
  if (chainId !== appConfig.pharosChainId) {
    throw new Error(`Pharos RPC chainId mismatch: expected ${appConfig.pharosChainId}, got ${chainId}`);
  }
  return {
    success: true,
    network: 'atlantic-testnet',
    rpcUrl: appConfig.pharosRpcUrl,
    expectedChainId: appConfig.pharosChainId,
    chainId,
    blockNumber,
    nativeToken: 'PHRS',
    explorerUrl: 'https://atlantic.pharosscan.xyz/',
  };
}

export function getConfiguredWallet(): Wallet {
  if (!appConfig.privateKey) {
    throw new Error('PRIVATE_KEY is not configured. Add it to .env for wallet readiness checks.');
  }
  return new Wallet(appConfig.privateKey, getPharosProvider());
}

export async function getWalletInfo(params: {
  includeAddress?: boolean;
  includeBalance?: boolean;
} = {}) {
  const wallet = getConfiguredWallet();
  const result: Record<string, unknown> = {
    success: true,
    network: 'atlantic-testnet',
    chainId: appConfig.pharosChainId,
    walletConfigured: true,
    readOnly: true,
    privateKeyReturned: false,
    nativeToken: 'PHRS',
    note: 'Wallet info is optional and read-only. The private key is used locally only and is never returned by this tool.',
  };
  if (params.includeAddress) {
    result.address = wallet.address;
    result.addressPreview = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
  }
  if (params.includeBalance) {
    const balanceWei = await wallet.provider!.getBalance(wallet.address);
    result.balance = formatEther(balanceWei);
    result.balanceWei = balanceWei.toString();
  }
  return result;
}
