# 대화별 질문 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 드로어가 지금 보고 있는 대화에서 담은 질문만 보여주도록, 항목에 대화 ID를 붙이고 현재 대화로 필터한다.

**Architecture:** URL 경로에서 대화 ID를 뽑는 순수 함수(`getConversationId`)와 SPA 이동을 감지하는 구독(`watchConversationId`)을 새로 만든다. `DrawerItem`에 `conversationId: string | null`을 필수 필드로 추가하고(예전 데이터는 Zod 검증 실패 → 기존 리셋 경로로 정리된다), 저장소는 지금처럼 단일 `local:drawer` 키를 유지한 채 UI가 현재 `(site, conversationId)`로 필터한다. 대화 ID가 없는 새 채팅에서 담은 항목은 `null`로 보관하다가, URL에 대화 ID가 생기는 순간 `drawerStorage.adopt`로 그 대화에 귀속시킨다.

**Tech Stack:** WXT (browser extension), React 19, Zod 4, Vitest + Testing Library (jsdom), Playwright (e2e), TypeScript.

**Spec:** `docs/superpowers/specs/2026-07-12-per-conversation-items-design.md`

## Global Constraints

- 단위 테스트: `npx vitest run <파일>` — 스토리지를 건드리는 테스트는 `beforeEach`에서 `fakeBrowser.reset()`을 호출한다 (`wxt/testing`).
- 타입 체크: `npm run compile` (`tsc --noEmit`). 각 태스크 커밋 전에 통과해야 한다.
- 프로덕션 코드에 `console.log` 금지. 로깅은 `@/src/lib/logger`의 `logger`를 쓴다.
- 불변 업데이트: 배열/객체는 스프레드로 새로 만든다. 기존 항목을 제자리 수정하지 않는다.
- 사용자에게 보이는 문구는 한국어. 기존 드로어 문구는 이번 작업에서 바꾸지 않는다.
- 소스 임포트는 `@/src/...` 별칭을 쓴다 (같은 디렉터리는 `./` 상대 경로).
- 커밋 메시지: `<type>: <description>` (feat, fix, refactor, docs, test, chore).

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/lib/conversation.ts` (신규) | URL → 대화 ID 파싱, SPA URL 변경 구독 |
| `src/lib/conversation.test.ts` (신규) | 위 두 함수의 단위 테스트 |
| `src/lib/schema.ts` (수정) | `DrawerItem`에 `conversationId` 필수 필드 추가 |
| `src/lib/template.ts` (수정) | `createDrawerItem`이 대화 ID를 받아 항목에 박음 |
| `src/lib/storage.ts` (수정) | `adopt(site, conversationId)` 추가 |
| `src/lib/storage.test.ts` (신규) | `adopt` 동작과 예전 스키마 리셋 검증 |
| `src/ui/useConversationId.ts` (신규) | `watchConversationId`를 감싼 React 훅 |
| `src/ui/useConversationId.test.ts` (신규) | 훅 단위 테스트 |
| `src/ui/useDrawerItems.ts` (수정) | `(site, conversationId)` 기준 필터 |
| `src/ui/useDrawerItems.test.ts` (신규) | 필터링 단위 테스트 |
| `src/ui/DrawerPanel.tsx` (수정) | `site` prop을 받아 훅에 넘김 |
| `src/ui/App.tsx` (수정) | 캡처 시 대화 ID 부착, `null → id` 전환 시 귀속 |
| `src/ui/App.test.tsx` (신규) | 귀속 동작 검증 |
| `e2e/drawer.spec.ts` (수정) | 대화 간 격리 e2e |

---

### Task 1: 대화 ID 감지 모듈

URL에서 대화 ID를 뽑는 순수 함수와, SPA 이동을 감지하는 구독 함수를 만든다. 아직 아무도 쓰지 않는 독립 모듈이므로 이 태스크만으로 테스트가 완결된다.

**Files:**
- Create: `src/lib/conversation.ts`
- Test: `src/lib/conversation.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `getConversationId(url?: string): string | null` — 인자를 안 주면 `location.href`를 본다.
  - `watchConversationId(cb: (id: string | null) => void): () => void` — 값이 실제로 바뀔 때만 콜백. 반환값은 구독 해제 함수.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/conversation.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getConversationId, watchConversationId } from './conversation';

afterEach(() => {
  history.replaceState(null, '', '/');
});

describe('getConversationId', () => {
  it('reads the id from a claude conversation url', () => {
    expect(getConversationId('https://claude.ai/chat/abc-123')).toBe('abc-123');
  });

  it('reads the id from a chatgpt conversation url', () => {
    expect(getConversationId('https://chatgpt.com/c/abc-123')).toBe('abc-123');
  });

  it('reads the id from a chatgpt GPTs conversation url', () => {
    expect(getConversationId('https://chatgpt.com/g/g-writer/c/abc-123')).toBe('abc-123');
  });

  it('ignores query strings and hashes', () => {
    expect(getConversationId('https://claude.ai/chat/abc-123?ref=x#top')).toBe('abc-123');
  });

  it('returns null on a new chat url', () => {
    expect(getConversationId('https://claude.ai/new')).toBeNull();
    expect(getConversationId('https://chatgpt.com/')).toBeNull();
  });

  it('returns null on an unknown path', () => {
    expect(getConversationId('https://claude.ai/settings/profile')).toBeNull();
  });

  it('falls back to the current location when no url is given', () => {
    history.replaceState(null, '', '/c/from-location');
    expect(getConversationId()).toBe('from-location');
  });
});

describe('watchConversationId', () => {
  it('fires on pushState when the id changes', () => {
    const cb = vi.fn();
    const stop = watchConversationId(cb);

    history.pushState(null, '', '/c/first');

    expect(cb).toHaveBeenCalledWith('first');
    stop();
  });

  it('fires on replaceState, which is how a new chat gains its id', () => {
    const cb = vi.fn();
    const stop = watchConversationId(cb);

    history.replaceState(null, '', '/c/fresh');

    expect(cb).toHaveBeenCalledWith('fresh');
    stop();
  });

  it('fires on popstate when the user goes back', async () => {
    history.pushState(null, '', '/c/first');
    const cb = vi.fn();
    const stop = watchConversationId(cb);

    history.pushState(null, '', '/c/second');
    cb.mockClear(); // pushState already reported 'second'
    history.back(); // jsdom fires popstate asynchronously

    await vi.waitFor(() => expect(cb).toHaveBeenCalledWith('first'));
    stop();
  });

  it('does not fire when the id is unchanged', () => {
    history.replaceState(null, '', '/c/same');
    const cb = vi.fn();
    const stop = watchConversationId(cb);

    history.pushState(null, '', '/c/same?scrolled=1');

    expect(cb).not.toHaveBeenCalled();
    stop();
  });

  it('restores the original history methods when stopped', () => {
    const original = history.pushState;
    const stop = watchConversationId(() => {});
    stop();

    expect(history.pushState).toBe(original);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/conversation.test.ts`
Expected: FAIL — `Failed to resolve import "./conversation"`

- [ ] **Step 3: 최소 구현**

`src/lib/conversation.ts`:

```ts
// Conversation id lives in the URL path, so it survives reloads and works in
// any tab: claude.ai/chat/<id>, chatgpt.com/c/<id>, chatgpt.com/g/<gizmo>/c/<id>.
// Matched by path shape only — the host is already narrowed by the content
// script's match patterns.
const PATTERNS = [/^\/chat\/([^/?#]+)/, /(?:^|\/)c\/([^/?#]+)/];

export function getConversationId(url: string = location.href): string | null {
  let pathname: string;
  try {
    pathname = new URL(url, location.href).pathname;
  } catch {
    return null;
  }
  for (const pattern of PATTERNS) {
    const match = pathname.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Both sites swap the URL without a reload — sending the first message in a new
// chat turns /new into /chat/<id> via history. Patch pushState/replaceState and
// listen for popstate so we see it.
export function watchConversationId(cb: (id: string | null) => void): () => void {
  let current = getConversationId();

  const emit = () => {
    const next = getConversationId();
    if (next === current) return;
    current = next;
    cb(next);
  };

  const { pushState, replaceState } = history;

  history.pushState = function (this: History, ...args: Parameters<History['pushState']>) {
    pushState.apply(this, args);
    emit();
  };
  history.replaceState = function (
    this: History,
    ...args: Parameters<History['replaceState']>
  ) {
    replaceState.apply(this, args);
    emit();
  };
  window.addEventListener('popstate', emit);

  return () => {
    history.pushState = pushState;
    history.replaceState = replaceState;
    window.removeEventListener('popstate', emit);
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/conversation.test.ts && npm run compile`
Expected: 테스트 PASS (7 + 5), tsc 출력 없음

- [ ] **Step 5: 커밋**

```bash
git add src/lib/conversation.ts src/lib/conversation.test.ts
git commit -m "feat: detect the active conversation id from the url"
```

---

### Task 2: 항목에 대화 ID 붙이기 (스키마 · 템플릿 · 저장소)

`DrawerItem`에 `conversationId`를 필수로 추가하고, 캡처 시 현재 대화 ID를 박고, 임시 보관 항목을 대화에 귀속시키는 `adopt`를 만든다. 스키마 변경이 호출부를 깨뜨리므로 호출부(`App.tsx`, `DrawerPanel.test.tsx`)까지 이 태스크에서 함께 고친다. 이 시점의 드로어는 아직 모든 항목을 보여준다 (필터는 Task 4).

**Files:**
- Modify: `src/lib/schema.ts`
- Modify: `src/lib/template.ts`
- Modify: `src/lib/storage.ts`
- Modify: `src/lib/template.test.ts`
- Modify: `src/ui/App.tsx:11-16` (handleCapture)
- Modify: `src/ui/DrawerPanel.test.tsx` (createDrawerItem 호출부)
- Test: `src/lib/storage.test.ts` (신규)

**Interfaces:**
- Consumes: `getConversationId()` (Task 1)
- Produces:
  - `DrawerItem.conversationId: string | null`
  - `createDrawerItem(selectedText: string, site: 'claude' | 'chatgpt', conversationId: string | null): DrawerItem`
  - `drawerStorage.adopt(site: DrawerItem['site'], conversationId: string): Promise<void>`

- [ ] **Step 1: 실패하는 저장소 테스트 작성**

`src/lib/storage.test.ts` (신규):

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { storage } from 'wxt/utils/storage';
import { drawerStorage } from './storage';
import { createDrawerItem } from './template';

describe('drawerStorage.adopt', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('attaches the conversation id to items captured before the chat existed', async () => {
    await drawerStorage.add(createDrawerItem('pending', 'claude', null));

    await drawerStorage.adopt('claude', 'chat-1');

    const items = await drawerStorage.getAll();
    expect(items.map((i) => i.conversationId)).toEqual(['chat-1']);
  });

  it('leaves items that already belong to a conversation alone', async () => {
    await drawerStorage.add(createDrawerItem('owned', 'claude', 'chat-old'));

    await drawerStorage.adopt('claude', 'chat-new');

    const items = await drawerStorage.getAll();
    expect(items.map((i) => i.conversationId)).toEqual(['chat-old']);
  });

  it('leaves pending items from another site alone', async () => {
    await drawerStorage.add(createDrawerItem('other site', 'chatgpt', null));

    await drawerStorage.adopt('claude', 'chat-1');

    const items = await drawerStorage.getAll();
    expect(items.map((i) => i.conversationId)).toEqual([null]);
  });
});

describe('drawerStorage.getAll', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('drops pre-conversationId items, which fail validation', async () => {
    await storage.setItem('local:drawer', {
      items: [
        {
          id: 'old',
          selectedText: 'legacy',
          question: 'legacy에 대해 자세히 설명해줘',
          site: 'claude',
          createdAt: 1,
        },
      ],
    });

    expect(await drawerStorage.getAll()).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — `createDrawerItem`이 인자 3개를 안 받고 `drawerStorage.adopt`가 없어서 타입/런타임 에러

- [ ] **Step 3: 스키마에 필드 추가**

`src/lib/schema.ts`의 `DrawerItemSchema`를 다음으로 바꾼다. `conversationId`를 **필수**(옵셔널 아님)로 두는 게 핵심이다 — 이 필드가 없는 예전 항목은 검증에 실패하고, `storage.ts`에 이미 있는 실패 → 리셋 경로가 알아서 정리한다.

```ts
export const DrawerItemSchema = z.object({
  id: z.string(),
  selectedText: z.string(),
  question: z.string(),
  site: z.enum(['claude', 'chatgpt']),
  // null = 아직 대화 ID가 없는 새 채팅에서 담긴 항목. adopt()가 대화에 귀속시킨다.
  conversationId: z.string().nullable(),
  createdAt: z.number(),
});
```

- [ ] **Step 4: 템플릿에 인자 추가**

`src/lib/template.ts`의 `createDrawerItem`을 바꾼다:

```ts
export function createDrawerItem(
  selectedText: string,
  site: 'claude' | 'chatgpt',
  conversationId: string | null,
): DrawerItem {
  const text = selectedText.trim();
  return {
    id: crypto.randomUUID(),
    selectedText: text,
    question: buildQuestion(text),
    site,
    conversationId,
    createdAt: Date.now(),
  };
}
```

- [ ] **Step 5: 저장소에 adopt 추가**

`src/lib/storage.ts`의 `drawerStorage` 객체에 `remove` 다음으로 추가한다:

```ts
  // Items captured on a fresh chat have no conversation id yet. When the URL
  // gains one, they belong to that conversation.
  async adopt(site: DrawerItem['site'], conversationId: string): Promise<void> {
    const state = await read();
    const pending = state.items.some(
      (i) => i.site === site && i.conversationId === null,
    );
    // Skip the write so we don't wake every watcher for nothing.
    if (!pending) return;
    await write({
      items: state.items.map((i) =>
        i.site === site && i.conversationId === null ? { ...i, conversationId } : i,
      ),
    });
  },
```

- [ ] **Step 6: 호출부 수정**

`src/lib/template.test.ts`의 `createDrawerItem` 테스트를 바꾼다:

```ts
describe('createDrawerItem', () => {
  it('builds a complete item', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111');
    vi.spyOn(Date, 'now').mockReturnValue(42);
    const item = createDrawerItem('side effect', 'chatgpt', 'chat-1');
    expect(item).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      selectedText: 'side effect',
      question: 'side effect에 대해 자세히 설명해줘',
      site: 'chatgpt',
      conversationId: 'chat-1',
      createdAt: 42,
    });
  });

  it('keeps the conversation id null when the chat has none yet', () => {
    expect(createDrawerItem('side effect', 'chatgpt', null).conversationId).toBeNull();
  });
});
```

`src/ui/App.tsx`의 `handleCapture`를 바꾼다 (임포트에 `getConversationId` 추가):

```tsx
import { getConversationId } from '@/src/lib/conversation';
```

```tsx
  const handleCapture = (text: string) => {
    drawerStorage
      .add(createDrawerItem(text, site, getConversationId()))
      .catch((error) => {
        logger.error('failed to save drawer item', error);
        showToast('저장에 실패했어요');
      });
  };
```

`src/ui/DrawerPanel.test.tsx`의 `createDrawerItem(...)` 호출 6곳에 세 번째 인자 `null`을 추가한다. 예:

```tsx
await drawerStorage.add(createDrawerItem('side effect', 'claude', null));
```

```tsx
await drawerStorage.add({ ...createDrawerItem('older', 'claude', null), createdAt: 1000 });
await drawerStorage.add({ ...createDrawerItem('newer', 'claude', null), createdAt: 2000 });
```

- [ ] **Step 7: 통과 확인**

Run: `npm test && npm run compile`
Expected: 모든 테스트 PASS (신규 storage.test.ts 4개 포함), tsc 출력 없음

- [ ] **Step 8: 커밋**

```bash
git add src/lib/schema.ts src/lib/template.ts src/lib/template.test.ts src/lib/storage.ts src/lib/storage.test.ts src/ui/App.tsx src/ui/DrawerPanel.test.tsx
git commit -m "feat: stamp drawer items with the conversation they came from"
```

---

### Task 3: 대화 ID React 훅

`watchConversationId`를 React 상태로 감싼다. UI가 URL 변경에 반응하려면 필요하다.

**Files:**
- Create: `src/ui/useConversationId.ts`
- Test: `src/ui/useConversationId.test.ts`

**Interfaces:**
- Consumes: `getConversationId`, `watchConversationId` (Task 1)
- Produces: `useConversationId(): string | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/ui/useConversationId.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConversationId } from './useConversationId';

afterEach(() => {
  history.replaceState(null, '', '/');
});

describe('useConversationId', () => {
  it('starts with the id in the current url', () => {
    history.replaceState(null, '', '/c/chat-1');

    const { result } = renderHook(() => useConversationId());

    expect(result.current).toBe('chat-1');
  });

  it('is null on a new chat', () => {
    history.replaceState(null, '', '/new');

    const { result } = renderHook(() => useConversationId());

    expect(result.current).toBeNull();
  });

  it('updates when the SPA navigates to a conversation', () => {
    history.replaceState(null, '', '/new');
    const { result } = renderHook(() => useConversationId());

    act(() => {
      history.replaceState(null, '', '/c/chat-2');
    });

    expect(result.current).toBe('chat-2');
  });

  it('stops watching after unmount', () => {
    const original = history.pushState;
    const { unmount } = renderHook(() => useConversationId());

    unmount();

    expect(history.pushState).toBe(original);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/ui/useConversationId.test.ts`
Expected: FAIL — `Failed to resolve import "./useConversationId"`

- [ ] **Step 3: 최소 구현**

`src/ui/useConversationId.ts`:

```ts
import { useEffect, useState } from 'react';
import { getConversationId, watchConversationId } from '@/src/lib/conversation';

export function useConversationId(): string | null {
  const [id, setId] = useState<string | null>(() => getConversationId());

  useEffect(() => watchConversationId(setId), []);

  return id;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/ui/useConversationId.test.ts && npm run compile`
Expected: 테스트 4개 PASS, tsc 출력 없음

- [ ] **Step 5: 커밋**

```bash
git add src/ui/useConversationId.ts src/ui/useConversationId.test.ts
git commit -m "feat: expose the active conversation id to react"
```

---

### Task 4: 현재 대화의 질문만 표시

`useDrawerItems`가 `(site, conversationId)`로 필터하고, `DrawerPanel`이 `site` prop을 받아 현재 대화 ID와 함께 훅에 넘긴다. 이 태스크가 끝나면 요구사항의 본체(대화별 격리)가 동작한다.

**Files:**
- Modify: `src/ui/useDrawerItems.ts`
- Modify: `src/ui/DrawerPanel.tsx:9-14` (Props, 훅 호출)
- Modify: `src/ui/App.tsx:28` (DrawerPanel에 site 전달)
- Modify: `src/ui/DrawerPanel.test.tsx` (site prop 전달 + 대화 ID 부여)
- Test: `src/ui/useDrawerItems.test.ts` (신규)

**Interfaces:**
- Consumes: `drawerStorage` (Task 2), `useConversationId` (Task 3)
- Produces:
  - `useDrawerItems(site: DrawerItem['site'], conversationId: string | null): { items: DrawerItem[]; remove: (id: string) => void }`
  - `DrawerPanel` props: `{ site: SiteId; onItemClick: (item: DrawerItem) => void }`

- [ ] **Step 1: 실패하는 훅 테스트 작성**

`src/ui/useDrawerItems.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fakeBrowser } from 'wxt/testing';
import { useDrawerItems } from './useDrawerItems';
import { drawerStorage } from '@/src/lib/storage';
import { createDrawerItem } from '@/src/lib/template';

describe('useDrawerItems', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('shows only the items captured in the current conversation', async () => {
    await drawerStorage.add(createDrawerItem('mine', 'claude', 'chat-1'));
    await drawerStorage.add(createDrawerItem('theirs', 'claude', 'chat-2'));

    const { result } = renderHook(() => useDrawerItems('claude', 'chat-1'));

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].selectedText).toBe('mine');
  });

  it('shows pending items on a new chat', async () => {
    await drawerStorage.add(createDrawerItem('pending', 'claude', null));
    await drawerStorage.add(createDrawerItem('owned', 'claude', 'chat-1'));

    const { result } = renderHook(() => useDrawerItems('claude', null));

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].selectedText).toBe('pending');
  });

  it('does not leak items across sites', async () => {
    await drawerStorage.add(createDrawerItem('elsewhere', 'chatgpt', 'chat-1'));

    const { result } = renderHook(() => useDrawerItems('claude', 'chat-1'));

    await waitFor(() => expect(result.current.items).toEqual([]));
  });

  it('swaps its items when the conversation changes', async () => {
    await drawerStorage.add(createDrawerItem('first', 'claude', 'chat-1'));
    await drawerStorage.add(createDrawerItem('second', 'claude', 'chat-2'));

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useDrawerItems('claude', id),
      { initialProps: { id: 'chat-1' } },
    );
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    rerender({ id: 'chat-2' });

    await waitFor(() => expect(result.current.items[0].selectedText).toBe('second'));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/ui/useDrawerItems.test.ts`
Expected: FAIL — `useDrawerItems`가 인자를 받지 않아 모든 항목을 반환 (첫 테스트가 length 2로 실패)

- [ ] **Step 3: 훅 구현**

`src/ui/useDrawerItems.ts` 전체를 바꾼다:

```ts
import { useEffect, useMemo, useState } from 'react';
import { drawerStorage } from '@/src/lib/storage';
import type { DrawerItem } from '@/src/lib/schema';

export function useDrawerItems(
  site: DrawerItem['site'],
  conversationId: string | null,
) {
  const [stored, setStored] = useState<DrawerItem[]>([]);

  useEffect(() => {
    let active = true;
    drawerStorage.getAll().then((loaded) => {
      if (active) setStored(loaded);
    });
    const unwatch = drawerStorage.watch(setStored);
    return () => {
      active = false;
      unwatch();
    };
  }, []);

  // Storage keeps every item; the drawer only shows the ones from the chat the
  // user is looking at. A null conversationId is a chat that has no id yet, and
  // matches the items captured there.
  const items = useMemo(
    () =>
      stored.filter(
        (i) => i.site === site && i.conversationId === conversationId,
      ),
    [stored, site, conversationId],
  );

  const remove = (id: string) => {
    void drawerStorage.remove(id);
  };

  return { items, remove };
}
```

- [ ] **Step 4: DrawerPanel에 site prop 추가**

`src/ui/DrawerPanel.tsx`의 임포트에 추가:

```tsx
import { useConversationId } from './useConversationId';
import type { SiteId } from '@/src/lib/site-adapter';
```

Props와 훅 호출을 바꾼다:

```tsx
interface Props {
  site: SiteId;
  onItemClick: (item: DrawerItem) => void;
}

export function DrawerPanel({ site, onItemClick }: Props) {
  const conversationId = useConversationId();
  const { items, remove } = useDrawerItems(site, conversationId);
  const [open, setOpen] = useState(true);
  const theme = useHostTheme();
```

나머지 본문은 그대로 둔다.

- [ ] **Step 5: App에서 site 전달**

`src/ui/App.tsx`의 렌더를 바꾼다:

```tsx
      <DrawerPanel site={site} onItemClick={handleItemClick} />
```

- [ ] **Step 6: DrawerPanel 테스트 갱신**

`src/ui/DrawerPanel.test.tsx`에서 `render(<DrawerPanel ... />)` 6곳 모두에 `site="claude"`를 넣고, 저장하는 항목의 대화 ID를 현재 URL(테스트 기본값 `/`, 즉 대화 ID `null`)과 맞춘다 — Task 2에서 이미 `null`로 바꿔뒀으므로 항목 쪽은 그대로 두면 된다. 예:

```tsx
    render(<DrawerPanel site="claude" onItemClick={onItemClick} />);
```

```tsx
    render(<DrawerPanel site="claude" onItemClick={() => {}} />);
```

`beforeEach`에 URL 초기화를 추가한다. 아래 새 테스트가 URL을 바꾸므로, 대화 ID `null`을 가정하는 나머지 테스트로 새지 않게 막는다:

```tsx
  beforeEach(() => {
    fakeBrowser.reset();
    document.documentElement.classList.remove(DOCK_CLASS);
    history.replaceState(null, '', '/');
  });
```

그리고 대화별 격리를 패널 수준에서도 확인하는 테스트를 `describe` 끝에 추가한다:

```tsx
  it('hides questions captured in another conversation', async () => {
    history.replaceState(null, '', '/c/chat-1');
    await drawerStorage.add(createDrawerItem('elsewhere', 'claude', 'chat-2'));
    render(<DrawerPanel site="claude" onItemClick={() => {}} />);

    expect(
      await screen.findByText('답변에서 궁금한 부분을 드래그해 담아보세요'),
    ).toBeInTheDocument();
    expect(screen.queryByText('elsewhere에 대해 자세히 설명해줘')).toBeNull();
  });
```

- [ ] **Step 7: 통과 확인**

Run: `npm test && npm run compile`
Expected: 모든 테스트 PASS (useDrawerItems 4개, DrawerPanel 7개 포함), tsc 출력 없음

- [ ] **Step 8: 커밋**

```bash
git add src/ui/useDrawerItems.ts src/ui/useDrawerItems.test.ts src/ui/DrawerPanel.tsx src/ui/DrawerPanel.test.tsx src/ui/App.tsx
git commit -m "feat: show only the questions from the current conversation"
```

---

### Task 5: 새 채팅에서 담은 질문을 대화에 귀속

새 채팅(`conversationId === null`)에서 담아둔 질문이, 첫 메시지를 보내 URL에 대화 ID가 생기는 순간 그 대화의 질문이 되도록 `App`에서 `adopt`를 호출한다. `null → id` 전환에서만 호출한다 — `id → 다른 id` 전환에서 부르면 다른 대화의 임시 항목을 훔쳐온다.

**Files:**
- Modify: `src/ui/App.tsx`
- Test: `src/ui/App.test.tsx` (신규)

**Interfaces:**
- Consumes: `useConversationId` (Task 3), `drawerStorage.adopt` (Task 2)
- Produces: 없음 (App은 최종 소비자)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/ui/App.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { fakeBrowser } from 'wxt/testing';
import { App } from './App';
import { drawerStorage } from '@/src/lib/storage';
import { createDrawerItem } from '@/src/lib/template';

describe('App conversation adoption', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    history.replaceState(null, '', '/');
  });

  afterEach(() => {
    history.replaceState(null, '', '/');
  });

  it('adopts pending items when the new chat gains a conversation id', async () => {
    await drawerStorage.add(createDrawerItem('pending', 'claude', null));
    render(<App site="claude" />);

    act(() => {
      history.replaceState(null, '', '/chat/chat-1');
    });

    await waitFor(async () => {
      const items = await drawerStorage.getAll();
      expect(items.map((i) => i.conversationId)).toEqual(['chat-1']);
    });
  });

  it('does not adopt when moving between existing conversations', async () => {
    history.replaceState(null, '', '/chat/chat-1');
    await drawerStorage.add(createDrawerItem('pending', 'claude', null));
    render(<App site="claude" />);

    act(() => {
      history.replaceState(null, '', '/chat/chat-2');
    });

    await waitFor(async () => {
      const items = await drawerStorage.getAll();
      expect(items.map((i) => i.conversationId)).toEqual([null]);
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/ui/App.test.tsx`
Expected: FAIL — 첫 테스트에서 `conversationId`가 `null`인 채로 남아 `[null] !== ['chat-1']`

- [ ] **Step 3: App에 귀속 로직 추가**

`src/ui/App.tsx`. 임포트에 추가:

```tsx
import { useEffect, useRef } from 'react';
import { useConversationId } from './useConversationId';
```

컴포넌트 본문 맨 위에 추가한다 (`handleCapture` 위):

```tsx
export function App({ site }: { site: SiteId }) {
  const conversationId = useConversationId();
  const previousId = useRef(conversationId);

  // A fresh chat has no id until the first message is sent. Items captured in
  // that window are parked with conversationId: null — when the URL gains an id
  // they belong to this chat. Only on the null -> id transition: adopting on an
  // id -> id move would steal another chat's parked items.
  useEffect(() => {
    const previous = previousId.current;
    previousId.current = conversationId;
    if (previous !== null || conversationId === null) return;
    drawerStorage.adopt(site, conversationId).catch((error) => {
      logger.error('failed to adopt drawer items', error);
    });
  }, [conversationId, site]);
```

`handleCapture`는 Task 2에서 이미 `getConversationId()`를 쓰도록 바꿨으므로 그대로 둔다.

- [ ] **Step 4: 통과 확인**

Run: `npm test && npm run compile`
Expected: 모든 테스트 PASS (App 2개 포함), tsc 출력 없음

- [ ] **Step 5: 커밋**

```bash
git add src/ui/App.tsx src/ui/App.test.tsx
git commit -m "feat: adopt parked questions into the chat once it gets an id"
```

---

### Task 6: 대화 간 격리 e2e

빌드된 확장을 실제 Chromium에 올려, 대화 A에서 담은 질문이 대화 B에서는 안 보이고 A로 돌아오면 다시 보이는지 확인한다.

**Files:**
- Modify: `e2e/drawer.spec.ts`

**Interfaces:**
- Consumes: 빌드 산출물 `.output/chrome-mv3` (전체 기능)
- Produces: 없음

- [ ] **Step 1: 픽스처 라우팅을 헬퍼로 추출**

`e2e/drawer.spec.ts`에서 기존 테스트 안의 `page.route(...)` 블록을 파일 상단(`test.beforeAll` 아래)의 헬퍼로 옮긴다. 기존 테스트는 `await page.route(...)` 대신 `await mountFixture(page)`를 호출한다. 픽스처 HTML은 한 글자도 바꾸지 않는다.

```ts
import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';

async function mountFixture(page: Page) {
  // The extension only matches claude.ai / chatgpt.com; route a fake chatgpt page.
  await page.route('*://chatgpt.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<html><head><style>
        /* Mirrors chatgpt.com's real app shell, which carries Tailwind's
           w-screen (width: 100vw). Viewport units ignore a margin on <html>,
           so a plain-flow fixture would dock fine and hide the bug. */
        body { margin: 0 }
        .w-screen { width: 100vw }
      </style></head><body>
        <div id="shell" class="flex h-svh w-screen flex-col">
          <p id="answer">side effect</p>
          <div id="prompt-textarea" contenteditable="true"></div>
        </div>
      </body></html>`,
    }),
  );
}
```

- [ ] **Step 2: 실패하는 e2e 테스트 추가**

`e2e/drawer.spec.ts` 끝에 추가:

```ts
test('keeps questions scoped to the conversation they were captured in', async () => {
  const page = await context.newPage();
  await mountFixture(page);

  // Capture inside conversation A.
  await page.goto('https://chatgpt.com/c/conversation-a');
  await page.getByText('side effect').selectText();
  await page.dispatchEvent('body', 'mouseup');

  const host = page.locator('question-drawer-ui');
  await host.getByRole('button', { name: '서랍에 담기' }).click();
  await expect(host.getByText('side effect에 대해 자세히 설명해줘')).toBeVisible();

  // Conversation B never saw that question.
  await page.goto('https://chatgpt.com/c/conversation-b');
  await expect(
    page.locator('question-drawer-ui').getByText('답변에서 궁금한 부분을 드래그해 담아보세요'),
  ).toBeVisible();
  await expect(
    page.locator('question-drawer-ui').getByText('side effect에 대해 자세히 설명해줘'),
  ).toHaveCount(0);

  // Back in A, it is still there.
  await page.goto('https://chatgpt.com/c/conversation-a');
  await expect(
    page.locator('question-drawer-ui').getByText('side effect에 대해 자세히 설명해줘'),
  ).toBeVisible();
});
```

- [ ] **Step 3: 빌드하고 실행**

Run: `npm run build && npm run e2e`
Expected: 두 e2e 테스트 모두 PASS

- [ ] **Step 4: 전체 확인**

Run: `npm test && npm run compile && npm run build`
Expected: 단위 테스트 전부 PASS, tsc 출력 없음, 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add e2e/drawer.spec.ts
git commit -m "test: assert questions stay inside their conversation"
```
