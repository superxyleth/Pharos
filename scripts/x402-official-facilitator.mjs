import { config } from 'dotenv';
import express from 'express';
import { x402Facilitator } from '@x402/core/facilitator';
import { registerExactEvmScheme } from '@x402/evm/exact/facilitator';
import { toFacilitatorEvmSigner } from '@x402/evm';
import { createWalletClient, defineChain, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

config();

const network = process.env.X402_NETWORK || 'eip155:688689';
const chainId = Number(process.env.X402_CHAIN_ID || process.env.PHAROS_CHAIN_ID || 688689);
const rpcUrl = process.env.PHAROS_RPC_URL || 'https://atlantic.dplabs-internal.com';
const port = Number(process.env.X402_FACILITATOR_PORT || 4020);
const privateKey = process.env.EVM_PRIVATE_KEY || process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error('Set EVM_PRIVATE_KEY or PRIVATE_KEY before starting the x402 facilitator.');
}

const pharosAtlantic = defineChain({
  id: chainId,
  name: 'Pharos Atlantic Testnet',
  nativeCurrency: { name: 'PHRS', symbol: 'PHRS', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  testnet: true,
});

const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
const walletClient = createWalletClient({
  account,
  chain: pharosAtlantic,
  transport: http(rpcUrl, { timeout: 30_000 }),
}).extend(publicActions);

const signer = toFacilitatorEvmSigner({
  address: account.address,
  getCode: (args) => walletClient.getCode(args),
  readContract: (args) => walletClient.readContract({ ...args, args: args.args || [] }),
  verifyTypedData: (args) => walletClient.verifyTypedData(args),
  writeContract: (args) => walletClient.writeContract({ ...args, args: args.args || [] }),
  sendTransaction: (args) => walletClient.sendTransaction(args),
  waitForTransactionReceipt: (args) => walletClient.waitForTransactionReceipt(args),
  getTransactionCount: (args) => walletClient.getTransactionCount(args),
  estimateFeesPerGas: () => walletClient.estimateFeesPerGas(),
});
const facilitator = new x402Facilitator();

registerExactEvmScheme(facilitator, {
  signer,
  networks: network,
  simulateInSettle: true,
});

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'pharos-x402-official-facilitator',
    network,
    chainId,
    rpcUrl,
    facilitatorAddress: account.address,
  });
});

app.get('/supported', (_req, res) => {
  res.json(facilitator.getSupported());
});

app.post('/verify', async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body ?? {};
    const result = await facilitator.verify(paymentPayload, paymentRequirements);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/settle', async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body ?? {};
    const result = await facilitator.settle(paymentPayload, paymentRequirements);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.listen(port, () => {
  console.log(`x402 facilitator: http://localhost:${port}`);
  console.log(`network: ${network}`);
  console.log(`facilitator address: ${account.address}`);
});
