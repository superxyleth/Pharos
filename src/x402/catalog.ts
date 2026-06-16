import { createHash } from 'node:crypto';
import { formatEther, getAddress, parseEther } from 'ethers';
import { appConfig } from '../config.js';
import { getPharosProvider } from '../pharos.js';

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
  productId?: string;
  resource?: string;
  method?: 'GET' | 'POST';
}

export interface X402ReceiptInput {
  quoteId?: string;
  paymentPayload?: unknown;
  receipt?: unknown;
  paymentRequirements?: unknown;
}

export interface X402VerificationResult {
  success: true;
  verified: boolean;
  mode: string;
  quoteId?: string;
  settlementBroadcastEnabled: false;
  onChainWritesEnabled: false;
  facilitator?: {
    url: string;
    delegated: boolean;
    response?: unknown;
    error?: string;
  };
  payment?: {
    asset: string;
    transactionHash: string;
    from: string;
    to: string;
    value: string;
    valueWei: string;
    requiredValue: string;
    requiredValueWei: string;
    blockNumber: number;
    binding: string;
    replayProtected: boolean;
  };
  reason: string;
  nextStep: string;
}

const ACTIVE_PAYMENT_MODE = 'native-phrs-receipt';
const ACTIVE_ASSET = 'PHRS';
const ACTIVE_SETTLEMENT = 'server-verifies-existing-onchain-transfer';
const PHAROS_EXPLORER_TX_BASE_URL = 'https://atlantic.pharosscan.xyz/tx';

const products: X402Product[] = [
  {
    id: 'paid-full-artifact',
    name: 'Paid full strategy artifact',
    description: 'Return a full strategy artifact bundle after payment verification. Execution remains disabled.',
    resource: '/paid/artifacts/:artifactId',
    method: 'GET',
    amount: appConfig.x402.defaultAmount,
    asset: ACTIVE_ASSET,
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
    asset: ACTIVE_ASSET,
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
    asset: ACTIVE_ASSET,
    output: 'Dry-run plan only. It is not execution authorization.',
    phase1Safe: true,
  },
];

const nativePhRsPaymentUseByTx = new Map<string, string>();

export function getX402Status() {
  return {
    success: true,
    enabled: appConfig.x402.enabled,
    mode: appConfig.x402.enabled ? 'public-phrs-payment-gateway-ready' : 'disabled-review-safe',
    protocol: 'x402',
    network: appConfig.x402.network,
    chainId: appConfig.x402.chainId,
    receiverAddressConfigured: Boolean(appConfig.x402.receiverAddress),
    facilitatorUrlConfigured: false,
    defaultAsset: ACTIVE_ASSET,
    defaultAmount: appConfig.x402.defaultAmount,
    activePaymentMode: ACTIVE_PAYMENT_MODE,
    activeAsset: ACTIVE_ASSET,
    activeSettlement: ACTIVE_SETTLEMENT,
    verificationMode: ACTIVE_PAYMENT_MODE,
    paymentInstructions: {
      network: 'Pharos Atlantic Testnet',
      asset: ACTIVE_ASSET,
      explorerTxBaseUrl: PHAROS_EXPLORER_TX_BASE_URL,
      requiredHeader: 'PAYMENT-SIGNATURE',
      payload: {
        txHash: '0x...',
        payer: '0x... optional payer address',
      },
      note: 'Submit a base64 JSON PAYMENT-SIGNATURE containing a confirmed Pharos Atlantic native PHRS transfer txHash. The server verifies the existing public-chain transaction receipt.',
    },
    paymentRequiredHeader: 'PAYMENT-REQUIRED',
    paymentSignatureHeader: 'PAYMENT-SIGNATURE',
    paymentResponseHeader: 'PAYMENT-RESPONSE',
    requireConfirmation: appConfig.x402.requireConfirmation,
    devAcceptUnsignedReceipt: appConfig.x402.devAcceptUnsignedReceipt,
    settlementBroadcastEnabled: false,
    onChainWritesEnabled: false,
    note: 'x402 paid access is public-network PHRS receipt verification only. This service never signs or broadcasts payments; it verifies confirmed Pharos Atlantic transfers supplied by the payer.',
  };
}

export function getX402Products() {
  return {
    success: true,
    enabled: appConfig.x402.enabled,
    activePaymentMode: ACTIVE_PAYMENT_MODE,
    activeAsset: ACTIVE_ASSET,
    activeSettlement: ACTIVE_SETTLEMENT,
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
  const product = resolveX402Product(input);

  const resource = input.resource ?? product.resource;
  const method = input.method ?? product.method;
  const quoteId = hashQuote([product.id, resource, method, appConfig.x402.network, product.amount, ACTIVE_ASSET].join('|'));

  const requirements = {
    scheme: 'exact',
    network: appConfig.x402.network,
    chainId: appConfig.x402.chainId,
    resource,
    method,
    payTo: appConfig.x402.receiverAddress ?? 'configure X402_RECEIVER_ADDRESS',
    asset: ACTIVE_ASSET,
    price: product.amount,
    maxAmountRequired: product.amount,
    facilitatorUrl: null,
    verificationMode: ACTIVE_PAYMENT_MODE,
    activeSettlement: ACTIVE_SETTLEMENT,
    paymentSignatureFormat: 'base64-json',
    paymentSignaturePayload: {
      txHash: '0x...',
      payer: '0x... optional payer address',
    },
    verificationNote: 'Send native PHRS on Pharos Atlantic to payTo, then submit the confirmed txHash in PAYMENT-SIGNATURE.',
    explorerTxBaseUrl: PHAROS_EXPLORER_TX_BASE_URL,
    description: product.description,
    mimeType: 'application/json',
    output: product.output,
  };
  const paymentRequiredPayload = {
    x402Version: 1,
    accepts: [requirements],
    error: 'payment_required',
  };

  return {
    success: true,
    enabled: appConfig.x402.enabled,
    quoteId,
    product,
    paymentRequired: true,
    httpStatus: 402,
    paymentRequiredHeader: 'PAYMENT-REQUIRED',
    paymentSignatureHeader: 'PAYMENT-SIGNATURE',
    paymentResponseHeader: 'PAYMENT-RESPONSE',
    paymentRequiredEncoded: encodeBase64Json(paymentRequiredPayload),
    paymentRequiredPayload,
    requirements,
    activePaymentMode: ACTIVE_PAYMENT_MODE,
    activeAsset: ACTIVE_ASSET,
    activeSettlement: ACTIVE_SETTLEMENT,
    safety: {
      phase1Safe: true,
      settlementBroadcastEnabled: false,
      onChainWritesEnabled: false,
      privateKeyRequired: false,
      note: 'The quote requires an existing public Pharos Atlantic PHRS transfer receipt. This Skill verifies the receipt and never settles, signs, broadcasts payments, or executes trades.',
    },
  };
}

function resolveX402Product(input: X402QuoteInput) {
  const productId = input.productId?.trim();
  if (productId) {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      throw new Error(`Unknown x402 product: ${productId}`);
    }
    return product;
  }

  const resource = input.resource?.trim();
  if (!resource) {
    throw new Error('x402 quote requires either productId or resource + method.');
  }

  const method = input.method ?? 'GET';
  const product = products.find((item) => item.method === method && matchesProductResource(item.resource, resource));
  if (!product) {
    throw new Error(`Unknown x402 product for ${method} ${resource}`);
  }
  return product;
}

function matchesProductResource(pattern: string, resource: string) {
  const patternParts = pattern.split('/').filter(Boolean);
  const resourceParts = resource.split('/').filter(Boolean);
  if (patternParts.length !== resourceParts.length) return false;

  return patternParts.every((part, index) => part.startsWith(':') || part === resourceParts[index]);
}

export async function verifyX402Receipt(input: X402ReceiptInput): Promise<X402VerificationResult> {
  const hasPayload = Boolean(input.paymentPayload ?? input.receipt);
  const devAccepted = appConfig.x402.devAcceptUnsignedReceipt && hasPayload && Boolean(input.quoteId);

  const nativePhRsVerification = await verifyNativePhRsReceipt(input);
  if (nativePhRsVerification) {
    return nativePhRsVerification;
  }

  return {
    success: true,
    verified: devAccepted,
    mode: devAccepted ? 'dev-unsigned-receipt-accepted' : 'native-phrs-receipt-required',
    quoteId: input.quoteId,
    settlementBroadcastEnabled: false,
    onChainWritesEnabled: false,
    reason: devAccepted
      ? 'Unsigned receipt accepted only because X402_DEV_ACCEPT_UNSIGNED_RECEIPT=true.'
      : 'No valid confirmed Pharos Atlantic PHRS transfer txHash was supplied in PAYMENT-SIGNATURE.',
    nextStep: devAccepted
      ? 'The paid route may return demo content, but no on-chain payment was settled by this Skill.'
      : 'Send native PHRS to the quoted payTo address, then submit PAYMENT-SIGNATURE as base64 JSON: {"txHash":"0x...","payer":"0x... optional"}.',
  };
}

async function verifyNativePhRsReceipt(input: X402ReceiptInput): Promise<X402VerificationResult | undefined> {
  const payload = readPaymentRecord(input.paymentPayload) ?? readPaymentRecord(input.receipt);
  const requirements = readRecord(input.paymentRequirements);
  if (!payload || !requirements) return undefined;

  const asset = String(requirements.asset ?? '').toUpperCase();
  if (asset !== 'PHRS') return undefined;

  const transactionHash = readTransactionHash(payload);
  if (!transactionHash) return undefined;

  const expectedTo = readAddress(requirements.payTo);
  const requiredAmount = readRequiredPhRsAmount(requirements);
  const binding = paymentBinding(input.quoteId, requirements);
  if (!expectedTo || requiredAmount === undefined) {
    return nativePhRsFailure(input.quoteId, transactionHash, 'native-phrs-receipt-invalid-requirements', binding);
  }

  const expectedPayer = readAddress(payload.payer ?? payload.from);
  const provider = getPharosProvider();
  const [transaction, receipt] = await Promise.all([
    provider.getTransaction(transactionHash),
    provider.getTransactionReceipt(transactionHash),
  ]);

  if (!transaction || !receipt) {
    return nativePhRsFailure(input.quoteId, transactionHash, 'native-phrs-transaction-not-found-or-pending', binding);
  }

  const actualTo = readAddress(transaction.to);
  const actualFrom = readAddress(transaction.from);
  const actualChainId = Number(transaction.chainId);

  if (receipt.status !== 1) {
    return nativePhRsFailure(input.quoteId, transactionHash, 'native-phrs-transaction-failed', binding);
  }
  if (actualChainId !== appConfig.pharosChainId) {
    return nativePhRsFailure(input.quoteId, transactionHash, `native-phrs-chain-mismatch-${actualChainId}`, binding);
  }
  if (!actualTo || actualTo !== expectedTo) {
    return nativePhRsFailure(input.quoteId, transactionHash, 'native-phrs-recipient-mismatch', binding);
  }
  if (expectedPayer && actualFrom !== expectedPayer) {
    return nativePhRsFailure(input.quoteId, transactionHash, 'native-phrs-payer-mismatch', binding);
  }
  if (transaction.value < requiredAmount) {
    return nativePhRsFailure(input.quoteId, transactionHash, 'native-phrs-amount-too-low', binding);
  }

  const replayReason = registerNativePhRsPaymentUse(transactionHash, binding);
  if (replayReason) {
    return nativePhRsFailure(input.quoteId, transactionHash, replayReason, binding);
  }

  return {
    success: true,
    verified: true,
    mode: 'native-phrs-receipt-verified',
    quoteId: input.quoteId,
    settlementBroadcastEnabled: false,
    onChainWritesEnabled: false,
    payment: {
      asset: 'PHRS',
      transactionHash,
      from: actualFrom ?? transaction.from,
      to: actualTo ?? transaction.to ?? '',
      value: formatEther(transaction.value),
      valueWei: transaction.value.toString(),
      requiredValue: formatEther(requiredAmount),
      requiredValueWei: requiredAmount.toString(),
      blockNumber: receipt.blockNumber,
      binding,
      replayProtected: true,
    },
    reason: 'A native PHRS transfer receipt was verified on Pharos Atlantic against the x402 payment requirements and bound to this quote/resource.',
    nextStep: 'Return the protected response and attach PAYMENT-RESPONSE metadata. This Skill verified an existing transaction and did not broadcast settlement.',
  };
}

function nativePhRsFailure(quoteId: string | undefined, transactionHash: string, reason: string, binding = 'unbound'): X402VerificationResult {
  return {
    success: true,
    verified: false,
    mode: 'native-phrs-receipt-rejected',
    quoteId,
    settlementBroadcastEnabled: false,
    onChainWritesEnabled: false,
    payment: {
      asset: 'PHRS',
      transactionHash,
      from: '',
      to: '',
      value: '0',
      valueWei: '0',
      requiredValue: appConfig.x402.defaultAmount,
      requiredValueWei: parseEther(appConfig.x402.defaultAmount).toString(),
      blockNumber: 0,
      binding,
      replayProtected: true,
    },
    reason,
    nextStep: 'Submit a confirmed Pharos Atlantic native PHRS transfer hash that pays the quoted payTo address with at least the quoted amount.',
  };
}

function registerNativePhRsPaymentUse(transactionHash: string, binding: string): string | undefined {
  const normalizedHash = transactionHash.toLowerCase();
  const previousBinding = nativePhRsPaymentUseByTx.get(normalizedHash);
  if (previousBinding && previousBinding !== binding) {
    return 'native-phrs-transaction-already-bound-to-different-requirements';
  }
  nativePhRsPaymentUseByTx.set(normalizedHash, binding);
  return undefined;
}

function paymentBinding(quoteId: string | undefined, requirements: Record<string, unknown>) {
  return hashQuote([
    quoteId ?? 'no-quote',
    String(requirements.network ?? appConfig.x402.network),
    String(requirements.chainId ?? appConfig.x402.chainId),
    String(requirements.resource ?? 'unknown-resource'),
    String(requirements.method ?? 'GET'),
    String(requirements.payTo ?? ''),
    String(requirements.asset ?? ''),
    String(requirements.price ?? requirements.maxAmountRequired ?? requirements.amount ?? ''),
  ].join('|'));
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function readPaymentRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value.trim())) {
    return { txHash: value.trim() };
  }
  return readRecord(value);
}

function readTransactionHash(value: Record<string, unknown>) {
  const raw = value.txHash ?? value.transactionHash ?? value.transaction ?? value.hash ?? value.tx_hash;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return /^0x[0-9a-fA-F]{64}$/.test(trimmed) ? trimmed : undefined;
}

function readAddress(value: unknown) {
  if (typeof value !== 'string') return undefined;
  try {
    return getAddress(value);
  } catch {
    return undefined;
  }
}

function readRequiredPhRsAmount(requirements: Record<string, unknown>) {
  const raw = requirements.price ?? requirements.maxAmountRequired ?? requirements.amount;
  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined;
  try {
    return parseEther(String(raw));
  } catch {
    return undefined;
  }
}

function hashQuote(input: string) {
  return `x402-${createHash('sha256').update(input).digest('hex').slice(0, 16)}`;
}

export function encodeBase64Json(value: unknown) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
}

export function decodeBase64Json(value?: string): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
  } catch {
    return undefined;
  }
}
