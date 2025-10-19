import { describe, it, expect } from 'vitest';
import { formatDateISO, generateR2Key, getCutoffDateString } from '../../src/utils/datetime';

describe('datetime utilities', () => {
  describe('formatDateISO', () => {
    it('should format date in ISO format', () => {
      const date = new Date('2025-10-17T01:00:00Z');
      const result = formatDateISO(date);
      
      expect(result).toBe('2025-10-17T01:00:00.000Z');
    });

    it('should handle different dates consistently', () => {
      const date1 = new Date('2025-01-01T00:00:00Z');
      const date2 = new Date('2025-12-31T23:59:59Z');
      
      expect(formatDateISO(date1)).toContain('2025-01-01');
      expect(formatDateISO(date2)).toContain('2025-12-31');
    });
  });

  describe('generateR2Key', () => {
    it('should generate key in rss/board_idx/yyyy_mm_dd_article_id.md format', () => {
      const result = generateR2Key('25', '2025-10-17', '77561');
      
      expect(result).toBe('rss/25/2025_10_17_77561.md');
    });

    it('should handle different board indices', () => {
      const result1 = generateR2Key('25', '2025-10-17', '77561');
      const result2 = generateR2Key('30', '2025-10-17', '77561');
      
      expect(result1).toBe('rss/25/2025_10_17_77561.md');
      expect(result2).toBe('rss/30/2025_10_17_77561.md');
    });

    it('should handle different dates', () => {
      const result1 = generateR2Key('25', '2025-01-15', '12345');
      const result2 = generateR2Key('25', '2025-12-25', '67890');
      
      expect(result1).toBe('rss/25/2025_01_15_12345.md');
      expect(result2).toBe('rss/25/2025_12_25_67890.md');
    });

    it('should handle different article IDs', () => {
      const result1 = generateR2Key('25', '2025-10-17', '77561');
      const result2 = generateR2Key('25', '2025-10-17', '77500');
      
      expect(result1).toBe('rss/25/2025_10_17_77561.md');
      expect(result2).toBe('rss/25/2025_10_17_77500.md');
    });

    it('should throw error on invalid date format', () => {
      expect(() => generateR2Key('25', 'invalid-date', '77561')).toThrow('Invalid date format');
    });
  });

  describe('getCutoffDateString', () => {
    it('computes cutoff using Asia/Seoul date when execution crosses UTC day boundary', () => {
      const baseline = new Date('2025-10-19T15:30:00Z'); // 2025-10-20 00:30:00 KST
      const cutoff = getCutoffDateString(baseline, 2);

      expect(cutoff).toBe('2023-10-20');
    });

    it('retains same local day when within KST daytime window', () => {
      const baseline = new Date('2025-10-19T12:00:00Z'); // 2025-10-19 21:00:00 KST
      const cutoff = getCutoffDateString(baseline, 2);

      expect(cutoff).toBe('2023-10-19');
    });

    it('handles leap-day baselines by clamping to month length', () => {
      const baseline = new Date('2024-02-28T15:00:00Z'); // 2024-02-29 00:00:00 KST
      const cutoff = getCutoffDateString(baseline, 2);

      expect(cutoff).toBe('2022-02-28');
    });
  });
});
