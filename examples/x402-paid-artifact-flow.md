# x402 Paid Artifact Flow

This example shows how an Agent can discover optional Phase 2 paid-access resources without disrupting the core free review path.

## 1. Check x402 Status

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "x402_payment_status",
    "arguments": {}
  }
}
```

Expected:

```text
enabled = false by default
settlementBroadcastEnabled = false
onChainWritesEnabled = false
```

## 2. List Paid Products

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "x402_product_catalog",
    "arguments": {}
  }
}
```

## 3. Request A Quote

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "x402_quote",
    "arguments": {
      "productId": "paid-full-artifact",
      "resource": "/paid/artifacts/pharos-demo-artifact",
      "method": "GET"
    }
  }
}
```

The response returns x402-style payment requirements but does not settle or broadcast any payment.

Agents can also request a quote directly by protected resource and method when they do not already know the catalog product ID:

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "x402_quote",
    "arguments": {
      "resource": "/paid/quant-report",
      "method": "POST"
    }
  }
}
```

Expected payment headers:

```text
PAYMENT-REQUIRED
PAYMENT-SIGNATURE
PAYMENT-RESPONSE
```

## 4. Verify Receipt Scaffold

```json
{
  "jsonrpc": "2.0",
  "id": 13,
  "method": "tools/call",
  "params": {
    "name": "x402_receipt_verify",
    "arguments": {
      "quoteId": "x402-example",
      "receipt": {
        "note": "Example only. Production settlement must use a separate payment service."
      }
    }
  }
}
```

Expected default:

```text
verified = false
settlementBroadcastEnabled = false
onChainWritesEnabled = false
```

## HTTP 402 Example

```bash
curl -i http://150.158.28.155:3011/paid/artifacts/pharos-demo-artifact
```

Expected response:

```text
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: <base64 PaymentRequired object>
```

The response body includes the x402 payment requirements.

## Native PHRS Receipt Unlock

After receiving the `PAYMENT-REQUIRED` header, send at least `0.01 PHRS` on Pharos Atlantic to the quoted `payTo` address.

Public demo receiver:

```text
0x567E9De7f9A9c0DBe071781B89137892231d4450
```

Retry the same paid route with the confirmed transaction hash:

```bash
curl -i http://150.158.28.155:3011/paid/artifacts/pharos-demo-artifact \
  -H "PAYMENT-SIGNATURE: 0x<confirmed-phrs-transfer-tx>"
```

Expected response:

```text
HTTP/1.1 200 OK
PAYMENT-RESPONSE: <base64 verification metadata>
```

The decoded `PAYMENT-RESPONSE` includes:

```json
{
  "verified": true,
  "mode": "native-phrs-receipt-verified",
  "payment": {
    "asset": "PHRS",
    "value": "0.01",
    "replayProtected": true
  }
}
```

The verifier checks transaction status, chain ID, receiver, amount, optional payer, and quote/resource binding. It verifies an existing transaction only; it does not sign, broadcast, or settle on behalf of the user.

## Demo Unlock Without Settlement

For local demos only, set:

```text
X402_DEV_ACCEPT_UNSIGNED_RECEIPT=true
```

Then request:

```bash
curl -i -H "x-x402-demo-receipt: accepted" http://localhost:3001/paid/artifacts/pharos-demo-artifact
```

Expected response:

```text
HTTP/1.1 200 OK
PAYMENT-RESPONSE: <base64 verification metadata>
```

No settlement, signing, broadcast, or on-chain write is performed by this demo path.

## Public PHRS Verification Flow

Use this flow for the public review service:

```bash
curl -X POST http://150.158.28.155:3011/x402/quote \
  -H "Content-Type: application/json" \
  -d "{\"resource\":\"/paid/quant-report\",\"method\":\"POST\"}"
```

Expected quote markers:

```text
requirements.asset = PHRS
requirements.verificationMode = native-phrs-receipt
requirements.facilitatorUrl = null
```

After sending PHRS to the quoted `payTo`, encode the confirmed txHash:

```bash
PAYMENT=$(printf '{"txHash":"0x...","payer":"0x..."}' | base64)
```

Then retry the paid route:

```bash
curl -i -X POST http://150.158.28.155:3011/paid/quant-report \
  -H "Content-Type: application/json" \
  -H "PAYMENT-SIGNATURE: $PAYMENT" \
  -d "{\"symbol\":\"WBTC\"}"
```

This flow verifies a public Pharos Atlantic PHRS transaction receipt. It does not sign, broadcast, settle, or execute trades.
