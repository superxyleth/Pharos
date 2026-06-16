# x402 Payments

This Skill supports an optional x402-style Phase 2 paid-access extension layer for future monetized resources, reports, and dry-run execution plans.

The gateway is disabled by default and does not affect the core Phase 1 research workflow.

## What It Does

- Exposes x402 status and product catalog endpoints.
- Produces Pharos x402 payment requirements for optional paid resources.
- Accepts quote requests by either catalog `productId` or direct `resource + method`.
- Returns `PAYMENT-REQUIRED` headers on protected resources.
- Accepts `PAYMENT-SIGNATURE` headers and can delegate verification to a configured facilitator.
- Keeps settlement and transaction broadcast disabled by default.

## What It Does Not Do

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

## Official SDK Flow

The repository also includes an isolated official SDK demo that uses:

- `@x402/express`
- `@x402/core`
- `@x402/evm`
- `@x402/fetch`

Scripts:

```bash
npm run x402:facilitator
npm run x402:server
npm run x402:client
```

Required environment:

```text
X402_NETWORK=eip155:688689
X402_CHAIN_ID=688689
X402_RECEIVER_ADDRESS=0x...
X402_FACILITATOR_URL=http://localhost:4020
X402_ASSET_ADDRESS=0x...
X402_ASSET_NAME=USDC
X402_ASSET_VERSION=2
X402_ASSET_DECIMALS=6
EVM_PRIVATE_KEY=0x...
```

Important: the official EVM `exact` SDK path settles ERC20 assets through EIP-3009 or Permit2. Native PHRS transfers can be used as local receipt material, but they are not the same as the official x402 EVM exact settlement path unless a facilitator explicitly supports native PHRS.

## MCP Tools

- `x402_payment_status`
- `x402_product_catalog`
- `x402_quote`
- `x402_receipt_verify`

## Default Safety

Local default environment:

```text
X402_ENABLED=false
```

Public review posture:

```text
settlementBroadcastEnabled=false
onChainWritesEnabled=false
```

Required safety posture:

- `settlementBroadcastEnabled = false`
- `onChainWritesEnabled = false`
- `coreMcpReviewUnaffected = true`

Local PHRS test defaults:

```text
X402_NETWORK=eip155:688689
X402_CHAIN_ID=688689
X402_DEFAULT_ASSET=PHRS
```

PHRS is the native token on Pharos Atlantic and is useful for local scaffold testing. Production x402 settlement should confirm facilitator support for native PHRS or use a supported ERC20 asset.

## Native PHRS Receipt Test

For local PHRS testing, submit a confirmed native transfer hash in the `PAYMENT-SIGNATURE` header after receiving `HTTP 402 Payment Required`.

The header value may be base64 JSON:

```json
{
  "txHash": "0x...",
  "payer": "0x..."
}
```

The verifier checks the transaction on Pharos Atlantic and requires:

- `status = 1`
- `from` matches `payer` when provided
- `to` matches the quoted `payTo`
- `value` is at least the quoted PHRS amount
- `chainId = 688689`
- the transaction hash is bound to the current `quoteId/resource/method/payTo/amount` requirements

This mode verifies an existing native PHRS payment and does not broadcast settlement. It also prevents cross-resource replay: once a transaction hash is observed for one payment requirement binding, the same hash is rejected for a different paid resource or amount.

## Quote Flow

1. Inspect `x402_product_catalog`.
2. Call `x402_quote` for the selected product, either with `productId` or with `resource + method`.
3. Read the returned payment requirements.
4. Protected HTTP routes return `HTTP 402 Payment Required` with a base64-encoded `PAYMENT-REQUIRED` header.
5. A client can retry with a base64-encoded `PAYMENT-SIGNATURE` header.
6. If `X402_ENABLED=true` and `X402_FACILITATOR_URL` is configured, verification is delegated to the facilitator `/verify` endpoint.
7. This Skill does not call `/settle`; keep production settlement in a separate payment service.
8. Keep the Phase 1 research tools free and unchanged.

Catalog product example:

```json
{
  "productId": "paid-full-artifact",
  "resource": "/paid/artifacts/pharos-demo-artifact",
  "method": "GET"
}
```

Direct resource/method example:

```json
{
  "resource": "/paid/quant-report",
  "method": "POST"
}
```

## Review Guidance

Reviewers should treat x402 as an optional Phase 2 paid-access layer around future paid resources and execution-plan handoffs, not as part of the free core research Skill and not as live trading infrastructure.
