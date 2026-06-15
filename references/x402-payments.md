# x402 Payments

This Skill supports an optional x402-style paid gateway layer for future monetized resources.

The gateway is disabled by default and does not affect the core Phase 1 research workflow.

## What It Does

- Exposes x402 status and product catalog endpoints.
- Produces x402-style payment quotes for optional paid resources.
- Verifies receipts as a scaffold only.
- Keeps settlement and transaction broadcast disabled by default.

## What It Does Not Do

- Does not broadcast payments.
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

Default environment:

```text
X402_ENABLED=false
```

Required safety posture:

- `settlementBroadcastEnabled = false`
- `onChainWritesEnabled = false`
- `coreMcpReviewUnaffected = true`

## Quote Flow

1. Inspect `x402_product_catalog`.
2. Call `x402_quote` for the selected product.
3. Read the returned payment requirements.
4. If using a real payment stack later, hand the requirements to a separate payment service.
5. Keep the Phase 1 research tools free and unchanged.

## Review Guidance

Reviewers should treat x402 as an optional monetization shell around paid resources, not as part of the core research Skill.
