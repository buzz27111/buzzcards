import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fallbackSummary, summarizeArticle } from './summarizer';

// Mock the env module
vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
    BEDROCK_MODEL_ID: 'amazon.titan-text-express-v1',
  }),
}));

// Mock the Bedrock client
const mockSend = vi.fn();

vi.mock('@aws-sdk/client-bedrock-runtime', () => {
  return {
    InvokeModelCommand: vi.fn(),
    BedrockRuntimeClient: class {
      send = mockSend;
    },
  };
});

describe('fallbackSummary', () => {
  it('should return the full text when under 60 words', () => {
    const text = 'This is a short description with only a few words.';
    expect(fallbackSummary(text)).toBe(text);
  });

  it('should return exactly 60 words with ellipsis when over 60 words', () => {
    const words = Array.from({ length: 80 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const result = fallbackSummary(text);
    const resultWords = result.replace(/\.\.\.$/, '').trim().split(/\s+/);
    expect(resultWords).toHaveLength(60);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should return exactly 60 words without ellipsis when exactly 60 words', () => {
    const words = Array.from({ length: 60 }, (_, i) => `word${i}`);
    const text = words.join(' ');
    const result = fallbackSummary(text);
    expect(result).toBe(text);
    expect(result.endsWith('...')).toBe(false);
  });

  it('should handle empty string', () => {
    expect(fallbackSummary('')).toBe('');
  });

  it('should handle whitespace-only string', () => {
    expect(fallbackSummary('   ')).toBe('');
  });

  it('should handle extra whitespace between words', () => {
    const text = 'word1   word2   word3';
    expect(fallbackSummary(text)).toBe('word1 word2 word3');
  });
});

describe('summarizeArticle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty string for empty description', async () => {
    const result = await summarizeArticle('');
    expect(result).toBe('');
  });

  it('should return empty string for whitespace-only description', async () => {
    const result = await summarizeArticle('   ');
    expect(result).toBe('');
  });

  it('should return Bedrock summary on success', async () => {
    const summaryText = 'This is an AI-generated summary of the article.';
    mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({ results: [{ outputText: summaryText }] })
      ),
    });

    const result = await summarizeArticle('A long article description...');
    expect(result).toBe(summaryText);
  });

  it('should fall back when Bedrock returns empty summary', async () => {
    mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({ results: [{ outputText: '' }] })
      ),
    });

    const description = 'Short article text here.';
    const result = await summarizeArticle(description);
    expect(result).toBe(fallbackSummary(description));
  });

  it('should fall back when Bedrock throws an error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSend.mockRejectedValueOnce(new Error('Service unavailable'));

    const description = 'Some article description for fallback testing.';
    const result = await summarizeArticle(description);

    expect(result).toBe(fallbackSummary(description));
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Bedrock API error')
    );
    errorSpy.mockRestore();
  });

  it('should handle alternative Bedrock response format (completion)', async () => {
    const summaryText = 'Alternative format summary.';
    mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({ completion: summaryText })
      ),
    });

    const result = await summarizeArticle('Some description');
    expect(result).toBe(summaryText);
  });

  it('should handle alternative Bedrock response format (content array)', async () => {
    const summaryText = 'Content array format summary.';
    mockSend.mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({ content: [{ text: summaryText }] })
      ),
    });

    const result = await summarizeArticle('Some description');
    expect(result).toBe(summaryText);
  });
});
