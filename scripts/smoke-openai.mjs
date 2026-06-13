import { completeText } from '../src/openai.ts';

const text = await completeText({
  system: 'Reply with exactly: pharos-skill-ok',
  user: 'Health check.',
  maxTokens: 20,
  temperature: 0,
});

if (!text.toLowerCase().includes('pharos-skill-ok')) {
  throw new Error(`Unexpected OpenAI response: ${text}`);
}

console.log(JSON.stringify({ ok: true, text }, null, 2));
