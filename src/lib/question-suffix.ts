import { storage } from "wxt/utils/storage";
import { z } from "zod";
import type { Locale } from "./i18n";

export const QUESTION_SUFFIX_MAX_LENGTH = 100;

const KEY = "local:questionSuffix" as const;
const SuffixSchema = z.string().max(QUESTION_SUFFIX_MAX_LENGTH);
const SuffixesSchema = z.object({
  ko: SuffixSchema.optional(),
  en: SuffixSchema.optional(),
});

// The user's own wording per language, appended after a captured selection (an
// empty string included). A missing language uses its built-in default, so
// saving Korean wording never changes what English captures and vice versa.
export type QuestionSuffixes = z.infer<typeof SuffixesSchema>;

function normalize(raw: unknown): QuestionSuffixes {
  const parsed = SuffixesSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

// Returns a copy with one language's suffix replaced; null drops it so that
// language goes back to its default.
export function withQuestionSuffix(
  suffixes: QuestionSuffixes,
  locale: Locale,
  suffix: string | null,
): QuestionSuffixes {
  const { [locale]: _previous, ...rest } = suffixes;
  return suffix === null ? rest : { ...rest, [locale]: suffix };
}

export async function getQuestionSuffixes(): Promise<QuestionSuffixes> {
  return normalize(await storage.getItem<unknown>(KEY));
}

export async function setQuestionSuffix(
  locale: Locale,
  suffix: string | null,
): Promise<void> {
  const next = withQuestionSuffix(await getQuestionSuffixes(), locale, suffix);
  await storage.setItem(KEY, SuffixesSchema.parse(next));
}

export function watchQuestionSuffixes(
  cb: (suffixes: QuestionSuffixes) => void,
): () => void {
  return storage.watch<unknown>(KEY, (raw) => cb(normalize(raw)));
}

const ENABLED_KEY = "local:questionSuffixEnabled" as const;

// Missing counts as on: captures always carried a tail before this switch
// existed. Unlike the wording, the switch is one setting for every language.
function normalizeEnabled(raw: unknown): boolean {
  return typeof raw === "boolean" ? raw : true;
}

export async function getQuestionSuffixEnabled(): Promise<boolean> {
  return normalizeEnabled(await storage.getItem<unknown>(ENABLED_KEY));
}

export async function setQuestionSuffixEnabled(
  enabled: boolean,
): Promise<void> {
  await storage.setItem(ENABLED_KEY, enabled);
}

export function watchQuestionSuffixEnabled(
  cb: (enabled: boolean) => void,
): () => void {
  return storage.watch<unknown>(ENABLED_KEY, (raw) =>
    cb(normalizeEnabled(raw)),
  );
}
