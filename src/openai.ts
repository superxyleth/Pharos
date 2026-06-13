import OpenAI from 'openai';
import { appConfig } from './config.js';

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!appConfig.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }
  if (!client) {
    client = new OpenAI({
      apiKey: appConfig.openaiApiKey,
      ...(appConfig.openaiBaseUrl ? { baseURL: appConfig.openaiBaseUrl } : {}),
    });
  }
  return client;
}

export async function completeText(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const response = await getOpenAIClient().chat.completions.create({
    model: appConfig.openaiModel,
    messages: [
      { role: 'system', content: params.system },
      { role: 'user', content: params.user },
    ],
    max_tokens: params.maxTokens ?? 1200,
    temperature: params.temperature ?? 0.2,
  });
  return response.choices[0]?.message?.content?.trim() ?? '';
}
