# x402 Paid Artifact Flow

This example shows how an Agent can discover optional paid resources without disrupting the core free review path.

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

## Official SDK Flow

Use this flow when testing the actual x402 SDK middleware and facilitator path.

Terminal 1:

```bash
set X402_RECEIVER_ADDRESS=0x567E9De7f9A9c0DBe071781B89137892231d4450
set X402_FACILITATOR_URL=http://localhost:4020
set X402_ASSET_ADDRESS=0xE0BE08c77f415F577A1B3A9aD7a1Df1479564ec8
set X402_ASSET_NAME=USDC
set X402_ASSET_VERSION=2
set X402_ASSET_DECIMALS=6
npm run x402:facilitator
```

Terminal 2:

```bash
set X402_RECEIVER_ADDRESS=0x567E9De7f9A9c0DBe071781B89137892231d4450
set X402_FACILITATOR_URL=http://localhost:4020
set X402_ASSET_ADDRESS=0xE0BE08c77f415F577A1B3A9aD7a1Df1479564ec8
set X402_ASSET_NAME=USDC
set X402_ASSET_VERSION=2
set X402_ASSET_DECIMALS=6
npm run x402:server
```

Terminal 3:

```bash
npm run x402:client
```

This standard path requires the payer wallet to hold the configured ERC20 asset and enough PHRS for gas. Native PHRS transfers are not a substitute for official EVM exact settlement unless the facilitator explicitly supports native PHRS.
