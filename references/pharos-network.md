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
  "nativeToken": "PHRS",
  "explorerUrl": "https://atlantic.pharosscan.xyz/"
}
```

Official documentation:

```text
https://docs.pharosnetwork.xyz/
```

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

