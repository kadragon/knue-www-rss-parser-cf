import { describe, it, expect } from 'vitest';
import { parseRSS } from '../../src/rss/parser';
import { readFileSync } from 'fs';
import { join } from 'path';

const fixtureXml = readFileSync(join(__dirname, '../../fixtures/sample-rss.xml'), 'utf-8');

describe('parseRSS', () => {
  it('should parse valid RSS XML with CDATA sections', () => {
    const result = parseRSS(fixtureXml);
    
    expect(result).toBeDefined();
    expect(result.title).toBe('RSS - 대학소식');
    expect(result.link).toBe('https://www.knue.ac.kr');
    expect(result.description).toBe('RSS - 대학소식');
  });

  it('should extract all items with standard fields', () => {
    const result = parseRSS(fixtureXml);
    
    expect(result.items).toHaveLength(3);
    
    const firstItem = result.items[0];
    expect(firstItem.title).toBe('2025년 캠퍼스 안심 소식지');
    expect(firstItem.link).toContain('nttNo=77561');
    expect(firstItem.pubDate).toBe('2025-10-16');
    expect(firstItem.department).toBe('인권센터');
    expect(firstItem.description).toContain('교제폭력 및 성범죄');
    expect(firstItem.articleId).toBe('77561');
  });

  it('should handle items with no attachments', () => {
    const result = parseRSS(fixtureXml);
    
    const firstItem = result.items[0];
    expect(firstItem.attachments).toEqual([]);
  });

  it('should parse items with 1 attachment', () => {
    const result = parseRSS(fixtureXml);
    
    const thirdItem = result.items[2];
    expect(thirdItem.attachments).toHaveLength(1);
    expect(thirdItem.attachments[0]).toEqual({
      filename: '공지.pdf',
      downloadUrl: 'https://www.knue.ac.kr/www/downloadBbsFile.do?atchmnflNo=76700',
      previewUrl: 'https://www.knue.ac.kr/www/previewBbsFile.do?atchmnflNo=76700'
    });
  });

  it('should parse items with 2+ attachments', () => {
    const result = parseRSS(fixtureXml);
    
    const secondItem = result.items[1];
    expect(secondItem.attachments).toHaveLength(2);
    expect(secondItem.attachments[0].filename).toBe('2024학년도 후기 학위수여식 행사 알림.jpg');
    expect(secondItem.attachments[1].filename).toBe('2024학년도 후기 학위수여식 행사 안내.hwp');
  });

  it('should handle missing optional fields (department)', () => {
    const result = parseRSS(fixtureXml);
    
    const thirdItem = result.items[2];
    expect(thirdItem.department).toBe('');
  });

  it('should throw on invalid XML', () => {
    const invalidXml = 'not valid xml';
    
    expect(() => parseRSS(invalidXml)).toThrow();
  });

  it('should preserve HTML in description', () => {
    const result = parseRSS(fixtureXml);
    
    const secondItem = result.items[1];
    expect(secondItem.description).toContain('<p>');
    expect(secondItem.description).toContain('<strong>');
  });

  it('should extract article ID from link', () => {
    const result = parseRSS(fixtureXml);
    
    expect(result.items[0].articleId).toBe('77561');
    expect(result.items[1].articleId).toBe('77500');
    expect(result.items[2].articleId).toBe('77400');
  });
});
