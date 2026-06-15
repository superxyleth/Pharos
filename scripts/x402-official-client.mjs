import { config } from 'dotenv';
import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { toClientEvmSigner } from '@x402/evm';
import { createPublicClient, defineChain, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

config();

const network = process.env.X402_NETWORK || 'eip155:688689';
const chainId = Number(process.env.X402_CHAIN_ID || process.env.PHAROS_CHAIN_ID || 688689);
const rpcUrl = process.env.PHAROS_RPC_URL || 'https://atlantic.dplabs-internal.com';
const privateKey = process.env.EVM_PRIVATE_KEY || process.env.PRIVATE_KEY;
const url = process.argv[2] || process.env.X402_TEST_URL || 'http://localhost:4021/data';

if (!privateKey) {
  throw new Error('Set EVM_PRIVATE_KEY or PRIVATE_KEY before running the x402 client.');
}

const pharosAtlantic = defineChain({
  id: chainId,
  name: 'Pharos Atlantic Testnet',
  nativeCurrency: { name: 'PHRS', symbol: 'PHRS', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  testnet: true,
});

const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
const publicClient = createPublicClient({
  chain: pharosAtlantic,
  transport: http(rpcUrl, { timeout: 30_000 }),
});
const signer = toClientEvmSigner(account, publicClient);
const client = new x402Client();

registerExactEvmScheme(client, {
  signer,
  networks: [network],
  schemeOptions: {
    [chainId]: { rpcUrl },
  },
});

const fetchWithPayment = wrapFetchWithPayment(fetch, client);

console.log(`request: ${url}`);
console.log(`payer: ${account.address}`);
console.log(`network: ${network}`);

const response = await fetchWithPayment(url, {
  method: url.includes('/paid/quant-report') ? 'POST' : 'GET',
  headers: url.includes('/paid/quant-report') ? { 'content-type': 'application/json' } : undefined,
  body: url.includes('/paid/quant-report') ? JSON.stringify({ symbol: 'PHRS', period: '1W' }) : undefined,
});

const text = await response.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  data = text;
}

const paymentResponseHeader = response.headers.get('PAYMENT-RESPONSE');
const paymentResponse = paymentResponseHeader ? decodePaymentResponseHeader(paymentResponseHeader) : undefined;

console.log(
  JSON.stringify(
    {
      status: response.status,
      ok: response.ok,
      paymentResponse,
      data,
    },
    null,
    2,
  ),
);

if (!response.ok) {
  process.exit(1);
}
