import { useEffect, useMemo, useRef, useState } from "react";
import { useDrawerItems } from "./useDrawerItems";
import { useFreshItemId } from "./useFreshItemId";
import { DrawerItemCard } from "./DrawerItemCard";
import { AddQuestionModal } from "./AddQuestionModal";
import { QuestionSuffixModal } from "./QuestionSuffixModal";
import { useQuestionSuffix } from "./useQuestionSuffix";
import { useI18n } from "./useI18n";
import { useHostTheme } from "@/src/lib/theme";
import { applyDock, cleanupDock, DRAWER_WIDTH_PX } from "@/src/lib/dock";
import type { SiteId } from "@/src/lib/site-adapter";
import type { DrawerItem } from "@/src/lib/schema";

// Shared by the header's icon buttons so they render at one fixed square size
// regardless of whether they hold text ("EN", "+") or an svg.
const HEADER_BUTTON_CLASS =
  "-mt-0.5 flex size-7 cursor-pointer shrink-0 items-center justify-center rounded-lg border border-qd-line leading-none text-qd-muted transition-colors hover:border-qd-accent hover:text-qd-accent dark:border-qd-line-dark dark:text-qd-muted-dark dark:hover:border-qd-accent-dark dark:hover:text-qd-accent-dark";

interface Props {
  site: SiteId;
  onItemClick: (item: DrawerItem) => void;
  onAddQuestion?: (question: string) => void;
  conversationId: string | null;
  // Ids currently being tidied by on-device AI; those cards show a spinner.
  tidyingIds?: ReadonlySet<string>;
}

export function DrawerPanel({
  site,
  onItemClick,
  onAddQuestion,
  conversationId,
  tidyingIds,
}: Props) {
  const { items, remove, update } = useDrawerItems(site, conversationId);
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<DrawerItem | null>(null);
  const [editingSuffix, setEditingSuffix] = useState(false);
  const theme = useHostTheme();
  const { locale, setLocale, t } = useI18n();
  const { suffix, enabled, setSuffix, setEnabled } = useQuestionSuffix(locale);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.createdAt - b.createdAt),
    [items],
  );
  const freshId = useFreshItemId(sorted[sorted.length - 1]);

  const listRef = useRef<HTMLDivElement>(null);
  const newestId = sorted[sorted.length - 1]?.id;

  useEffect(() => {
    applyDock(open);
  }, [open]);

  // Scroll to the bottom whenever a new question lands there, so the freshly
  // stacked item is visible even when the list already overflows.
  useEffect(() => {
    if (!open || newestId == null) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, newestId]);

  // Undock on unmount too. The content script's onRemove also calls this, but a
  // render error or an SPA teardown that skips onRemove would otherwise leave the
  // host page squeezed 320px with no drawer to un-squeeze it.
  useEffect(() => cleanupDock, []);

  const subtitle =
    sorted.length > 0 ? t.subtitleWithCount(sorted.length) : t.subtitleEmpty;

  return (
    <div className={theme === "dark" ? "qd-dark" : undefined}>
      <button
        aria-label={open ? t.closeDrawer : t.openDrawer}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ right: open ? DRAWER_WIDTH_PX : 0 }}
        className="pointer-events-auto fixed top-1/3 z-100 rounded-l-lg border border-r-0 border-qd-line bg-qd-panel px-2 py-3 text-xs text-qd-muted shadow-sm transition-[right] duration-300 ease-out dark:border-qd-line-dark dark:bg-qd-panel-dark dark:text-qd-muted-dark"
      >
        {open ? "›" : "‹"}
      </button>

      <aside
        aria-hidden={!open}
        inert={!open}
        style={{ width: DRAWER_WIDTH_PX }}
        className={`pointer-events-auto fixed right-0 top-0 z-100 flex h-screen flex-col border-l border-qd-line qd-glow font-sans transition-transform duration-300 ease-out dark:border-qd-line-dark dark:qd-glow-dark ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-qd-ink dark:text-qd-ink-dark">
              {t.drawerTitle}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                aria-label={t.languageToggleAria}
                onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
                className={`${HEADER_BUTTON_CLASS} text-xs`}
              >
                {t.languageToggleLabel}
              </button>
              {onAddQuestion && (
                <button
                  aria-label={t.addQuestionAria}
                  onClick={() => setAdding(true)}
                  className={`${HEADER_BUTTON_CLASS} text-base`}
                >
                  +
                </button>
              )}
              <button
                aria-label={t.suffixSettingsAria}
                onClick={() => setEditingSuffix(true)}
                className={HEADER_BUTTON_CLASS}
              >
                <GearIcon />
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-qd-muted dark:text-qd-muted-dark">
            {subtitle}
          </p>
        </header>

        <div ref={listRef} className="flex-1 overflow-y-auto px-3 pb-3">
          {sorted.length === 0 ? (
            <p className="rounded-xl border border-dashed border-qd-line px-3 py-6 text-center text-xs leading-relaxed text-balance text-qd-muted dark:border-qd-line-dark dark:text-qd-muted-dark">
              {t.emptyState}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sorted.map((item) => (
                <DrawerItemCard
                  key={item.id}
                  item={item}
                  fresh={item.id === freshId}
                  tidying={tidyingIds?.has(item.id) ?? false}
                  onClick={() => onItemClick(item)}
                  onRemove={() => remove(item.id)}
                  onEdit={() => setEditing(item)}
                />
              ))}
            </ul>
          )}
        </div>

        <footer className="px-4 py-3 text-center text-xs leading-relaxed text-balance text-qd-muted dark:border-qd-line-dark dark:text-qd-muted-dark">
          © 2026 Leewonno. All rights reserved.
        </footer>
      </aside>

      {editing && (
        <AddQuestionModal
          initialValue={editing.question}
          onSave={(question) => {
            update(editing.id, question);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {adding && onAddQuestion && (
        <AddQuestionModal
          onSave={(question) => {
            onAddQuestion(question);
            setAdding(false);
          }}
          onClose={() => setAdding(false)}
        />
      )}

      {editingSuffix && (
        <QuestionSuffixModal
          suffix={suffix}
          enabled={enabled}
          onSave={(settings) => {
            setSuffix(settings.suffix);
            setEnabled(settings.enabled);
            setEditingSuffix(false);
          }}
          onClose={() => setEditingSuffix(false)}
        />
      )}
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="block size-4"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
