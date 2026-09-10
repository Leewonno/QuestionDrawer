import type { DrawerItem } from "./schema";
import { messages, type Locale } from "./i18n";

// suffix null = the language's default wording. Any string (even "") is the
// user's own wording from the settings modal and is appended verbatim.
export function buildQuestion(
  selectedText: string,
  locale: Locale = "ko",
  suffix: string | null = null,
): string {
  return `${selectedText.trim()}${suffix ?? messages[locale].questionSuffix}`;
}

export function createDrawerItem(
  selectedText: string,
  site: DrawerItem["site"],
  conversationId: string | null,
  locale: Locale = "ko",
  suffix: string | null = null,
): DrawerItem {
  const text = selectedText.trim();
  return {
    id: crypto.randomUUID(),
    selectedText: text,
    question: buildQuestion(text, locale, suffix),
    site,
    conversationId,
    createdAt: Date.now(),
  };
}

// A question typed by the user in the "+" modal is already the full question —
// no template is applied. selectedText mirrors it so the item shape stays whole.
export function createManualDrawerItem(
  question: string,
  site: DrawerItem["site"],
  conversationId: string | null,
): DrawerItem {
  const text = question.trim();
  return {
    id: crypto.randomUUID(),
    selectedText: text,
    question: text,
    site,
    conversationId,
    createdAt: Date.now(),
  };
}
