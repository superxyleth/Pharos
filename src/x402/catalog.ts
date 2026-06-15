import { createHash } from 'node:crypto';
import { appConfig } from '../config.js';

export interface X402Product {
  id: string;
  name: string;
  description: string;
  resource: string;
  method: 'GET' | 'POST';
  amount: string;
  asset: string;
  output: string;
  phase1Safe: boolean;
}

export interface X402QuoteInput {
  productId: string;
  resource?: string;
  method?: 'GET' | 'POST';
}

export interface X402ReceiptInput {
  quoteId?: string;
  paymentPayload?: unknown;
  receipt?: unknown;
}

const products: X402Product[] = [
  {
    id: 'paid-full-artifact',
    name: 'Paid full strategy artifact',
    description: 'Return a full strategy artifact bundle after payment verification. Execution remains disabled.',
    resource: '/paid/artifacts/:artifactId',
    method: 'GET',
    amount: appConfig.x402.defaultAmount,
    asset: appConfig.x402.defaultAsset,
    output: 'Full artifact metadata, code hash, risk summary, and reusable schema reference.',
    phase1Safe: true,
  },
  {
    id: 'paid-quant-report',
    name: 'Paid quant research report',
    description: 'Return an extended AI-backed research report after payment verification. No transactions are broadcast.',
    resource: '/paid/quant-report',
    method: 'POST',
    amount: appConfig.x402.defaultAmount,
    asset: appConfig.x402.defaultAsset,
    output: 'Extended strategy research report and Phase 2 dry-run planning notes.',
    phase1Safe: true,
  },
  {
    id: 'paid-dry-run-plan',
    name: 'Paid Phase 2 dry-run plan',
    description: 'Return a guarded dry-run execution plan template for a separate future execution Skill.',
    resource: '/paid/dry-run-plan',
    method: 'POST',
    amount: appConfig.x402.defaultAmount,
    asset: appConfig.x402.defaultAsset,
    output: 'Dry-run plan only. It is not execution authorization.',
    phase1Safe: true,
  },
];

export function getX402Status() {
  return {
    success: true,
    enabled: appConfig.x402.enabled,
    mode: appConfig.x402.enabled ? 'payment-gateway-ready' : 'disabled-review-safe',
    protocol: 'x402',
    network: appConfig.x402.network,
    chainId: appConfig.x402.chainId,
    receiverAddressConfigured: Boolean(appConfig.x402.receiverAddress),
    facilitatorUrlConfigured: Boolean(appConfig.x402.facilitatorUrl),
    defaultAsset: appConfig.x402.defaultAsset,
    defaultAmount: appConfig.x402.defaultAmount,
    requireConfirmation: appConfig.x402.requireConfirmation,
    devAcceptUnsignedReceipt: appConfig.x402.devAcceptUnsignedReceipt,
    settlementBroadcastEnabled: false,
    onChainWritesEnabled: false,
    note: 'x402 is optional and disabled by default. This Skill exposes quote and verification scaffolding only; it does not broadcast payments or execute trades.',
  };
}

export function getX402Products() {
  return {
    success: true,
    enabled: appConfig.x402.enabled,
    products,
    safety: {
      paidRoutesAreOptional: true,
      coreMcpReviewUnaffected: true,
      settlementBroadcastEnabled: false,
      onChainWritesEnabled: false,
    },
  };
}

export function createX402Quote(input: X402QuoteInput) {
  const product = products.find((item) => item.id === input.productId);
  if (!product) {
    throw new Error(`Unknown x402 product: ${input.productId}`);
  }

  const resource = input.resource ?? product.resource;
  const method = input.method ?? product.method;
  const quoteId = hashQuote([product.id, resource, method, appConfig.x402.network, product.amount, product.asset].join('|'));

  return {
    success: true,
    enabled: appConfig.x402.enabled,
    quoteId,
    product,
    paymentRequired: true,
    httpStatus: 402,
    paymentHeader: 'X-PAYMENT',
    paymentResponseHeader: 'X-PAYMENT-RESPONSE',
    requirements: {
      scheme: 'exact',
      network: appConfig.x402.network,
      chainId: appConfig.x402.chainId,
      resource,
      method,
      payTo: appConfig.x402.receiverAddress ?? 'configure X402_RECEIVER_ADDRESS',
      asset: product.asset,
      maxAmountRequired: product.amount,
      facilitatorUrl: appConfig.x402.facilitatorUrl ?? 'configure X402_FACILITATOR_URL',
      description: product.description,
      mimeType: 'application/json',
      output: product.output,
    },
    safety: {
      phase1Safe: true,
      settlementBroadcastEnabled: false,
      onChainWritesEnabled: false,
      privateKeyRequired: false,
      note: 'The quote describes payment requirements only. This Skill does not settle or broadcast payments.',
    },
  };
}

export function verifyX402Receipt(input: X402ReceiptInput) {
  const hasPayload = Boolean(input.paymentPayload ?? input.receipt);
  const devAccepted = appConfig.x402.devAcceptUnsignedReceipt && hasPayload && Boolean(input.quoteId);

  return {
    success: true,
    verified: devAccepted,
    mode: devAccepted ? 'dev-unsigned-receipt-accepted' : 'verification-scaffold-only',
    quoteId: input.quoteId,
    settlementBroadcastEnabled: false,
    onChainWritesEnabled: false,
    reason: devAccepted
      ? 'Unsigned receipt accepted only because X402_DEV_ACCEPT_UNSIGNED_RECEIPT=true.'
      : 'No settlement verification is performed by this Phase 1 Skill. Use an official x402 facilitator or a separate payment Skill for production settlement.',
    nextStep: devAccepted
      ? 'The paid route may return demo content, but no on-chain payment was settled by this Skill.'
      : 'Return 402 payment requirements or delegate verification to a separate x402 payment service.',
  };
}

function hashQuote(input: string) {
  return `x402-${createHash('sha256').update(input).digest('hex').slice(0, 16)}`;
}
