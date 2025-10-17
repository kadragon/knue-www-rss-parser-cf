import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRSS } from '../../src/rss/fetcher';

describe('fetchRSS', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
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

  it('should handle HTTP 404 error (non-transient)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    await expect(fetchRSS('https://example.com/rss', { maxRetries: 2 })).rejects.toThrow('HTTP 404: Not Found');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on transient HTTP 503 error', async () => {
    const mockXml = '<?xml version="1.0"?><rss></rss>';
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => mockXml
      });

    const promise = fetchRSS('https://example.com/rss', { maxRetries: 2 });
    
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    
    expect(result).toBe(mockXml);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should retry on network timeout (transient error)', async () => {
    const mockXml = '<?xml version="1.0"?><rss></rss>';
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Request timeout after 5000ms'))
      .mockResolvedValueOnce({
        ok: true,
        text: async () => mockXml
      });

    const promise = fetchRSS('https://example.com/rss', { maxRetries: 2 });
    
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    
    expect(result).toBe(mockXml);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle network errors without retry', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const promise = fetchRSS('https://example.com/rss', { maxRetries: 0 });
    
    await expect(promise).rejects.toThrow('Network error');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
