import { describe, it, expect } from 'vitest';
import { parseRSS } from '../../src/rss/parser';
import { readFileSync } from 'fs';
import { join } from 'path';

const escapedXml = readFileSync(join(__dirname, '../../fixtures/sample-rss-escaped.xml'), 'utf-8');

describe('parseRSS - HTML Entity Decoding', () => {
  it('should decode HTML entities in CDATA description fields', () => {
    const result = parseRSS(escapedXml);
    
    const firstItem = result.items[0];
    expect(firstItem.description).toContain('<p>');
    expect(firstItem.description).toContain('</p>');
    expect(firstItem.description).not.toContain('&lt;');
    expect(firstItem.description).not.toContain('&gt;');
  });

  it('should decode &lt;strong&gt; tags correctly', () => {
    const result = parseRSS(escapedXml);
    
    const secondItem = result.items[1];
    expect(secondItem.description).toContain('<strong>');
    expect(secondItem.description).toContain('</strong>');
    expect(secondItem.description).not.toContain('&lt;strong&gt;');
  });

  it('should preserve Korean text content during entity decoding', () => {
    const result = parseRSS(escapedXml);
    
    const firstItem = result.items[0];
    expect(firstItem.description).toContain('교제폭력 및 성범죄를 예방하고');
    expect(firstItem.description).toContain('성인지감수성을 높이기 바랍니다');
  });
});
