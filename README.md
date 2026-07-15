# 🗄️ 질문서랍 (Question Drawer)

Claude / ChatGPT 답변에서 궁금한 부분을 **드래그해 담아두고**, 나중에 클릭 한 번으로 후속 질문을 입력창에 꽂아주는 브라우저 확장입니다.

답변을 읽다 보면 "이건 나중에 따로 물어봐야지" 하는 단어들이 계속 쌓입니다. 질문서랍은 그 순간을 놓치지 않도록, 대화 흐름을 끊지 않고 궁금증을 사이드 서랍에 모아둡니다.

## ✨ 주요 기능

- **드래그 → 담기** — 답변에서 텍스트를 선택하면 나타나는 *서랍에 담기* 버튼으로 질문을 저장합니다.
- **클릭 → 질문 입력** — 담아둔 항목을 클릭하면 `"~에 대해 자세히 설명해줘"` 형태의 후속 질문을 대화 입력창에 자동으로 채워 넣습니다. 입력창을 못 찾으면 클립보드로 대체 복사합니다.
- **대화별 분리** — 항목은 URL의 대화 ID(`claude.ai/chat/<id>`, `chatgpt.com/c/<id>`)를 기준으로 그 대화에만 표시됩니다. 새 채팅에서 담은 항목은 대화 ID가 생기는 즉시 해당 대화에 자동으로 귀속됩니다.
- **사이드 도킹 서랍** — 화면 오른쪽에 접고 펼 수 있는 서랍 패널. 최신 질문이 목록 하단에 쌓이고 자동으로 스크롤됩니다.
- **다크 모드 대응** — 호스트 페이지(Claude/ChatGPT)의 테마를 따라갑니다.
- **로컬 저장** — 모든 데이터는 브라우저 로컬 스토리지에만 저장됩니다. 외부로 전송되지 않습니다.

## 🌐 지원 사이트

| 사이트 | 도메인 |
| --- | --- |
| Claude | `claude.ai` |
| ChatGPT | `chatgpt.com` |

## 🛠️ 기술 스택

- [WXT](https://wxt.dev/) — 브라우저 확장 프레임워크 (Manifest V3)
- [React 19](https://react.dev/) — Shadow DOM에 마운트되는 UI
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Zod](https://zod.dev/) — 스토리지 스키마 검증 및 마이그레이션
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) — 단위 테스트
- [Playwright](https://playwright.dev/) — E2E 테스트

## 🚀 시작하기

### 사전 요구사항

- Node.js 20+
- npm

### 설치

```bash
npm install
```

### 개발 모드

```bash
npm run dev            # Chrome
npm run dev:firefox    # Firefox
```

WXT 개발 서버가 확장을 빌드하고 브라우저에 자동으로 로드합니다.

### 프로덕션 빌드

```bash
npm run build          # Chrome  → .output/chrome-mv3
npm run build:firefox  # Firefox → .output/firefox-mv2
```

빌드된 확장은 브라우저의 확장 관리 페이지에서 *압축 해제된 확장 프로그램 로드*로 직접 불러올 수 있습니다.

### 배포용 압축

```bash
npm run zip            # Chrome
npm run zip:firefox    # Firefox
```

## 🧪 테스트 & 타입 체크

```bash
npm test        # Vitest 단위 테스트
npm run e2e     # Playwright E2E 테스트
npm run compile # tsc 타입 체크 (--noEmit)
```

## 📁 프로젝트 구조

```
question-drawer/
├── entrypoints/
│   └── content/          # 콘텐츠 스크립트 진입점 — Shadow DOM에 React 앱 마운트
├── src/
│   ├── ui/               # React 컴포넌트 & 훅
│   │   ├── App.tsx               # 캡처·삽입 로직을 잇는 루트 컴포넌트
│   │   ├── SelectionButton.tsx   # 드래그 선택 시 뜨는 "서랍에 담기" 버튼
│   │   ├── DrawerPanel.tsx       # 사이드 서랍 패널
│   │   └── DrawerItemCard.tsx    # 서랍 항목 카드
│   └── lib/              # 프레임워크에 독립적인 순수 로직
│       ├── schema.ts             # Zod 스토리지 스키마
│       ├── storage.ts            # 로컬 스토리지 접근 계층
│       ├── site-adapter.ts       # 사이트별 입력창 탐지·삽입 어댑터
│       ├── conversation.ts       # URL 기반 대화 ID 추적
│       ├── template.ts           # 후속 질문 문장 생성
│       ├── dock.ts               # 호스트 페이지 도킹(여백 조정)
│       └── theme.ts              # 호스트 테마 감지
├── public/icon/          # 확장 아이콘
└── wxt.config.ts         # WXT / 매니페스트 설정
```

## 🔒 권한

| 권한 | 용도 |
| --- | --- |
| `storage` | 담아둔 질문을 로컬에 저장 |
| `clipboardWrite` | 입력창을 못 찾았을 때 질문을 클립보드로 복사 |
| `host_permissions` | `claude.ai`, `chatgpt.com` 에서만 동작 |

## 📄 라이선스

Private project.
