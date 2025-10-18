import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchPreviewContent } from '../../src/preview/fetcher';

describe('fetchPreviewContent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should request preview content with authorization header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, content: '# Preview\n내용' })
    });

    vi.stubGlobal('fetch', mockFetch);

    const content = await fetchPreviewContent('78541', {
      baseUrl: 'https://preview.example.com',
      token: 'secret-token',
      timeoutMs: 1000
    });

    expect(content).toBe('# Preview\n내용');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [requestUrl, requestInit] = mockFetch.mock.calls[0];
    expect(String(requestUrl)).toBe('https://preview.example.com/?atchmnflNo=78541');
    expect(requestInit?.headers?.Authorization).toBe('Bearer secret-token');
  });

  it('should throw when response is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error'
    });

    vi.stubGlobal('fetch', mockFetch);

    await expect(
      fetchPreviewContent('78541', { baseUrl: 'https://preview.example.com', token: 'secret-token' })
    ).rejects.toThrow('HTTP 500');
  });

  it('should throw when preview API reports failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: false, error: 'not found' })
    });

    vi.stubGlobal('fetch', mockFetch);

    await expect(
      fetchPreviewContent('78541', { baseUrl: 'https://preview.example.com', token: 'secret-token' })
    ).rejects.toThrow('Preview API responded with success=false');
  });
});
