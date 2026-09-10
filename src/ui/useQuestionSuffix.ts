import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import {
  getQuestionSuffixEnabled,
  getQuestionSuffixes,
  setQuestionSuffix,
  setQuestionSuffixEnabled,
  watchQuestionSuffixEnabled,
  watchQuestionSuffixes,
  withQuestionSuffix,
  type QuestionSuffixes,
} from "@/src/lib/question-suffix";
import { logger } from "@/src/lib/logger";
import type { Locale } from "@/src/lib/i18n";

export interface QuestionSuffixValue {
  // The given language's custom suffix; null = that language's default.
  suffix: string | null;
  // Whether captures get a tail at all. One switch for every language.
  enabled: boolean;
  // What a capture should append right now: "" while switched off, otherwise
  // the custom suffix, or null for the language default.
  appliedSuffix: string | null;
  setSuffix: (suffix: string | null) => void;
  setEnabled: (enabled: boolean) => void;
}

// Mirrors one stored value: adopts it on mount, then follows it across tabs via
// storage.watch. A newer value (a watch event or a local write) wins over a slow
// initial read, which would otherwise overwrite it with what was stored before.
function useStoredValue<T>(
  initial: T,
  read: () => Promise<T>,
  watch: (cb: (value: T) => void) => () => void,
): [T, (update: SetStateAction<T>) => void] {
  const [value, setValue] = useState(initial);
  const superseded = useRef(false);

  useEffect(() => {
    let active = true;
    void read().then((stored) => {
      if (active && !superseded.current) setValue(stored);
    });
    const unwatch = watch((next) => {
      superseded.current = true;
      setValue(next);
    });
    return () => {
      active = false;
      unwatch();
    };
  }, [read, watch]);

  const setLocal = useCallback((update: SetStateAction<T>) => {
    superseded.current = true;
    setValue(update);
  }, []);

  return [value, setLocal];
}

// Owns the reactive question-tail settings. Takes the locale explicitly because
// App reads it before rendering the LocaleProvider.
export function useQuestionSuffix(locale: Locale): QuestionSuffixValue {
  const [suffixes, setSuffixes] = useStoredValue<QuestionSuffixes>(
    {},
    getQuestionSuffixes,
    watchQuestionSuffixes,
  );
  const [enabled, setEnabledState] = useStoredValue(
    true,
    getQuestionSuffixEnabled,
    watchQuestionSuffixEnabled,
  );

  const setSuffix = useCallback(
    (next: string | null) => {
      setSuffixes((prev) => withQuestionSuffix(prev, locale, next));
      setQuestionSuffix(locale, next).catch((error) => {
        logger.error("failed to save question suffix", error);
      });
    },
    [locale, setSuffixes],
  );

  const setEnabled = useCallback(
    (next: boolean) => {
      setEnabledState(next);
      setQuestionSuffixEnabled(next).catch((error) => {
        logger.error("failed to save question suffix switch", error);
      });
    },
    [setEnabledState],
  );

  const suffix = suffixes[locale] ?? null;
  return {
    suffix,
    enabled,
    appliedSuffix: enabled ? suffix : "",
    setSuffix,
    setEnabled,
  };
}
