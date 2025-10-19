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
      head: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({
        objects: [],
        truncated: false
      }),
      delete: vi.fn().mockResolvedValue(undefined)
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
      head: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({
        objects: [],
        truncated: false
      }),
      delete: vi.fn().mockResolvedValue(undefined)
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
      head: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({
        objects: [],
        truncated: false
      }),
      delete: vi.fn().mockResolvedValue(undefined)
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
      head: vi.fn(),
      list: vi.fn().mockResolvedValue({
        objects: [],
        truncated: false
      }),
      delete: vi.fn()
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
      head: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({
        objects: [],
        truncated: false
      }),
      delete: vi.fn().mockResolvedValue(undefined)
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
      head: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({
        objects: [],
        truncated: false
      }),
      delete: vi.fn().mockResolvedValue(undefined)
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
  it('should skip items older than two years', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-19T00:00:00Z'));

    const oldItemPubDate = '2023-10-18';
    const recentItemPubDate = '2025-10-19';

    const feedWithOldItem = `
      <rss version="2.0">
        <channel>
          <title><![CDATA[ RSS - 테스트 ]]></title>
          <link>https://www.knue.ac.kr</link>
          <description><![CDATA[ RSS - 테스트 ]]></description>
          <item>
            <title><![CDATA[ 최근 공지 ]]></title>
            <link><![CDATA[ https://www.knue.ac.kr/www/selectBbsNttView.do?key=806&bbsNo=25&nttNo=90000 ]]></link>
            <pubDate><![CDATA[ ${recentItemPubDate} ]]></pubDate>
            <description><![CDATA[ <p>최근 공지입니다.</p> ]]></description>
          </item>
          <item>
            <title><![CDATA[ 예전 공지 ]]></title>
            <link><![CDATA[ https://www.knue.ac.kr/www/selectBbsNttView.do?key=806&bbsNo=25&nttNo=80000 ]]></link>
            <pubDate><![CDATA[ ${oldItemPubDate} ]]></pubDate>
            <description><![CDATA[ <p>예전 공지입니다.</p> ]]></description>
          </item>
        </channel>
      </rss>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => feedWithOldItem
    });

    const mockBucket = {
      put: vi.fn().mockResolvedValue(undefined),
      head: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({
        objects: [],
        truncated: false
      }),
      delete: vi.fn().mockResolvedValue(undefined)
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

    expect(mockBucket.put).toHaveBeenCalledTimes(1);
    expect(mockBucket.head).toHaveBeenCalledTimes(1);
    const [savedKey] = mockBucket.put.mock.calls[0];
    expect(savedKey).toBe('rss/25/2025_10_19_90000.md');
    vi.useRealTimers();
  });

  it('should delete articles older than two years from storage', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-19T00:00:00Z'));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => fixtureXml
    });

    const mockListResult = {
      objects: [
        { key: 'rss/25/2023_10_18_70000.md' },
        { key: 'rss/25/2024_10_19_71000.md' },
        { key: 'rss/25/2025_10_16_77561.md' }
      ],
      truncated: false
    };

    const mockBucket = {
      put: vi.fn().mockResolvedValue(undefined),
      head: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue(mockListResult),
      delete: vi.fn().mockResolvedValue(undefined)
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

    expect(mockBucket.list).toHaveBeenCalledWith({
      prefix: 'rss/25/',
      cursor: undefined,
      limit: 1000
    });
    expect(mockBucket.delete).toHaveBeenCalledTimes(1);
    expect(mockBucket.delete).toHaveBeenCalledWith(['rss/25/2023_10_18_70000.md']);
    vi.useRealTimers();
  });
});
