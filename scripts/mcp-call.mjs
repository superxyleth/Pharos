import fs from 'node:fs';

const file = process.argv[2];
const url = process.argv[3] ?? 'http://localhost:3001/mcp';
if (!file) {
  console.error('Usage: node scripts/mcp-call.mjs examples/quant-loop-run.json [url]');
  process.exit(1);
}

const body = fs.readFileSync(file, 'utf8');
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  },
  body,
});
const text = await response.text();
console.log(text);
if (!response.ok) process.exit(1);
