# x402 Payments

This Skill exposes an optional x402-style Phase 2 paid-access layer for future monetized artifacts, reports, and dry-run execution plans.

The current public implementation is PHRS-only and uses public Pharos Atlantic receipt verification:

```text
network = eip155:688689
chainId = 688689
asset = PHRS
verificationMode = native-phrs-receipt
settlement = server-verifies-existing-onchain-transfer
facilitatorUrl = null
```

Core MCP research tools remain free and unchanged.

## What It Does

- Exposes x402 status and product catalog endpoints.
- Produces x402-style `HTTP 402 Payment Required` requirements for optional paid resources.
- Accepts quote requests by either catalog `productId` or direct `resource + method`.
- Returns `PAYMENT-REQUIRED` headers on protected resources.
- Accepts a base64 JSON `PAYMENT-SIGNATURE` header containing a confirmed Pharos Atlantic PHRS transfer `txHash`.
- Verifies the existing public-chain transfer receipt against the quoted `payTo`, amount, chain, resource, and method.
- Keeps settlement broadcast and strategy on-chain writes disabled.

## What It Does Not Do

- Does not require an ERC20 test token.
- Does not expose or depend on a localhost facilitator URL in public quote responses.
- Does not broadcast payments.
- Does not call facilitator `/settle`.
- Does not sign transactions.
- Does not execute trades.
- Does not modify the Phase 1 core MCP workflow.

## Public Endpoints

- `GET /x402/status`
- `GET /x402/products`
- `POST /x402/quote`
- `POST /x402/verify`
- `GET /paid/artifacts/:artifactId`
- `POST /paid/quant-report`
- `POST /paid/dry-run-plan`

## MCP Tools

- `x402_payment_status`
- `x402_product_catalog`
- `x402_quote`
- `x402_receipt_verify`

## Default Safety

Local default environment:

```text
X402_ENABLED=false
X402_NETWORK=eip155:688689
X402_CHAIN_ID=688689
X402_DEFAULT_ASSET=PHRS
```

Public review posture:

```text
settlementBroadcastEnabled=false
onChainWritesEnabled=false
coreMcpReviewUnaffected=true
```

## Native PHRS Receipt Flow

1. Request a quote for a paid resource.
2. Read `requirements.payTo`, `requirements.price`, and `requirements.asset`.
3. Send native PHRS on Pharos Atlantic to `payTo`.
4. Wait until the transaction is confirmed.
5. Retry the paid route with `PAYMENT-SIGNATURE` set to base64 JSON:

```json
{
  "txHash": "0x...",
  "payer": "0x..."
}
```

The verifier checks:

- `status = 1`
- `from` matches `payer` when provided
- `to` matches the quoted `payTo`
- `value` is at least the quoted PHRS amount
- `chainId = 688689`
- the transaction hash is bound to the current `quoteId/resource/method/payTo/amount` requirements

The verifier does not broadcast settlement. It only reads the public transaction and receipt from Pharos Atlantic.

## Quote Flow

Catalog product example:

```json
{
  "productId": "paid-full-artifact"
}
```

Direct resource/method example:

```json
{
  "resource": "/paid/quant-report",
  "method": "POST"
}
```

Expected public quote markers:

```text
requirements.asset = PHRS
requirements.verificationMode = native-phrs-receipt
requirements.facilitatorUrl = null
safety.settlementBroadcastEnabled = false
safety.onChainWritesEnabled = false
```

## Review Guidance

Reviewers should treat x402 as an optional paid-access layer around future paid resources and execution-plan handoffs, not as part of the free core research Skill and not as live trading infrastructure.
