import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { errorResult, textResult } from '../mcpResponse.js';
import { createX402Quote, getX402Products, getX402Status, verifyX402Receipt } from '../x402/catalog.js';

export function registerX402Tools(server: McpServer) {
  server.registerTool(
    'x402_payment_status',
    {
      description: 'Inspect optional x402 payment gateway status. Does not settle payments or broadcast transactions.',
      inputSchema: {},
    },
    async () => textResult(getX402Status()),
  );

  server.registerTool(
    'x402_product_catalog',
    {
      description: 'List optional paid resources that could be protected by x402. Core research tools remain free and reviewable.',
      inputSchema: {},
    },
    async () => textResult(getX402Products()),
  );

  server.registerTool(
    'x402_quote',
    {
      description: 'Create x402-style payment requirements for an optional paid resource. No transaction is signed or broadcast.',
      inputSchema: {
        productId: z.string().min(1).describe('Paid product ID, e.g. paid-quant-report, paid-full-artifact, or paid-dry-run-plan.'),
        resource: z.string().optional().describe('Optional resource path override.'),
        method: z.enum(['GET', 'POST']).optional().describe('HTTP method for the protected resource.'),
      },
    },
    async ({ productId, resource, method }) => {
      try {
        return textResult(createX402Quote({ productId, resource, method }));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.registerTool(
    'x402_receipt_verify',
    {
      description: 'Verify an x402 receipt scaffold without settlement. Production settlement must be delegated to a separate payment service.',
      inputSchema: {
        quoteId: z.string().optional().describe('Quote ID returned by x402_quote.'),
        paymentPayload: z.unknown().optional().describe('Optional x402 payment payload or X-PAYMENT content.'),
        receipt: z.unknown().optional().describe('Optional payment receipt metadata.'),
      },
    },
    async ({ quoteId, paymentPayload, receipt }) => textResult(verifyX402Receipt({ quoteId, paymentPayload, receipt })),
  );
}
