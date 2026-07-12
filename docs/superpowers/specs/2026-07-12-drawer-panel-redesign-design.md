# 드로어 패널 리디자인 설계

날짜: 2026-07-12
상태: 승인됨

## 목표

확장앱의 드로어 패널을 목업 디자인에 맞춰 다시 만든다. 우측 가장자리에 떠 있는 회색 박스를,
페이지를 밀어내고 도킹되는 앰버 톤 사이드바로 바꾼다.

캡처 방식(드래그 선택 → "서랍에 담기")과 삽입 동작(카드 클릭 → 프롬프트에 삽입)은 그대로 둔다.
이번 작업은 **패널 리스타일과 도킹**까지다.

## 범위 밖 (YAGNI)

- 답변 본문 단어 클릭으로 질문 담기 (본문 DOM 하이라이팅). 별도 사이클.
- 패널 안에서 질문 직접 입력. 푸터에 안내 문구만 두고 기능은 넣지 않는다.
- 랜딩 페이지.
- 패널 너비 리사이즈, 열림 상태 영속화.

## 레이아웃과 도킹

패널은 우측 전체 높이, 너비 320px, shadow root 안에서 `position: fixed`.
왼쪽 가장자리에 손잡이 탭이 붙어 열고 닫는다. 열림 상태는 `DrawerPanel`이 in-memory로 소유한다.

밀어내기는 host 문서에 주입한 전역 스타일시트 한 장으로 처리한다.

- 열리면 `<html>`에 `qd-docked` 클래스를 붙인다 → `html.qd-docked { margin-right: 320px; }`
- 닫히면 클래스를 뗀다 → 페이지 원복.
- 사이트별로 뷰포트에 `fixed`로 붙어 패널과 겹치는 요소는 `SiteAdapter.layoutCss`가 보정 규칙을 제공한다.

**안전장치**: 밀어내기가 host 페이지 변경으로 깨져도 패널 자체는 `fixed` 오버레이로 계속 동작한다.
레이아웃이 겹칠 뿐 캡처·삽입 기능은 살아 있다.

**대안 검토**: 사이트별 컨테이너 선택자에 직접 width를 주는 방식은 더 정확하지만,
두 사이트 모두 난독화된 클래스를 써서 리디자인마다 깨진다. 채택하지 않는다.

## 비주얼

강조색은 앰버 하나. 로고의 보라는 헤더 아이콘에만 쓴다.

- 패널 배경: 따뜻한 앰버 틴트, 좌측에 얇은 경계선
- 질문 카드: 흰 배경, 연한 앰버 보더, 라운드 12px, 옅은 그림자
- 최신 항목: 앰버 보더 강조 + 앰버 틴트 배경 + `✦` 아이콘 + 하단 "방금 담김" 라벨
- 일반 항목: `?` 아이콘 + 질문 텍스트, 2줄 초과 시 말줄임
- 삭제 `×`: hover 시에만 노출

구조는 위에서 아래로 네 덩어리다.

1. **헤더** — 서랍 아이콘 + "질문서랍". 아래 부제 "떠오른 질문 N개 · 클릭하면 바로 질문".
   항목이 없으면 부제 자리에 안내 문구를 넣는다.
2. **목록** — `createdAt` 내림차순(최신이 위). 카드 클릭 = 프롬프트 삽입.
3. **빈 상태** — "답변에서 궁금한 부분을 드래그해 담아보세요"
4. **푸터** — 점선 구분선 + "답변의 단어를 클릭하거나 직접 질문을 적어 담아보세요"

### "방금 담김" 판정

`createdAt`이 현재 시각 기준 8초 이내인 **최신 1건**에만 강조를 준다.
타이머가 만료되면 일반 카드로 돌아간다. 스토리지 스키마에 새 필드를 추가하지 않는다.

### 다크 모드

호스트 페이지 테마를 따라간다. OS 설정(`prefers-color-scheme`)이 아니라 페이지 테마를 봐야 한다 —
claude.ai와 ChatGPT 모두 앱 안에 자체 테마 토글이 있기 때문이다.

판정 순서: `<html>`의 `dark` 클래스 → `data-theme` → `data-mode` → 없으면 `prefers-color-scheme`.
`MutationObserver`로 토글을 따라간다. 두 사이트 모두 `<html>`에 표식을 두므로 사이트별 분기는 필요 없다.

Tailwind v4에서 shadow root 안 `dark:` 유틸리티가 이 판정을 따르게 하려면 커스텀 variant가 필요하다:

```css
@custom-variant dark (&:where(.qd-dark, .qd-dark *));
```

`qd-dark` 클래스는 shadow root 최상위 래퍼에 붙인다.

## 파일 변경

| 파일 | 변경 |
|------|------|
| `src/lib/theme.ts` | 신규. `detectHostTheme()` + `useHostTheme()` |
| `src/lib/dock.ts` | 신규. `applyDock(open)` / `cleanupDock()` |
| `src/ui/DrawerItemCard.tsx` | 신규. 카드 1개 렌더링 |
| `src/ui/DrawerPanel.tsx` | 재작성. 헤더 / 목록 / 빈 상태 / 푸터 / 손잡이 탭 |
| `src/lib/site-adapter.ts` | `SiteAdapter`에 `layoutCss?: string` 추가 |
| `assets/tailwind.css` | `@custom-variant dark` + 앰버/뉴트럴 색 토큰 |
| `entrypoints/content/index.tsx` | 언마운트 시 `cleanupDock()` |
| `src/ui/App.tsx` | 변경 없음 |

카드를 별도 컴포넌트로 뽑는 이유는 `DrawerPanel`이 커지는 걸 막기 위해서다.
패널은 배치와 상태를, 카드는 항목 하나의 표현을 책임진다.

## 데이터 흐름

변경 없음. `useDrawerItems()`가 `drawerStorage`를 구독하고, 패널은 받은 배열을 정렬해 렌더링한다.
클릭 → `onItemClick(item)` → `App`이 adapter로 삽입, 실패 시 클립보드 폴백 (기존 그대로).

## 에러 처리

- adapter 없음: content script가 마운트하지 않음 (기존 그대로)
- 삽입 실패: 클립보드 복사 + 토스트 (기존 그대로)
- 도킹 CSS 주입 실패: 패널은 오버레이로 계속 동작. 조용히 넘어간다 (기능 손실 없음)

## 테스트

- `DrawerPanel.test.tsx` 갱신 — 헤더 개수 문구, 최신순 정렬, 빈 상태, 삭제 호출, 손잡이 토글
- `DrawerItemCard.test.tsx` 신규 — `createdAt` 기준 "방금 담김" 강조 on/off (fake timers)
- `dock.test.ts` 신규 — 열림/닫힘에 따른 `html.qd-docked` 토글, `cleanupDock()` 후 스타일 제거
- `theme.test.ts` 신규 — 표식별 판정, `MutationObserver` 변경 추적
- `e2e/drawer.spec.ts` — 셀렉터를 새 마크업에 맞춰 갱신. 캡처 → 삽입 플로우가 통과하는지 확인
