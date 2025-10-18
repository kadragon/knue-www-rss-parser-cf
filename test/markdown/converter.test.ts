import { describe, it, expect } from 'vitest';
import { convertToMarkdown } from '../../src/markdown/converter';
import type { RSSFeed } from '../../src/rss/parser';

describe('convertToMarkdown', () => {
  const sampleFeed: RSSFeed = {
    title: 'RSS - 대학소식',
    link: 'https://www.knue.ac.kr',
    description: 'RSS - 대학소식',
    items: [
      {
        title: '2025년 캠퍼스 안심 소식지',
        link: 'https://www.knue.ac.kr/www/selectBbsNttView.do?key=806&bbsNo=25&nttNo=77561',
        pubDate: '2025-10-16',
        department: '인권센터',
        description: '<p>교제폭력 및 성범죄를 예방하고 안전한 캠퍼스 문화를 조성하고자 합니다.</p>',
        attachments: [],
      articleId: '77561'
      },
      {
        title: '2024학년도 후기 학위수여식 안내',
        link: 'https://www.knue.ac.kr/www/selectBbsNttView.do?key=806&bbsNo=25&nttNo=77500',
        pubDate: '2025-10-15',
        department: '교무처',
        description: '<p>2024학년도 후기 학위수여식을 <strong>아래와 같이</strong> 안내합니다.</p>',
        attachments: [
          {
            filename: '행사 알림.jpg',
            downloadUrl: 'https://www.knue.ac.kr/www/downloadBbsFile.do?atchmnflNo=76744',
            previewUrl: 'https://www.knue.ac.kr/www/previewBbsFile.do?atchmnflNo=76744'
          },
          {
            filename: '행사 안내.hwp',
            downloadUrl: 'https://www.knue.ac.kr/www/downloadBbsFile.do?atchmnflNo=76745',
            previewUrl: 'https://www.knue.ac.kr/www/previewBbsFile.do?atchmnflNo=76745'
          }
        ],
        articleId: '77500'
      }
    ]
  };

  it('should include feed metadata header', () => {
    const generatedAt = new Date('2025-10-17T01:00:00Z');
    const result = convertToMarkdown(sampleFeed, generatedAt);

    expect(result).toContain('# RSS - 대학소식');
    expect(result).toContain('**Source**: https://www.knue.ac.kr');
    expect(result).toContain('**Description**: RSS - 대학소식');
    expect(result).toContain('**Generated**:');
  });

  it('should format each item correctly', () => {
    const generatedAt = new Date('2025-10-17T01:00:00Z');
    const result = convertToMarkdown(sampleFeed, generatedAt);

    expect(result).toContain('## [2025년 캠퍼스 안심 소식지](https://www.knue.ac.kr/www/selectBbsNttView.do?key=806&bbsNo=25&nttNo=77561)');
    expect(result).toContain('**Published**: 2025-10-16');
    expect(result).toContain('**Department**: 인권센터');
  });

  it('should convert HTML description to Markdown', () => {
    const generatedAt = new Date('2025-10-17T01:00:00Z');
    const result = convertToMarkdown(sampleFeed, generatedAt);

    expect(result).toContain('교제폭력 및 성범죄를 예방하고');
    expect(result).toContain('아래와 같이');
  });

  it('should include attachments section when present', () => {
    const generatedAt = new Date('2025-10-17T01:00:00Z');
    const result = convertToMarkdown(sampleFeed, generatedAt);

    expect(result).toContain('### 첨부파일');
    expect(result).toContain('[행사 알림.jpg](https://www.knue.ac.kr/www/downloadBbsFile.do?atchmnflNo=76744)');
    expect(result).toContain('[행사 안내.hwp](https://www.knue.ac.kr/www/downloadBbsFile.do?atchmnflNo=76745)');
  });

  it('should omit attachments section when empty', () => {
    const generatedAt = new Date('2025-10-17T01:00:00Z');
    const result = convertToMarkdown(sampleFeed, generatedAt);

    const firstItemSection = result.split('---')[1];
    expect(firstItemSection).not.toContain('### 첨부파일');
  });

  it('should handle empty items array', () => {
    const emptyFeed: RSSFeed = {
      ...sampleFeed,
      items: []
    };
    const generatedAt = new Date('2025-10-17T01:00:00Z');
    const result = convertToMarkdown(emptyFeed, generatedAt);

    expect(result).toContain('# RSS - 대학소식');
    expect(result).not.toContain('##');
  });

  it('should separate items with horizontal rules', () => {
    const generatedAt = new Date('2025-10-17T01:00:00Z');
    const result = convertToMarkdown(sampleFeed, generatedAt);

    const hrCount = (result.match(/---/g) || []).length;
    expect(hrCount).toBeGreaterThanOrEqual(sampleFeed.items.length);
  });

  it('should handle missing department field', () => {
    const feedWithoutDept: RSSFeed = {
      ...sampleFeed,
      items: [{
        ...sampleFeed.items[0],
        department: ''
      }]
    };
    const generatedAt = new Date('2025-10-17T01:00:00Z');
    const result = convertToMarkdown(feedWithoutDept, generatedAt);

    expect(result).not.toContain('**Department**:');
  });
});
