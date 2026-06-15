import type { Express, Request, Response } from 'express';
import { appConfig } from '../config.js';
import { createX402Quote, getX402Products, getX402Status, verifyX402Receipt } from './catalog.js';

function readRequestBody(req: Request) {
  return req.body ?? {};
}

function sendPaymentRequired(res: Response, quote: ReturnType<typeof createX402Quote>) {
  return res.status(402).json({
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
    message: 'x402 payment gateway is disabled by default. Enable it with X402_ENABLED=true and configure receiver/facilitator details.',
    status: getX402Status(),
  });
}

function canServeDemoReceipt(req: Request) {
  const header = req.header('x-x402-demo-receipt');
  return appConfig.x402.devAcceptUnsignedReceipt && header === 'accepted';
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
        productId: String(body.productId ?? ''),
        resource: body.resource ? String(body.resource) : undefined,
        method: body.method === 'POST' ? 'POST' : 'GET',
      });
      res.status(200).json(quote);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post('/x402/verify', (req, res) => {
    const body = readRequestBody(req);
    res.json(
      verifyX402Receipt({
        quoteId: body.quoteId ? String(body.quoteId) : undefined,
        paymentPayload: body.paymentPayload,
        receipt: body.receipt,
      }),
    );
  });

  app.get('/paid/artifacts/:artifactId', (req, res) => {
    const quote = createX402Quote({
      productId: 'paid-full-artifact',
      resource: `/paid/artifacts/${req.params.artifactId}`,
      method: 'GET',
    });

    if (!canServeDemoReceipt(req)) {
      return sendPaymentRequired(res, quote);
    }

    return res.json({
      success: true,
      paid: true,
      artifactId: req.params.artifactId,
      message: 'Demo paid artifact content. This route is protected by x402 scaffolding only and does not settle on-chain.',
      x402: quote,
    });
  });

  app.post('/paid/quant-report', (req, res) => {
    const quote = createX402Quote({
      productId: 'paid-quant-report',
      resource: '/paid/quant-report',
      method: 'POST',
    });

    if (!canServeDemoReceipt(req)) {
      return sendPaymentRequired(res, quote);
    }

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

  app.post('/paid/dry-run-plan', (req, res) => {
    const quote = createX402Quote({
      productId: 'paid-dry-run-plan',
      resource: '/paid/dry-run-plan',
      method: 'POST',
    });

    if (!canServeDemoReceipt(req)) {
      return sendPaymentRequired(res, quote);
    }

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
