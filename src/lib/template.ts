import type { DrawerItem } from "./schema";
import { messages, type Locale } from "./i18n";

export function buildQuestion(selectedText: string, locale: Locale = "ko"): string {
  return messages[locale].question(selectedText.trim());
}

export function createDrawerItem(
  selectedText: string,
  site: DrawerItem["site"],
  conversationId: string | null,
  locale: Locale = "ko",
): DrawerItem {
  const text = selectedText.trim();
  return {
    id: crypto.randomUUID(),
    selectedText: text,
    question: buildQuestion(text, locale),
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
