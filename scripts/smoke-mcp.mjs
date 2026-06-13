const url = process.env.MCP_URL ?? 'http://localhost:3001/mcp';
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
});
const text = await response.text();
if (!response.ok || !text.includes('quant_loop_run')) {
  throw new Error(`MCP smoke failed: ${text.slice(0, 500)}`);
}
console.log(text);
