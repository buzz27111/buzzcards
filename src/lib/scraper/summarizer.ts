import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { getEnv } from '@/lib/env';

/**
 * Generates a fallback summary by trimming the description to the first 60 words.
 * Appends "..." if the original text was truncated.
 */
export function fallbackSummary(description: string): string {
  const words = description.split(/\s+/).filter(Boolean);
  if (words.length <= 60) {
    return words.join(' ');
  }
  return words.slice(0, 60).join(' ') + '...';
}

/**
 * Summarizes an article description using Amazon Bedrock.
 * Falls back to `fallbackSummary` if Bedrock is unavailable or errors.
 */
export async function summarizeArticle(description: string): Promise<string> {
  if (!description.trim()) {
    return '';
  }

  try {
    const env = getEnv();

    const client = new BedrockRuntimeClient({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const prompt = `Summarize the following news article description in 60 words or fewer. Return only the summary text, no preamble:\n\n${description}`;

    const modelId = env.BEDROCK_MODEL_ID;
    const isClaude = modelId.includes('anthropic.');

    const requestBody = isClaude
      ? {
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 150,
          temperature: 0.3,
          top_p: 0.9,
          messages: [{ role: 'user', content: prompt }],
        }
      : {
          inputText: prompt,
          textGenerationConfig: {
            maxTokenCount: 150,
            temperature: 0.3,
            topP: 0.9,
          },
        };

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Handle common Bedrock response formats
    const summary =
      responseBody.results?.[0]?.outputText ??
      responseBody.completion ??
      responseBody.content?.[0]?.text ??
      '';

    if (summary.trim()) {
      return summary.trim();
    }

    return fallbackSummary(description);
  } catch (error) {
    console.error(
      `[summarizer] Bedrock API error, using fallback: ${error instanceof Error ? error.message : String(error)}`
    );
    return fallbackSummary(description);
  }
}
