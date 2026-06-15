import { config } from 'dotenv';
import express from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';

config();

const network = process.env.X402_NETWORK || 'eip155:688689';
const chainId = Number(process.env.X402_CHAIN_ID || process.env.PHAROS_CHAIN_ID || 688689);
const port = Number(process.env.X402_PAID_SERVER_PORT || 4021);
const facilitatorUrl = process.env.X402_FACILITATOR_URL || 'http://localhost:4020';
const payTo = process.env.X402_RECEIVER_ADDRESS;
const price = process.env.X402_DEFAULT_AMOUNT || '0.01';
const assetAddress = process.env.X402_ASSET_ADDRESS || process.env.X402_DEFAULT_ASSET;
const assetName = process.env.X402_ASSET_NAME || 'USDC';
const assetVersion = process.env.X402_ASSET_VERSION || '2';
const assetDecimals = Number(process.env.X402_ASSET_DECIMALS || 6);
const assetTransferMethod = process.env.X402_ASSET_TRANSFER_METHOD;

if (!payTo || !/^0x[0-9a-fA-F]{40}$/.test(payTo)) {
  throw new Error('Set X402_RECEIVER_ADDRESS to a valid receiver address.');
}

if (!assetAddress || !/^0x[0-9a-fA-F]{40}$/.test(assetAddress)) {
  throw new Error(
    'Official x402 exact EVM settlement requires an ERC20 token address. Set X402_ASSET_ADDRESS to a test ERC20 such as the Pharos x402 sample token.',
  );
}

const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
const resourceServer = new x402ResourceServer(facilitatorClient);
const evmScheme = new ExactEvmScheme();

evmScheme.registerMoneyParser(async (amount, requestNetwork) => {
  if (requestNetwork !== network) return null;
  return {
    amount: Math.round(amount * 10 ** assetDecimals).toString(),
    asset: assetAddress,
    extra: {
      token: assetName,
      name: assetName,
      version: assetVersion,
      ...(assetTransferMethod ? { assetTransferMethod } : {}),
    },
  };
});

resourceServer.register(network, evmScheme);

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'pharos-x402-official-paid-server',
    network,
    chainId,
    facilitatorUrl,
    payTo,
    price,
    assetAddress,
    assetName,
    assetTransferMethod,
    assetDecimals,
  });
});

app.use(
  paymentMiddleware(
    {
      'GET /data': {
        accepts: {
          scheme: 'exact',
          price,
          network,
          payTo,
        },
        description: 'Pharos x402 paid data endpoint',
        mimeType: 'application/json',
      },
      'POST /paid/quant-report': {
        accepts: {
          scheme: 'exact',
          price,
          network,
          payTo,
        },
        description: 'Pharos x402 paid quant report endpoint',
        mimeType: 'application/json',
      },
    },
    resourceServer,
  ),
);

app.get('/data', (_req, res) => {
  res.json({
    success: true,
    paid: true,
    message: 'Hello from the official x402 protected endpoint.',
    timestamp: Date.now(),
  });
});

app.post('/paid/quant-report', (req, res) => {
  res.json({
    success: true,
    paid: true,
    request: req.body ?? {},
    report: {
      title: 'Official x402 paid quant report',
      network,
      assetAddress,
      note: 'This endpoint is protected by @x402/express middleware.',
    },
  });
});

app.listen(port, () => {
  console.log(`x402 paid server: http://localhost:${port}`);
  console.log(`facilitator: ${facilitatorUrl}`);
  console.log(`network: ${network}`);
  console.log(`asset: ${assetName} ${assetAddress}`);
  console.log(`asset transfer method: ${assetTransferMethod || 'default'}`);
  console.log(`payTo: ${payTo}`);
});
