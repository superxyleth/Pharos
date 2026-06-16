import type { Express, Request, Response } from 'express';
import { appConfig } from '../config.js';
import {
  createX402Quote,
  decodeBase64Json,
  encodeBase64Json,
  getX402Products,
  getX402Status,
  verifyX402Receipt,
} from './catalog.js';

function readRequestBody(req: Request) {
  return req.body ?? {};
}

function sendPaymentRequired(res: Response, quote: ReturnType<typeof createX402Quote>) {
  return res
    .status(402)
    .set('PAYMENT-REQUIRED', quote.paymentRequiredEncoded)
    .json({
      success: false,
      error: 'payment_required',
      paymentRequired: true,
      x402: quote,
    });
}

function sendServiceUnavailable(res: Response) {
  return res.status(503).json({
    success: false,
    error: 'x402_disabled',
    message: 'x402 payment gateway is disabled by default. Enable it with X402_ENABLED=true and configure X402_RECEIVER_ADDRESS for public PHRS receipt verification.',
    status: getX402Status(),
  });
}

function canServeDemoReceipt(req: Request) {
  const header = req.header('x-x402-demo-receipt');
  return appConfig.x402.devAcceptUnsignedReceipt && header === 'accepted';
}

function readPaymentSignature(req: Request) {
  const header = req.header('PAYMENT-SIGNATURE');
  return decodeBase64Json(header) ?? header;
}

function normalizeQuoteMethod(value: unknown): 'GET' | 'POST' | undefined {
  if (typeof value !== 'string') return undefined;
  const method = value.toUpperCase();
  if (method === 'GET' || method === 'POST') return method;
  return undefined;
}

async function verifyPaidRequest(req: Request, quote: ReturnType<typeof createX402Quote>) {
  if (canServeDemoReceipt(req)) {
    return verifyX402Receipt({
      quoteId: quote.quoteId,
      receipt: { demo: true },
      paymentRequirements: quote.requirements,
    });
  }

  const paymentPayload = readPaymentSignature(req);
  if (!paymentPayload) {
    return undefined;
  }

  return verifyX402Receipt({
    quoteId: quote.quoteId,
    paymentPayload,
    paymentRequirements: quote.requirements,
  });
}

function attachPaymentResponse(res: Response, verification: Awaited<ReturnType<typeof verifyX402Receipt>>) {
  res.set(
    'PAYMENT-RESPONSE',
    encodeBase64Json({
      verified: verification.verified,
      mode: verification.mode,
      quoteId: verification.quoteId,
      settlementBroadcastEnabled: verification.settlementBroadcastEnabled,
      onChainWritesEnabled: verification.onChainWritesEnabled,
      payment: verification.payment,
    }),
  );
}

export function registerX402Routes(app: Express) {
  app.get('/x402/status', (_req, res) => {
    res.json(getX402Status());
  });

  app.get('/x402/products', (_req, res) => {
    res.json(getX402Products());
  });

  app.post('/x402/quote', (req, res) => {
    try {
      const body = readRequestBody(req);
      const quote = createX402Quote({
        productId: body.productId ? String(body.productId) : undefined,
        resource: body.resource ? String(body.resource) : undefined,
        method: normalizeQuoteMethod(body.method),
      });
      res.status(200).json(quote);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post('/x402/verify', async (req, res) => {
    const body = readRequestBody(req);
    res.json(
      await verifyX402Receipt({
        quoteId: body.quoteId ? String(body.quoteId) : undefined,
        paymentPayload: body.paymentPayload,
        paymentRequirements: body.paymentRequirements,
        receipt: body.receipt,
      }),
    );
  });

  app.get('/paid/artifacts/:artifactId', async (req, res) => {
    const quote = createX402Quote({
      productId: 'paid-full-artifact',
      resource: `/paid/artifacts/${req.params.artifactId}`,
      method: 'GET',
    });

    const verification = await verifyPaidRequest(req, quote);
    if (!verification?.verified) {
      return sendPaymentRequired(res, quote);
    }
    attachPaymentResponse(res, verification);

    return res.json({
      success: true,
      paid: true,
      artifactId: req.params.artifactId,
      message: 'Demo paid artifact content for the Phase 2 paid-access extension layer. This route does not settle on-chain or execute trades.',
      x402: quote,
    });
  });

  app.post('/paid/quant-report', async (req, res) => {
    const quote = createX402Quote({
      productId: 'paid-quant-report',
      resource: '/paid/quant-report',
      method: 'POST',
    });

    const verification = await verifyPaidRequest(req, quote);
    if (!verification?.verified) {
      return sendPaymentRequired(res, quote);
    }
    attachPaymentResponse(res, verification);

    const body = readRequestBody(req);
    return res.json({
      success: true,
      paid: true,
      request: body,
      report: {
        title: 'Paid research report placeholder',
        note: 'No live trading, settlement, or on-chain writes were performed.',
      },
      x402: quote,
    });
  });

  app.post('/paid/dry-run-plan', async (req, res) => {
    const quote = createX402Quote({
      productId: 'paid-dry-run-plan',
      resource: '/paid/dry-run-plan',
      method: 'POST',
    });

    const verification = await verifyPaidRequest(req, quote);
    if (!verification?.verified) {
      return sendPaymentRequired(res, quote);
    }
    attachPaymentResponse(res, verification);

    const body = readRequestBody(req);
    return res.json({
      success: true,
      paid: true,
      plan: {
        decision: 'DRY_RUN_PLAN_ONLY',
        broadcastTransactions: false,
        onChainWrites: false,
        requiresUserConfirmation: true,
        summary: 'Guarded dry-run plan placeholder for a separate Phase 2 execution Skill.',
      },
      request: body,
      x402: quote,
    });
  });
}
