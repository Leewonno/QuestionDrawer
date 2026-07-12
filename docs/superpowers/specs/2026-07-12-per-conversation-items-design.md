# 대화별 질문 분리 설계

날짜: 2026-07-12

## 문제

질문서랍의 항목은 현재 `local:drawer` 한 곳에 전부 쌓이고, `useDrawerItems`가 그걸 통째로 보여준다. 그래서 어떤 대화에서 담은 질문이든 모든 대화의 드로어에 똑같이 나타난다. 대화가 늘어날수록 드로어는 지금 보고 있는 대화와 무관한 질문으로 채워진다.

## 목표

드로어는 **지금 보고 있는 대화에서 담은 질문만** 보여준다. 다른 대화로 이동하면 드로어 내용도 그 대화의 것으로 바뀐다.

## 세션의 정의

세션 = URL의 대화 ID.

- Claude: `claude.ai/chat/<id>`
- ChatGPT: `chatgpt.com/c/<id>`, GPTs는 `chatgpt.com/g/<gizmo>/c/<id>`

대화 ID를 쓰면 탭을 닫았다 같은 대화를 다시 열거나 다른 탭에서 열어도 그 대화에 담아둔 질문이 그대로 보인다.

`claude.ai/new`, `chatgpt.com/` 처럼 아직 대화 ID가 없는 화면은 "대화 ID 없음"(`null`) 상태로 다룬다.

## 아키텍처

### 1. 대화 ID 감지 — `src/lib/conversation.ts` (신규)

```ts
export function getConversationId(url: string | URL): string | null
export function watchConversationId(cb: (id: string | null) => void): () => void
```

- `getConversationId`: URL 경로에서 대화 ID를 뽑는 순수 함수. Claude는 `/chat/<id>`, ChatGPT는 경로 어디든 `/c/<id>` 세그먼트에서 뽑는다. 매칭되는 게 없으면 `null`.
- `watchConversationId`: `history.pushState` / `history.replaceState`를 감싸고 `popstate`를 듣는다. 두 사이트 모두 첫 메시지를 보내면 새로고침 없이 URL만 바뀌므로, 이 구독이 있어야 "새 채팅 → 대화 생성" 전환을 잡을 수 있다. 값이 실제로 달라질 때만 콜백하고, 해제 함수가 원래 history 메서드를 복원한다.

UI에서 쓸 얇은 훅 `useConversationId()`도 함께 둔다(`src/ui/useConversationId.ts`).

### 2. 스키마 — `src/lib/schema.ts`

`DrawerItemSchema`에 필수 필드를 추가한다.

```ts
conversationId: z.string().nullable()
```

필수(옵셔널 아님)로 두는 것이 기존 데이터 정리 수단이다. 이 필드가 없는 예전 항목은 검증에 실패하고, `storage.ts`의 기존 `safeParse` 실패 경로가 상태를 빈 값으로 리셋한다. 별도 마이그레이션 코드는 쓰지 않는다.

### 3. 저장소 — `src/lib/storage.ts`

`getAll` / `add` / `remove` / `watch`는 그대로 두고(저장소는 보관만, 표시 규칙은 UI가 담당), 메서드 하나를 추가한다.

```ts
adopt(site: SiteId, conversationId: string): Promise<void>
```

`conversationId`가 `null`이고 `site`가 일치하는 항목의 `conversationId`를 주어진 값으로 바꿔 쓴다. 바꿀 항목이 없으면 쓰기를 건너뛴다(불필요한 `storage.watch` 알림 방지).

### 4. 캡처 — `src/lib/template.ts`, `src/ui/App.tsx`

`createDrawerItem(selectedText, site, conversationId)`로 인자를 하나 늘려, 담는 시점의 대화 ID를 항목에 박아둔다. 새 채팅 화면이면 `null`로 들어간다.

`App`은 `useConversationId()`로 현재 대화 ID를 들고 있다가, 값이 `null` → `<id>`로 바뀌는 순간 `drawerStorage.adopt(site, id)`를 호출한다. 이것이 "새 채팅에서 담아둔 질문이 첫 메시지를 보내는 순간 그 대화에 귀속되는" 동작이다.

`<id>` → 다른 `<id>` 전환에서는 귀속하지 않는다. 다른 대화의 항목을 끌어오면 안 된다.

### 5. 표시 — `src/ui/useDrawerItems.ts`, `src/ui/DrawerPanel.tsx`

`useDrawerItems(site, conversationId)`가 저장된 항목 중

```
item.site === site && item.conversationId === conversationId
```

인 것만 돌려준다. 대화 ID가 `null`인 새 채팅에서는 임시 보관 중인 항목이 보이므로, 담자마자 드로어에 뜨는 현재 경험이 유지된다.

`DrawerPanel`은 `site`를 prop으로 받아 훅에 넘긴다. 빈 상태 문구와 부제는 그대로 둔다 — 이제 "이 대화에 담은 질문"이라는 뜻이 되지만 문구 자체는 여전히 맞다.

## 데이터 흐름

```
URL 변경 (pushState/replaceState/popstate)
  └─ watchConversationId → useConversationId
       ├─ App: null → id 전환이면 drawerStorage.adopt(site, id)
       └─ useDrawerItems: 현재 (site, conversationId)로 항목 필터
              └─ DrawerPanel 렌더
```

## 에러 처리

- 알 수 없는 URL 형태: `getConversationId`가 `null`을 반환한다. 새 채팅과 동일하게 동작한다(임시 보관).
- `adopt` 실패: 기존 `add` 실패와 같은 방식으로 로깅하고 넘어간다. 항목은 `null`인 채 남아 다음 전환에서 다시 귀속을 시도한다.
- 예전 스키마 데이터: 검증 실패 → 상태 리셋(의도된 동작).

## 테스트

- `conversation.test.ts`: URL 파싱(Claude 대화, ChatGPT 대화, GPTs 경로, 새 채팅, 알 수 없는 경로), `watchConversationId`가 pushState/replaceState/popstate에 반응하는지, 같은 값에는 중복 호출하지 않는지, 해제 시 history 메서드가 복원되는지.
- `storage.test.ts`: `adopt`가 `null` 항목만 바꾸고 다른 대화·다른 사이트 항목은 건드리지 않는지, 바꿀 게 없으면 쓰지 않는지, 예전 스키마 상태가 리셋되는지.
- `useDrawerItems.test.ts`: `(site, conversationId)` 기준 필터링.
- e2e (`e2e/drawer.spec.ts`): 대화 A에서 담은 질문이 대화 B에서는 안 보이고, A로 돌아오면 다시 보이는지.

## 범위 밖 (YAGNI)

- 대화별 저장소 키 분리
- "모든 질문 보기" 전체 목록 뷰
- 오래된 대화의 항목 자동 정리
