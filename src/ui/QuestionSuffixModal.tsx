import { useState } from "react";
import { Modal } from "./Modal";
import { useI18n } from "./useI18n";
import { buildQuestion } from "@/src/lib/template";
import { QUESTION_SUFFIX_MAX_LENGTH } from "@/src/lib/question-suffix";

export interface QuestionSuffixSettings {
  // The stored suffix; null means "follow the current language's default".
  suffix: string | null;
  // Off = captures get no tail at all; the wording is kept for when it's back on.
  enabled: boolean;
}

interface Props extends QuestionSuffixSettings {
  onSave: (settings: QuestionSuffixSettings) => void;
  onClose: () => void;
}

export function QuestionSuffixModal({
  suffix,
  enabled,
  onSave,
  onClose,
}: Props) {
  const { locale, t } = useI18n();
  const [value, setValue] = useState(suffix ?? t.questionSuffix);
  const [on, setOn] = useState(enabled);

  const submit = () => {
    // Leading whitespace is kept on purpose: it decides whether the suffix
    // attaches directly ("에 대해…") or after a space.
    const next = value.trimEnd();
    // Saving the default wording stores null, so this language stays on its
    // built-in default rather than a pinned copy of it.
    onSave({ suffix: next === t.questionSuffix ? null : next, enabled: on });
  };

  return (
    <Modal
      title={t.suffixTitle}
      subtitle={t.suffixSubtitle}
      onClose={onClose}
      headerAside={
        <Switch checked={on} onChange={setOn} label={t.suffixToggleAria} />
      }
    >
      <input
        type="text"
        aria-label={t.suffixFieldAria}
        value={value}
        disabled={!on}
        maxLength={QUESTION_SUFFIX_MAX_LENGTH}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // Enter also commits a Korean IME composition; don't submit mid-word.
          if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
        }}
        className="mt-3 w-full rounded-xl border border-qd-line bg-qd-card px-3 py-2 text-sm leading-snug text-qd-ink focus:border-qd-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-qd-line-dark dark:focus:border-qd-accent-dark dark:bg-qd-card-dark dark:text-qd-ink-dark"
      />
      <p className="flex gap-2 mt-2 text-xs leading-relaxed text-qd-muted dark:text-qd-muted-dark">
        <span className="font-medium">{t.suffixPreviewLabel}</span>
        <span className="text-qd-ink dark:text-qd-ink-dark">
          {buildQuestion(t.suffixSampleTopic, locale, on ? value : "")}
        </span>
      </p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={() => setValue(t.questionSuffix)}
          disabled={!on}
          className="rounded-lg py-1.5 text-xs text-qd-muted enabled:hover:text-qd-accent disabled:cursor-not-allowed disabled:opacity-50 dark:text-qd-muted-dark dark:enabled:hover:text-qd-accent-dark"
        >
          {t.suffixReset}
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-qd-muted hover:text-qd-ink dark:text-qd-muted-dark dark:hover:text-qd-ink-dark"
          >
            {t.cancel}
          </button>
          <button
            onClick={submit}
            className="rounded-lg bg-qd-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity"
          >
            {t.suffixSave}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        checked
          ? "bg-qd-accent dark:bg-qd-accent-dark"
          : "bg-qd-muted/40 dark:bg-qd-muted-dark/40"
      }`}
    >
      <span
        className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
