import { describe, it, expect, vi } from 'vitest';
import { writeToR2 } from '../../src/storage/r2-writer';

describe('writeToR2', () => {
  it('should write content when file does not exist', async () => {
    const mockBucket = {
      head: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined)
    } as any;

    const content = '# Test Markdown\nContent here';

    const result = await writeToR2(mockBucket, content, '25', '2025-10-17', '77561');

    expect(mockBucket.head).toHaveBeenCalledWith('rss/25/2025_10_17_77561.md');
    expect(mockBucket.put).toHaveBeenCalledWith(
      'rss/25/2025_10_17_77561.md',
      content,
      expect.objectContaining({
        httpMetadata: expect.objectContaining({
          contentType: 'text/markdown; charset=utf-8'
        })
      })
    );
    expect(result).toEqual({
      saved: true,
      reason: 'new',
      key: 'rss/25/2025_10_17_77561.md'
    });
  });

  it('should skip write when file already exists', async () => {
    const mockBucket = {
      head: vi.fn().mockResolvedValue({ 
        key: 'rss/25/2025_10_17_77561.md',
        size: 1234
      }),
      put: vi.fn()
    } as any;

    const content = '# Test Markdown\nContent here';

    const result = await writeToR2(mockBucket, content, '25', '2025-10-17', '77561');

    expect(mockBucket.head).toHaveBeenCalledWith('rss/25/2025_10_17_77561.md');
    expect(mockBucket.put).not.toHaveBeenCalled();
    expect(result).toEqual({
      saved: false,
      reason: 'exists',
      key: 'rss/25/2025_10_17_77561.md'
    });
  });

  it('should set Content-Type header', async () => {
    const mockBucket = {
      head: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined)
    } as any;

    const content = '# Test';

    await writeToR2(mockBucket, content, '25', '2025-10-17', '77561');

    const callArgs = mockBucket.put.mock.calls[0];
    expect(callArgs[2].httpMetadata.contentType).toBe('text/markdown; charset=utf-8');
  });

  it('should handle R2 write errors', async () => {
    const mockBucket = {
      head: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockRejectedValue(new Error('R2 write failed'))
    } as any;

    const content = '# Test';

    await expect(writeToR2(mockBucket, content, '25', '2025-10-17', '77561')).rejects.toThrow('R2 write failed');
  });

  it('should handle R2 head errors', async () => {
    const mockBucket = {
      head: vi.fn().mockRejectedValue(new Error('R2 head failed')),
      put: vi.fn()
    } as any;

    const content = '# Test';

    await expect(writeToR2(mockBucket, content, '25', '2025-10-17', '77561')).rejects.toThrow('R2 head failed');
    expect(mockBucket.put).not.toHaveBeenCalled();
  });

  it('should handle different board indices', async () => {
    const mockBucket = {
      head: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined)
    } as any;

    const content = '# Test';

    await writeToR2(mockBucket, content, '25', '2025-10-17', '77561');
    await writeToR2(mockBucket, content, '30', '2025-10-17', '77561');

    expect(mockBucket.put).toHaveBeenNthCalledWith(
      1,
      'rss/25/2025_10_17_77561.md',
      content,
      expect.any(Object)
    );
    expect(mockBucket.put).toHaveBeenNthCalledWith(
      2,
      'rss/30/2025_10_17_77561.md',
      content,
      expect.any(Object)
    );
  });

  it('should handle different article IDs', async () => {
    const mockBucket = {
      head: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined)
    } as any;

    const content = '# Test';

    await writeToR2(mockBucket, content, '25', '2025-10-17', '77561');
    await writeToR2(mockBucket, content, '25', '2025-10-17', '77500');

    expect(mockBucket.put).toHaveBeenNthCalledWith(
      1,
      'rss/25/2025_10_17_77561.md',
      content,
      expect.any(Object)
    );
    expect(mockBucket.put).toHaveBeenNthCalledWith(
      2,
      'rss/25/2025_10_17_77500.md',
      content,
      expect.any(Object)
    );
  });

  it('should handle Korean content', async () => {
    const mockBucket = {
      head: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined)
    } as any;

    const content = '# 한국어 제목\n테스트 내용입니다.';

    await writeToR2(mockBucket, content, '25', '2025-10-17', '77561');

    expect(mockBucket.put).toHaveBeenCalledWith(
      'rss/25/2025_10_17_77561.md',
      content,
      expect.any(Object)
    );
  });
});
