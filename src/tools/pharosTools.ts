import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPharosNetworkStatus, getWalletInfo } from '../pharos.js';
import { errorResult, textResult } from '../mcpResponse.js';

export function registerPharosTools(server: McpServer) {
  server.registerTool(
    'pharos_network_status',
    {
      description: 'Check Pharos Atlantic testnet RPC readiness, chain ID, and current block number.',
      inputSchema: {},
    },
    async () => {
      try {
        return textResult(await getPharosNetworkStatus());
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'pharos_wallet_info',
    {
      description: 'Derive the local PRIVATE_KEY wallet address and read PHRS balance on Pharos Atlantic. Never returns the private key.',
      inputSchema: {
        includeAddress: z.boolean().optional().describe('When true, include the configured wallet public address. Defaults to false for public deployments.'),
        includeBalance: z.boolean().optional().describe('When true, include the native PHRS balance. Defaults to false for public deployments.'),
      },
    },
    async ({ includeAddress = false, includeBalance = false }) => {
      try {
        return textResult(await getWalletInfo({ includeAddress, includeBalance }));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error), {
          status: 'wallet_not_ready',
        });
      }
    },
  );
}
