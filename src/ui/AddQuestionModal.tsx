import { useState } from 'react';
import { useI18n } from './useI18n';
import { Modal } from './Modal';

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

  const trimmed = value.trim();
  const submit = () => {
    if (trimmed) onSave(trimmed);
  };

  return (
    <Modal
      title={editing ? t.editTitle : t.addTitle}
      subtitle={editing ? t.editSubtitle : t.addSubtitle}
      onClose={onClose}
    >
      <textarea
        aria-label={t.questionFieldAria}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        rows={4}
        placeholder={t.placeholder}
        className="mt-3 w-full resize-none rounded-xl border border-qd-line bg-qd-card px-3 py-2 text-sm leading-snug text-qd-ink placeholder:text-qd-muted focus:border-qd-accent focus:outline-none dark:border-qd-line-dark dark:focus:border-qd-accent-dark dark:bg-qd-card-dark dark:text-qd-ink-dark dark:placeholder:text-qd-muted-dark"
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
    </Modal>
  );
}
