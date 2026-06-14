# Pharos Network

Default network:

```text
Pharos Atlantic Testnet
```

Known configuration:

```json
{
  "name": "atlantic-testnet",
  "chainId": 688689,
  "rpcUrl": "https://atlantic.dplabs-internal.com",
  "wssUrl": "wss://atlantic.dplabs-internal.com",
  "nativeToken": "PHRS",
  "explorerUrl": "https://atlantic.pharosscan.xyz/",
  "rateLimit": "500 times/5m",
  "maxPendingTxsPerAddress": 64
}
```

Official documentation:

```text
https://docs.pharos.xyz/getting-started/network/atlantic-testnet
```

Official Atlantic Testnet limits:

- Rate limit: `500 times/5m`.
- Max pending transactions per address: `64`.

The current Phase 1 Skill is read-only and does not create pending transactions, but future execution modules should respect these limits before sending or scheduling writes.

## Read-Only Scope

The current Skill only uses Pharos network access for:

- RPC readiness checks.
- Chain ID verification.
- Block height reads.
- Native PHRS balance reads.

It does not use Pharos network access for:

- sending transactions
- swaps
- transfers
- contract writes
- deployments
- approvals

## Assets

See `assets/tokens.json` for public token metadata used for documentation and future extension planning.

Before any future execution module is added, token addresses, routers, liquidity, and chain ID must be verified against official Pharos documentation and explorer data.
