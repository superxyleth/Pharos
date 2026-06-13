# Safety And Phase 1 Boundary

This Skill is intentionally limited to Phase 1 research workflows.

## Allowed

- Generate strategy code.
- Validate strategy code.
- Run backtests.
- Produce risk advice.
- Simulate decisions in a sandbox.
- Export strategy artifacts.
- Read Pharos network status.
- Read native PHRS balance from a locally configured wallet.

## Not Allowed

- Live trading.
- Transaction broadcast.
- Token transfers.
- Swaps.
- Approvals.
- Contract deployments.
- Contract writes.
- Printing private keys.
- Asking the user to paste private keys into Agent messages.

## Private Key Policy

If configured, `PRIVATE_KEY` is read only from the local runtime environment.

It is used only to derive the public address and query native PHRS balance.

The private key is never returned in tool output.

## Future Execution Policy

If testnet execution is added in a later phase, it should be a separate disabled-by-default module with:

- explicit environment flag
- Atlantic Testnet-only guard
- chain ID verification
- allowlisted router and token addresses
- maximum notional limit
- slippage limit
- dry-run transaction plan
- explicit confirmation
- transaction hash output only

