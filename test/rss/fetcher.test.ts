import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRSS } from '../../src/rss/fetcher';

describe('fetchRSS', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch RSS from valid URL', async () => {
    const mockXml = '<?xml version="1.0"?><rss></rss>';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => mockXml
    });

    const result = await fetchRSS('https://example.com/rss');
    
    expect(result).toBe(mockXml);
    expect(fetch).toHaveBeenCalledWith('https://example.com/rss', expect.objectContaining({
      signal: expect.any(AbortSignal)
    }));
  });

  it('should handle HTTP 404 error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    await expect(fetchRSS('https://example.com/rss')).rejects.toThrow('HTTP 404: Not Found');
  });

  it('should handle HTTP 500 error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(fetchRSS('https://example.com/rss')).rejects.toThrow('HTTP 500: Internal Server Error');
  });

  it('should handle network timeout', async () => {
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      )
    );

    await expect(fetchRSS('https://example.com/rss')).rejects.toThrow();
  }, 10000);

  it('should handle network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(fetchRSS('https://example.com/rss')).rejects.toThrow('Network error');
  });
});
