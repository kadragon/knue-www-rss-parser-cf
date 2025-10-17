interface FetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
  backoffMultiplier?: number;
}

export async function fetchRSS(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const {
    timeoutMs = 5000,
    maxRetries = 3,
    backoffMultiplier = 2
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const xml = await fetchWithTimeout(url, timeoutMs);
      
      if (attempt > 0) {
        console.log(`✓ RSS fetch succeeded on attempt ${attempt + 1}/${maxRetries + 1}`);
      }
      
      return xml;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const isLastAttempt = attempt === maxRetries;
      const isTransient = isTransientError(lastError);
      
      if (isLastAttempt || !isTransient) {
        throw lastError;
      }
      
      const delayMs = Math.min(1000 * Math.pow(backoffMultiplier, attempt), 10000);
      console.warn(`⚠ RSS fetch attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delayMs}ms...`);
      
      await delay(delayMs);
    }
  }

  throw lastError || new Error('RSS fetch failed after all retries');
}

function isTransientError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  const transientPatterns = [
    'timeout',
    'econnreset',
    'econnrefused',
    'network',
    'temporary',
    'unavailable',
    'http 429',
    'http 503',
    'http 502',
    'http 504'
  ];
  
  return transientPatterns.some(pattern => message.includes(pattern));
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
    
    throw new Error('Unknown error occurred during fetch');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
