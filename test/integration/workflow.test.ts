import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const fixtureXml = readFileSync(join(__dirname, '../../fixtures/sample-rss.xml'), 'utf-8');

import worker from '../../src/index';

describe('Integration: Full Workflow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should process multiple boards successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => fixtureXml
    });

    const mockBucket = {
      put: vi.fn().mockResolvedValue(undefined),
      head: vi.fn().mockResolvedValue(null)
    };

    const mockEnv = {
      RSS_STORAGE: mockBucket,
      RSS_FEED_BASE_URL: 'https://www.knue.ac.kr/rssBbsNtt.do',
      BOARD_IDS: '25,26'
    };

    const mockController = {
      cron: '0 1 * * *',
      scheduledTime: Date.now()
    } as ScheduledController;

    const mockCtx = {
      waitUntil: vi.fn()
    } as any;

    await worker.scheduled(mockController, mockEnv as any, mockCtx);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://www.knue.ac.kr/rssBbsNtt.do?bbsNo=25',
      expect.any(Object)
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://www.knue.ac.kr/rssBbsNtt.do?bbsNo=26',
      expect.any(Object)
    );

    expect(mockBucket.put).toHaveBeenCalledTimes(6);

    const [key1] = mockBucket.put.mock.calls[0];
    const [key2] = mockBucket.put.mock.calls[1];
    const [key3] = mockBucket.put.mock.calls[2];
    const [key4] = mockBucket.put.mock.calls[3];
    
    expect(key1).toBe('rss/25/2025_10_16_77561.md');
    expect(key2).toBe('rss/25/2025_10_15_77500.md');
    expect(key3).toBe('rss/25/2025_10_14_77400.md');
    expect(key4).toBe('rss/26/2025_10_16_77561.md');
  });

  it('should process single board successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => fixtureXml
    });

    const mockBucket = {
      put: vi.fn().mockResolvedValue(undefined),
      head: vi.fn().mockResolvedValue(null)
    };

    const mockEnv = {
      RSS_STORAGE: mockBucket,
      RSS_FEED_BASE_URL: 'https://www.knue.ac.kr/rssBbsNtt.do',
      BOARD_IDS: '25'
    };

    const mockController = {
      cron: '0 1 * * *',
      scheduledTime: Date.now()
    } as ScheduledController;

    const mockCtx = {
      waitUntil: vi.fn()
    } as any;

    await worker.scheduled(mockController, mockEnv as any, mockCtx);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mockBucket.put).toHaveBeenCalledTimes(3);

    const [key1, content1, options1] = mockBucket.put.mock.calls[0];
    
    expect(key1).toBe('rss/25/2025_10_16_77561.md');
    expect(content1).toContain('# RSS - 대학소식');
    expect(content1).toContain('2025년 캠퍼스 안심 소식지');
    expect(options1.httpMetadata.contentType).toBe('text/markdown; charset=utf-8');
  });

  it('should continue processing other boards if one fails', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => fixtureXml
      });

    const mockBucket = {
      put: vi.fn().mockResolvedValue(undefined),
      head: vi.fn().mockResolvedValue(null)
    };

    const mockEnv = {
      RSS_STORAGE: mockBucket,
      RSS_FEED_BASE_URL: 'https://www.knue.ac.kr/rssBbsNtt.do',
      BOARD_IDS: '25,26'
    };

    const mockController = {
      cron: '0 1 * * *',
      scheduledTime: Date.now()
    } as ScheduledController;

    const mockCtx = {
      waitUntil: vi.fn()
    } as any;

    await worker.scheduled(mockController, mockEnv as any, mockCtx);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(mockBucket.put).toHaveBeenCalledTimes(3);
  });

  it('should throw error if all boards fail', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const mockBucket = {
      put: vi.fn(),
      head: vi.fn()
    };

    const mockEnv = {
      RSS_STORAGE: mockBucket,
      RSS_FEED_BASE_URL: 'https://www.knue.ac.kr/rssBbsNtt.do',
      BOARD_IDS: '25,26'
    };

    const mockController = {
      cron: '0 1 * * *',
      scheduledTime: Date.now()
    } as ScheduledController;

    const mockCtx = {
      waitUntil: vi.fn()
    } as any;

    await expect(
      worker.scheduled(mockController, mockEnv as any, mockCtx)
    ).rejects.toThrow('All boards failed');

    expect(mockBucket.put).not.toHaveBeenCalled();
  });

  it('should handle invalid RSS XML for one board', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => 'invalid xml'
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => fixtureXml
      });

    const mockBucket = {
      put: vi.fn().mockResolvedValue(undefined),
      head: vi.fn().mockResolvedValue(null)
    };

    const mockEnv = {
      RSS_STORAGE: mockBucket,
      RSS_FEED_BASE_URL: 'https://www.knue.ac.kr/rssBbsNtt.do',
      BOARD_IDS: '25,26'
    };

    const mockController = {
      cron: '0 1 * * *',
      scheduledTime: Date.now()
    } as ScheduledController;

    const mockCtx = {
      waitUntil: vi.fn()
    } as any;

    await worker.scheduled(mockController, mockEnv as any, mockCtx);

    expect(mockBucket.put).toHaveBeenCalledTimes(3);
  });

  it('should handle partial R2 write errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => fixtureXml
    });

    let callCount = 0;
    const mockBucket = {
      put: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('R2 write failed'));
        }
        return Promise.resolve(undefined);
      }),
      head: vi.fn().mockResolvedValue(null)
    };

    const mockEnv = {
      RSS_STORAGE: mockBucket,
      RSS_FEED_BASE_URL: 'https://www.knue.ac.kr/rssBbsNtt.do',
      BOARD_IDS: '25,26,11'
    };

    const mockController = {
      cron: '0 1 * * *',
      scheduledTime: Date.now()
    } as ScheduledController;

    const mockCtx = {
      waitUntil: vi.fn()
    } as any;

    await worker.scheduled(mockController, mockEnv as any, mockCtx);

    expect(mockBucket.put).toHaveBeenCalled();
  });
});

describe('Integration: HTTP Request Handler', () => {
  it('should reject direct GET requests with appropriate message', async () => {
    const mockEnv = {
      RSS_STORAGE: {} as R2Bucket,
      RSS_FEED_BASE_URL: 'https://www.knue.ac.kr/rssBbsNtt.do',
      BOARD_IDS: '25,26'
    };

    const request = new Request('https://knue-www-rss-parser-cf.kangdongouk.workers.dev/', {
      method: 'GET'
    });

    const response = await worker.fetch(request, mockEnv as any, {} as ExecutionContext);

    expect(response.status).toBe(405);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body = await response.json() as { error: string; message: string };
    expect(body.error).toBe('Method Not Allowed');
    expect(body.message).toContain('cron');
  });

  it('should reject POST requests', async () => {
    const mockEnv = {
      RSS_STORAGE: {} as R2Bucket,
      RSS_FEED_BASE_URL: 'https://www.knue.ac.kr/rssBbsNtt.do',
      BOARD_IDS: '25,26'
    };

    const request = new Request('https://knue-www-rss-parser-cf.kangdongouk.workers.dev/', {
      method: 'POST'
    });

    const response = await worker.fetch(request, mockEnv as any, {} as ExecutionContext);

    expect(response.status).toBe(405);
  });

  it('should reject PUT requests', async () => {
    const mockEnv = {
      RSS_STORAGE: {} as R2Bucket,
      RSS_FEED_BASE_URL: 'https://www.knue.ac.kr/rssBbsNtt.do',
      BOARD_IDS: '25,26'
    };

    const request = new Request('https://knue-www-rss-parser-cf.kangdongouk.workers.dev/', {
      method: 'PUT'
    });

    const response = await worker.fetch(request, mockEnv as any, {} as ExecutionContext);

    expect(response.status).toBe(405);
  });
});
