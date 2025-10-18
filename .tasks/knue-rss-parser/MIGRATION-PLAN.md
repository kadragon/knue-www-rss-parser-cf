# HTML-to-Text Migration Plan

## 선정 라이브러리: `html-to-text` v9.0.5+

### 선정 사유
- **Trust Score**: 4.9 (업계 표준)
- **Code Snippets**: 19개 (충분한 문서)
- **Workers 호환성**: ✅ 순수 JavaScript (DOM 의존성 없음)
- **마크다운 변환**: 기본 지원 (옵션: `html-to-md`)
- **한글 지원**: ✅ 검증됨 (KNUE RSS 요구사항)

### 기존 스택 대비 개선
| 항목 | 기존 (linkedom + turndown) | 신규 (html-to-text) |
|------|---------------------------|-------------------|
| Workers 호환성 | ❌ (createHTMLDocument 미지원) | ✅ (DOM 비의존) |
| 마크다운 변환 | ✅ | ✅ (더 간단) |
| 번들 크기 | 큼 | 작음 |
| 한글 처리 | 불안정 | ✅ 검증됨 |

## 마이그레이션 단계

### 1단계: 의존성 변경
```json
// 제거
- "linkedom": "^0.18.12"
- "turndown": "^7.2.0"
- "@types/turndown": "^5.0.5"

// 추가
+ "html-to-text": "^9.0.5"
+ "@types/html-to-text": "^9.0.4"
```

### 2단계: html-converter.ts 마이그레이션
- **Before**: parseHTML + turndownService + globalThis 수정
- **After**: `convert()` 함수 + 마크다운 옵션

### 3단계: 테스트 검증
- 기존 모든 html-converter.test.ts 케이스 통과
- Board 256 (에러 케이스) 통과
- 한글 및 특수 문자 처리 검증

### 4단계: 전체 통합 테스트
- workflow.test.ts 통과 (integration 전체)
- lint, typecheck 통과

## 구현 세부사항

### html-to-text 설정 (마크다운 변환)
```typescript
const options = {
  wordwrap: 80,
  selectors: [
    // 링크 형식 유지
    { selector: 'a', options: { baseUrl: 'https://www.knue.ac.kr' } },
    // 본문 텍스트 보존
    { selector: 'p', format: 'paragraph' },
    { selector: 'strong', format: 'bold' },
    { selector: 'em', format: 'emphasis' }
  ]
};
```

### 변환 로직
```typescript
import { convert } from 'html-to-text';

export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '') {
    return '';
  }
  
  return convert(html, options).trim();
}
```

### 예상 결과
- 함수 시그니처 변경 없음 (호환성 유지)
- 출력 형식 동일 (테스트 케이스 재활용)
- Cloudflare Workers 환경 완벽 지원

## 롤백 계획
- Git branch: `feat/html-to-text-migration`
- 테스트 실패 시: 이전 커밋으로 즉시 복구
- 의존성: package-lock.json에 기록됨

## 예상 이슈 & 해결책
| 이슈 | 원인 | 해결책 |
|------|------|--------|
| 마크다운 포맷 미미한 차이 | 변환 엔진 다름 | 테스트 케이스 미세 조정 |
| 한글 이모지 처리 | html-to-text 기본 동작 | 커스텀 formatter 추가 |
| 링크 형식 차이 | baseUrl 설정 | selector 옵션 튜닝 |
