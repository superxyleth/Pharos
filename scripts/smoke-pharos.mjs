import { getPharosNetworkStatus, getWalletInfo } from '../src/pharos.ts';

const status = await getPharosNetworkStatus();
if (status.chainId !== 688689) {
  throw new Error(`Expected chainId 688689, got ${status.chainId}`);
}

let wallet = null;
try {
  wallet = await getWalletInfo();
} catch (error) {
  wallet = { skipped: true, reason: error instanceof Error ? error.message : String(error) };
}

console.log(JSON.stringify({ ok: true, status, wallet }, null, 2));
