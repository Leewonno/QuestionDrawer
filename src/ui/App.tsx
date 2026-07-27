import { useCallback, useEffect, useRef, useState } from "react";
import { DrawerPanel } from "./DrawerPanel";
import { SelectionButton } from "./SelectionButton";
import { useConversationId } from "./useConversationId";
import {
  createDrawerItem,
  createManualDrawerItem,
  buildQuestion,
} from "@/src/lib/template";
import { AI_TIDY_MIN_LENGTH, tidyTopic } from "@/src/lib/ai";
import { drawerStorage } from "@/src/lib/storage";
import { getConversationId } from "@/src/lib/conversation";
import { getActiveAdapter, type SiteId } from "@/src/lib/site-adapter";
import { copyToClipboard, showToast } from "@/src/lib/fallback";
import { logger } from "@/src/lib/logger";
import { messages } from "@/src/lib/i18n";
import { LocaleProvider, useLocaleState } from "./useI18n";
import type { DrawerItem } from "@/src/lib/schema";

export function App({ site }: { site: SiteId }) {
  const localeValue = useLocaleState();
  const t = messages[localeValue.locale];
  const conversationId = useConversationId();
  const previousId = useRef(conversationId);
  // Ids of items whose question is being tidied by on-device AI right now, so
  // the drawer can spin a "converting" indicator on those cards. Kept in memory
  // (not storage) — a reload abandons the in-flight tidy anyway.
  const [tidyingIds, setTidyingIds] = useState<ReadonlySet<string>>(new Set());
  const markTidying = (id: string, on: boolean) =>
    setTidyingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  // A fresh chat has no id until the first message is sent. Items captured in
  // that window are parked with conversationId: null — once the URL grows an id
  // they belong to this chat. Only on the null -> id transition: adopting on an
  // id -> id move would steal another chat's parked items.
  useEffect(() => {
    const previous = previousId.current;
    previousId.current = conversationId;
    if (previous !== null || conversationId === null) return;
    drawerStorage.adopt(site, conversationId).catch((error) => {
      logger.error("failed to adopt drawer items", error);
    });
  }, [conversationId, site]);

  const isWithinChat = useCallback(
    (node: Node | null) => getActiveAdapter()?.isWithinChat(node) ?? false,
    [],
  );

  const handleCapture = (text: string) => {
    const locale = localeValue.locale;
    const item = createDrawerItem(text, site, getConversationId(), locale);
    // Long drags get condensed by on-device AI into a tidy subject, then
    // re-wrapped by the question template so the panel copy stays uniform. The
    // item is saved immediately with the plain template, so if the model is
    // unavailable or slow the user keeps a usable question in the meantime.
    const willTidy = item.selectedText.length > AI_TIDY_MIN_LENGTH;
    // Flag before the async add so the card spins from its very first render.
    if (willTidy) markTidying(item.id, true);
    drawerStorage
      .add(item)
      .then(() => {
        if (!willTidy) return;
        return tidyTopic(item.selectedText, locale).then((topic) => {
          if (topic) return drawerStorage.update(item.id, buildQuestion(topic, locale));
        });
      })
      .catch((error) => {
        logger.error("failed to save drawer item", error);
        showToast(t.saveFailed);
      })
      .finally(() => {
        if (willTidy) markTidying(item.id, false);
      });
  };

  const handleManualAdd = (question: string) => {
    drawerStorage
      .add(createManualDrawerItem(question, site, getConversationId()))
      .catch((error) => {
        logger.error("failed to save drawer item", error);
        showToast(t.saveFailed);
      });
  };

  const handleItemClick = async (item: DrawerItem) => {
    const adapter = getActiveAdapter();
    if (adapter?.insertPrompt(item.question)) return;
    const copied = await copyToClipboard(item.question);
    showToast(copied ? t.copiedToClipboard : t.insertFailed);
  };

  // Only surface the drawer inside an actual conversation. Settings, project
  // lists, recents and the empty new-chat screen have no conversation id, and
  // there are no answers to capture there.
  if (conversationId === null) return null;

  return (
    <LocaleProvider value={localeValue}>
      <SelectionButton onCapture={handleCapture} isWithinChat={isWithinChat} />
      <DrawerPanel
        site={site}
        onItemClick={handleItemClick}
        onAddQuestion={handleManualAdd}
        conversationId={conversationId}
        tidyingIds={tidyingIds}
      />
    </LocaleProvider>
  );
}
