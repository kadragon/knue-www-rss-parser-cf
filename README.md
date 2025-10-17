# KNUE RSS Parser - Cloudflare Workers

KNUE 게시판 RSS 피드를 파싱하여 Markdown 파일로 Cloudflare R2에 저장하는 Worker 애플리케이션입니다.

## 기능

- 매일 새벽 1시(Asia/Seoul)에 자동 실행 (UTC 4PM)
- **다중 게시판 지원** (6~10개 게시판 동시 처리)
- KNUE RSS 피드 가져오기 및 파싱
- HTML 콘텐츠를 Markdown으로 변환
- 첨부파일 링크 포함
- Cloudflare R2에 게시판별/게시글별로 저장 (`rss/{board_id}/{yyyy}_{mm}_{dd}_{article_id}.md`)
- 부분 실패 허용 (일부 게시판 실패해도 나머지 처리 계속)

## 아키텍처

```
Multiple RSS Feeds (Board 25, 26, 11, ...)
    ↓
    ├─→ Board 25 → Fetcher → Parser → Markdown Converter → R2
    ├─→ Board 26 → Fetcher → Parser → Markdown Converter → R2
    └─→ Board 11 → Fetcher → Parser → Markdown Converter → R2
                                                               ↓
                                    rss/{board_id}/{yyyy}_{mm}_{dd}_{article_id}.md
```

## 프로젝트 구조

```
src/
├── index.ts              # Worker 엔트리 포인트 (scheduled handler)
├── rss/
│   ├── fetcher.ts        # RSS 피드 가져오기
│   └── parser.ts         # RSS XML 파싱
├── markdown/
│   ├── html-converter.ts # HTML → Markdown 변환
│   └── converter.ts      # RSS → Markdown 변환
├── storage/
│   └── r2-writer.ts      # R2 쓰기 작업
└── utils/
    └── datetime.ts       # 날짜/시간 유틸리티

test/                     # 유닛 및 통합 테스트
fixtures/                 # 테스트 픽스처
```

## 설정

### 사전 요구사항

- Node.js >= 18.x
- Cloudflare 계정
- Wrangler CLI

### 설치

```bash
npm install
```

### R2 버킷 생성

```bash
npx wrangler r2 bucket create knue-rss-archive
```

### 환경 변수

**프로덕션 설정** (`wrangler.jsonc`에서 설정):
- `RSS_FEED_BASE_URL`: KNUE RSS 피드 기본 URL (`https://www.knue.ac.kr/rssBbsNtt.do`)
- `BOARD_IDS`: 쉼표로 구분된 게시판 ID 목록 (예: `"25,26,11,207,28,256"`)
- `RSS_STORAGE`: R2 버킷 바인딩 (`knue-vectorstore`)

**로컬 개발 환경**:
1. `.env.example`를 `.env.local`로 복사:
   ```bash
   cp .env.example .env.local
   ```
2. 필요시 값 수정 (기본값은 wrangler.jsonc와 동일)
3. 로컬 테스트 시 자동으로 로드됨

## 개발

### 로컬 테스트

```bash
# 유닛 테스트 실행
npm test

# 테스트 커버리지 확인
npm run test:coverage

# Cron 트리거 시뮬레이션
npm run dev
curl "http://localhost:8787/__scheduled?cron=0+16+*+*+*"
```

### 배포

```bash
npm run deploy
```

### CI/CD 파이프라인

GitHub Actions를 통해 자동으로 검증 및 배포됩니다:

- **Test Workflow** (`.github/workflows/test.yml`)
  - PR과 main branch push에 트리거
  - Node.js 18, 20 버전 테스트
  - Lint, Type checking, Unit tests, Coverage thresholds 검증

- **Deploy Workflow** (`.github/workflows/deploy.yml`)
  - main branch push에만 트리거 (Test 통과 후)
  - 자동 배포 to Cloudflare Workers
  - 필요한 secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

**필수 Repository Secrets:**
```
CLOUDFLARE_API_TOKEN       # Cloudflare API token
CLOUDFLARE_ACCOUNT_ID      # Cloudflare account ID
```

## 테스트 커버리지

- RSS Fetcher: 5 tests
- RSS Parser: 9 tests (+ article ID extraction)
- HTML Converter: 8 tests
- Markdown Converter: 8 tests
- R2 Writer: 6 tests
- Datetime Utilities: 7 tests
- Integration: 6 tests (+ multi-board scenarios)

**Total: 49 tests passing**

### Integration Tests
- ✅ 다중 게시판 동시 처리
- ✅ 단일 게시판 처리
- ✅ 일부 게시판 실패 시 나머지 계속 처리
- ✅ 모든 게시판 실패 시 에러
- ✅ 잘못된 XML 처리
- ✅ R2 쓰기 부분 실패

## 설정 가이드

### 게시판 추가/제거

`wrangler.jsonc`에서 `BOARD_IDS` 수정:

```jsonc
{
  "vars": {
    "BOARD_IDS": "25,26,11,207,28,256"  // 쉼표로 구분
  }
}
```

### 저장 경로 구조

- 게시판 25의 2025-10-16 게시글 77561: `rss/25/2025_10_16_77561.md`
- 게시판 26의 2025-10-15 게시글 77500: `rss/26/2025_10_15_77500.md`

### 실행 로그 예시

```
📋 Processing 6 boards: 25, 26, 11, 207, 28, 256

🔄 [Board 25] Fetching RSS...
✓ [Board 25] RSS feed fetched
✓ [Board 25] Parsed 5 items
✓ [Board 25] Saved 5 articles

🔄 [Board 26] Fetching RSS...
✓ [Board 26] RSS feed fetched
✓ [Board 26] Parsed 3 items
✓ [Board 26] Saved 3 articles

...

✅ RSS archival completed in 450ms
📊 Total: 23 articles saved, 0 boards failed
```

## Cron 스케줄

- `0 16 * * *` - 매일 1:00 AM Asia/Seoul (UTC 4PM 전날)
- 약 6개 게시판 × 평균 5개 게시글 = 약 30개 파일 저장

## 라이선스

ISC
