interface PreviewFetcherOptions {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
}

interface PreviewApiResponse {
  success?: boolean;
  content?: string;
  error?: string;
}

export async function fetchPreviewContent(
  atchmnflNo: string,
  options: PreviewFetcherOptions
): Promise<string> {
  if (!atchmnflNo) {
    throw new Error('atchmnflNo is required to fetch preview content');
  }

  const { baseUrl, token, timeoutMs = 5000 } = options;
  const url = new URL(baseUrl);
  url.searchParams.set('atchmnflNo', atchmnflNo);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText || 'Unknown error'}`);
    }

    const payload = (await response.json()) as PreviewApiResponse;

    if (!payload || payload.success !== true || typeof payload.content !== 'string') {
      const reason = payload?.error || 'Missing preview content in response';
      throw new Error(`Preview API responded with success=false: ${reason}`);
    }

    return payload.content.trim();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Preview fetch timeout after ${timeoutMs}ms`);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unknown error occurred during preview fetch');
  } finally {
    clearTimeout(timeoutId);
  }
}
