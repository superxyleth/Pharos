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
```

The response body includes the x402 payment requirements.
