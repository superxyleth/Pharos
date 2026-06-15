import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { appConfig } from './config.js';
import { registerLoopTools } from './tools/loopTools.js';
import { registerPharosTools } from './tools/pharosTools.js';
import { registerStrategyTools } from './tools/strategyTools.js';
import { registerX402Tools } from './tools/x402Tools.js';
import { registerX402Routes } from './x402/routes.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'pharos-quant-strategy-lifecycle-skill',
    version: '0.1.0',
  });
  registerPharosTools(server);
  registerStrategyTools(server);
  registerLoopTools(server);
  registerX402Tools(server);
  return server;
}

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'pharos-quant-strategy-lifecycle-skill',
    phase: 'phase1-skill',
    network: 'pharos-atlantic-testnet',
    mcpEndpoint: '/mcp',
    x402: {
      enabled: appConfig.x402.enabled,
      statusEndpoint: '/x402/status',
      productsEndpoint: '/x402/products',
      note: 'Optional x402 paid gateway scaffolding is disabled by default and does not broadcast transactions.',
    },
  });
});

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'pharos-quant-strategy-lifecycle-skill',
    description: 'Natural-language strategy generation, sandbox validation, backtesting, simulation, artifact export, and Pharos RPC/wallet readiness checks.',
    mcpEndpoint: '/mcp',
    coreTools: [
      'pharos_network_status',
      'pharos_wallet_info',
      'strategy_preset_list',
      'strategy_preset_get',
      'strategy_generate',
      'strategy_validate',
      'strategy_backtest',
      'strategy_backtest_matrix',
      'strategy_advise',
      'strategy_simulate',
      'strategy_export_artifact',
      'quant_loop_run',
    ],
    optionalX402Tools: [
      'x402_payment_status',
      'x402_product_catalog',
      'x402_quote',
      'x402_receipt_verify',
    ],
    x402: {
      enabled: appConfig.x402.enabled,
      statusEndpoint: '/x402/status',
      productsEndpoint: '/x402/products',
      quoteEndpoint: '/x402/quote',
      verifyEndpoint: '/x402/verify',
      paidRoutes: ['/paid/artifacts/:artifactId', '/paid/quant-report', '/paid/dry-run-plan'],
    },
  });
});

registerX402Routes(app);

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = createServer();
  res.on('close', () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
        id: req.body?.id ?? null,
      });
    }
  }
});

app.get('/mcp', (_req, res) => {
  res.status(405).set('Allow', 'POST').json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed. Use POST /mcp.' },
    id: null,
  });
});

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  app.listen(appConfig.port, () => {
    console.log(`Pharos Quant Strategy Lifecycle Skill running on http://localhost:${appConfig.port}`);
    console.log(`MCP endpoint: http://localhost:${appConfig.port}/mcp`);
  });
}
