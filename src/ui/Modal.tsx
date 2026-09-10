import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  subtitle: string;
  onClose: () => void;
  // Rendered opposite the title, e.g. a switch that governs the whole modal.
  headerAside?: ReactNode;
  children: ReactNode;
}

// Shared shell for the drawer's modals: backdrop, focus handling, and keeping
// keyboard/clipboard events from leaking into the host page.
export function Modal({
  title,
  subtitle,
  onClose,
  headerAside,
  children,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restore focus to whatever opened the modal on close, so keyboard/
    // screen-reader users aren't stranded with focus on <body>.
    const opener = document.activeElement as HTMLElement | null;
    // Start in the first editable field; if every field is disabled, fall back
    // to the first button so focus still lands inside the modal.
    const dialog = dialogRef.current;
    (
      dialog?.querySelector<HTMLElement>(
        "textarea:not(:disabled), input:not(:disabled)",
      ) ?? dialog?.querySelector<HTMLElement>("button")
    )?.focus();
    return () => opener?.focus?.();
  }, []);

  // Keep Tab inside the modal. aria-modal hides the background from screen
  // readers, but keyboard focus can still escape into the host page (claude.ai /
  // ChatGPT) without an explicit trap.
  const trapFocus = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, textarea, [href], input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = dialogRef.current?.getRootNode() as ShadowRoot | Document;
    const current = active.activeElement;
    if (e.shiftKey && current === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && current === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={onClose}
      // The drawer lives in a shadow root, but key events still bubble to the
      // host page (claude.ai / ChatGPT), whose document-level shortcut handlers
      // would otherwise steal focus back to their own chat input as you type.
      // Keep every keystroke inside the modal.
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onClose();
        else trapFocus(e);
      }}
      onKeyUp={(e) => e.stopPropagation()}
      onKeyPress={(e) => e.stopPropagation()}
      // Clipboard events bubble to the host page too. claude.ai / ChatGPT run
      // document-level paste handlers that route pasted content into their own
      // chat composer, so a paste inside the modal's fields would also land in
      // the chat input. Keep clipboard actions inside the modal.
      onPaste={(e) => e.stopPropagation()}
      onCopy={(e) => e.stopPropagation()}
      onCut={(e) => e.stopPropagation()}
      className="pointer-events-auto fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 p-4 font-sans"
    >
      <div
        ref={dialogRef}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-qd-line bg-qd-panel p-5 shadow-xl dark:border-qd-line-dark dark:bg-qd-panel-dark"
      >
        <div className="flex items-start justify-between gap-3">
          <h3
            id={titleId}
            className="text-sm font-semibold text-qd-ink dark:text-qd-ink-dark"
          >
            {title}
          </h3>
          {headerAside}
        </div>
        <p className="mt-1 text-xs text-qd-muted dark:text-qd-muted-dark">
          {subtitle}
        </p>
        {children}
      </div>
    </div>
  );
}
