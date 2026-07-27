import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  detectLocale,
  getStoredLocale,
  messages,
  setStoredLocale,
  watchStoredLocale,
  type Locale,
  type Messages,
} from "@/src/lib/i18n";

export interface LocaleValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleValue | null>(null);

// Owns the reactive locale: seeds from the browser language, then adopts any
// stored override and follows it across tabs via storage.watch.
export function useLocaleState(): LocaleValue {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  useEffect(() => {
    let active = true;
    void getStoredLocale().then((stored) => {
      if (active && stored) setLocaleState(stored);
    });
    const unwatch = watchStoredLocale((stored) =>
      setLocaleState(stored ?? detectLocale()),
    );
    return () => {
      active = false;
      unwatch();
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void setStoredLocale(next);
  }, []);

  return { locale, setLocale };
}

export function LocaleProvider({
  value,
  children,
}: {
  value: LocaleValue;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

const noop = () => {};

// Consumed by every UI component. Without a provider (e.g. a component rendered
// in isolation) it falls back to the detected locale with a no-op setter, so
// components stay usable and testable on their own.
export function useI18n(): LocaleValue & { t: Messages } {
  const ctx = useContext(LocaleContext);
  const locale = ctx?.locale ?? detectLocale();
  return {
    locale,
    setLocale: ctx?.setLocale ?? noop,
    t: messages[locale],
  };
}
