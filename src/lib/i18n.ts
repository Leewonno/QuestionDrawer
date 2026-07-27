import { storage } from "wxt/utils/storage";

export type Locale = "ko" | "en";

export const LOCALES: readonly Locale[] = ["ko", "en"];

// Every user-facing string lives here, keyed by locale. Functions cover the
// strings that need interpolation (the drawer subtitle, the question template).
export interface Messages {
  drawerTitle: string;
  addQuestionAria: string;
  subtitleEmpty: string;
  subtitleWithCount: (count: number) => string;
  emptyState: string;
  footer: string;
  openDrawer: string;
  closeDrawer: string;
  languageToggleAria: string;
  // The label shows the language you'd switch *to*, so the button reads as an
  // action rather than a status.
  languageToggleLabel: string;
  editTitle: string;
  addTitle: string;
  editSubtitle: string;
  addSubtitle: string;
  questionFieldAria: string;
  placeholder: string;
  cancel: string;
  saveEdit: string;
  add: string;
  freshBadge: string;
  editAria: string;
  removeAria: string;
  capture: string;
  saveFailed: string;
  copiedToClipboard: string;
  insertFailed: string;
  // The prompt actually sent to the AI when capturing a selection.
  question: (text: string) => string;
  // Shown on a card while on-device AI is tidying a long capture.
  converting: string;
}

const ko: Messages = {
  drawerTitle: "질문서랍",
  addQuestionAria: "질문 직접 담기",
  subtitleEmpty: "클릭 한 번으로 질문을 담아두세요",
  subtitleWithCount: (count) => `떠오른 질문 ${count}개 · 클릭하면 바로 저장`,
  emptyState: "답변에서 궁금한 부분을 드래그해 담아보세요",
  footer: "궁금한 내용을 드래그해보세요.",
  openDrawer: "서랍 열기",
  closeDrawer: "서랍 닫기",
  languageToggleAria: "언어 변경",
  languageToggleLabel: "EN",
  editTitle: "질문 수정하기",
  addTitle: "질문 직접 담기",
  editSubtitle: "질문 내용을 수정하세요",
  addSubtitle: "저장하고 싶은 질문을 입력하세요",
  questionFieldAria: "저장할 질문",
  placeholder: "예: 리액트 훅의 동작 원리를 자세히 설명해줘",
  cancel: "취소",
  saveEdit: "수정",
  add: "담기",
  freshBadge: "방금 담김",
  editAria: "수정",
  removeAria: "삭제",
  capture: "서랍에 담기",
  saveFailed: "저장에 실패했어요",
  copiedToClipboard: "입력창을 못 찾아 클립보드에 복사했어요",
  insertFailed: "삽입에 실패했어요",
  question: (text) => `${text}에 대해 자세히 설명해줘`,
  converting: "AI로 변환 중…",
};

const en: Messages = {
  drawerTitle: "Question Drawer",
  addQuestionAria: "Add a question",
  subtitleEmpty: "Save a question with a single click",
  subtitleWithCount: (count) =>
    `${count} question${count === 1 ? "" : "s"} · click to insert`,
  emptyState: "Drag over what you're curious about in an answer",
  footer: "Try dragging over what you're curious about.",
  openDrawer: "Open drawer",
  closeDrawer: "Close drawer",
  languageToggleAria: "Change language",
  languageToggleLabel: "한",
  editTitle: "Edit question",
  addTitle: "Add a question",
  editSubtitle: "Edit the question",
  addSubtitle: "Enter a question you want to save",
  questionFieldAria: "Question to save",
  placeholder: "e.g. Explain how React hooks work in detail",
  cancel: "Cancel",
  saveEdit: "Save",
  add: "Add",
  freshBadge: "just added",
  editAria: "Edit",
  removeAria: "Delete",
  capture: "Add to drawer",
  saveFailed: "Couldn't save",
  copiedToClipboard: "Couldn't find the input box — copied to clipboard instead",
  insertFailed: "Couldn't insert",
  question: (text) => `Explain ${text} in detail`,
  converting: "Converting with AI…",
};

export const messages: Record<Locale, Messages> = { ko, en };

// Korean is the extension's primary language; every non-Korean browser gets
// English.
export function detectLocale(): Locale {
  const lang =
    typeof navigator !== "undefined" ? (navigator.language ?? "") : "";
  return lang.toLowerCase().startsWith("ko") ? "ko" : "en";
}

const LOCALE_KEY = "local:locale" as const;

function normalize(raw: unknown): Locale | null {
  return raw === "ko" || raw === "en" ? raw : null;
}

// A stored value is an explicit user override; null means "follow the browser".
export async function getStoredLocale(): Promise<Locale | null> {
  return normalize(await storage.getItem<string>(LOCALE_KEY));
}

export async function setStoredLocale(locale: Locale): Promise<void> {
  await storage.setItem(LOCALE_KEY, locale);
}

export function watchStoredLocale(cb: (locale: Locale | null) => void): () => void {
  return storage.watch<string>(LOCALE_KEY, (raw) => cb(normalize(raw)));
}
