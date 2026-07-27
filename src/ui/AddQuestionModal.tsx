import { useEffect, useRef, useState } from 'react';
import { useI18n } from './useI18n';

interface Props {
  onSave: (question: string) => void;
  onClose: () => void;
  // Present when editing an existing question; its text prefills the field and
  // switches the modal's copy to an edit affordance.
  initialValue?: string;
}

export function AddQuestionModal({ onSave, onClose, initialValue }: Props) {
  const { t } = useI18n();
  const editing = initialValue !== undefined;
  const [value, setValue] = useState(initialValue ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restore focus to whatever opened the modal (the "+" button) on close, so
    // keyboard/screen-reader users aren't stranded with focus on <body>.
    const opener = document.activeElement as HTMLElement | null;
    textareaRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  // Keep Tab inside the modal. aria-modal hides the background from screen
  // readers, but keyboard focus can still escape into the host page (claude.ai /
  // ChatGPT) without an explicit trap.
  const trapFocus = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
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

  const trimmed = value.trim();
  const submit = () => {
    if (trimmed) onSave(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qd-add-title"
      onMouseDown={onClose}
      // The drawer lives in a shadow root, but key events still bubble to the
      // host page (claude.ai / ChatGPT), whose document-level shortcut handlers
      // would otherwise steal focus back to their own chat input as you type.
      // Keep every keystroke inside the modal.
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') onClose();
        else trapFocus(e);
      }}
      onKeyUp={(e) => e.stopPropagation()}
      onKeyPress={(e) => e.stopPropagation()}
      // Clipboard events bubble to the host page too. claude.ai / ChatGPT run
      // document-level paste handlers that route pasted content into their own
      // chat composer, so a paste inside the modal's textarea would also land in
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
        <h3
          id="qd-add-title"
          className="text-sm font-semibold text-qd-ink dark:text-qd-ink-dark"
        >
          {editing ? t.editTitle : t.addTitle}
        </h3>
        <p className="mt-1 text-xs text-qd-muted dark:text-qd-muted-dark">
          {editing ? t.editSubtitle : t.addSubtitle}
        </p>
        <textarea
          ref={textareaRef}
          aria-label={t.questionFieldAria}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={4}
          placeholder={t.placeholder}
          className="mt-3 w-full resize-none rounded-xl border border-qd-line bg-qd-card px-3 py-2 text-sm leading-snug text-qd-ink placeholder:text-qd-muted focus:border-qd-accent focus:outline-none dark:border-qd-line-dark dark:bg-qd-card-dark dark:text-qd-ink-dark dark:placeholder:text-qd-muted-dark"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-qd-muted hover:text-qd-ink dark:text-qd-muted-dark dark:hover:text-qd-ink-dark"
          >
            {t.cancel}
          </button>
          <button
            onClick={submit}
            disabled={!trimmed}
            className="rounded-lg bg-qd-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editing ? t.saveEdit : t.add}
          </button>
        </div>
      </div>
    </div>
  );
}
