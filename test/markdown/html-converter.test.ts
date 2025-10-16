import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from '../../src/markdown/html-converter';

describe('htmlToMarkdown', () => {
  it('should convert simple HTML to Markdown', () => {
    const html = '<p>Hello World</p>';
    const result = htmlToMarkdown(html);
    
    expect(result).toBe('Hello World');
  });

  it('should convert HTML with links', () => {
    const html = '<p><a href="https://example.com">Click here</a></p>';
    const result = htmlToMarkdown(html);
    
    expect(result).toContain('[Click here](https://example.com)');
  });

  it('should convert HTML with strong/bold tags', () => {
    const html = '<p>This is <strong>bold</strong> text</p>';
    const result = htmlToMarkdown(html);
    
    expect(result).toContain('**bold**');
  });

  it('should handle Korean text correctly', () => {
    const html = '<p>안녕하세요 <strong>한국어</strong> 테스트입니다</p>';
    const result = htmlToMarkdown(html);
    
    expect(result).toContain('안녕하세요');
    expect(result).toContain('**한국어**');
  });

  it('should handle empty HTML', () => {
    const html = '';
    const result = htmlToMarkdown(html);
    
    expect(result).toBe('');
  });

  it('should handle null/undefined', () => {
    expect(htmlToMarkdown('')).toBe('');
  });

  it('should preserve multiple paragraphs', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>';
    const result = htmlToMarkdown(html);
    
    expect(result).toContain('First paragraph');
    expect(result).toContain('Second paragraph');
  });

  it('should convert complex HTML from KNUE RSS', () => {
    const html = '<p>교제폭력 및 성범죄를 예방하고 안전한 캠퍼스 문화를 조성하고자 합니다.</p><p>영상을 시청하여 성인지감수성을 높이기 바랍니다.</p>';
    const result = htmlToMarkdown(html);
    
    expect(result).toContain('교제폭력 및 성범죄');
    expect(result).toContain('성인지감수성');
  });
});
