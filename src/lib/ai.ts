import { logger } from "./logger";
import type { Locale } from "./i18n";

// Selections shorter than this keep the plain question template — tidying a
// short phrase isn't worth an on-device model round-trip.
export const AI_TIDY_MIN_LENGTH = 30;

// Minimal shape of Chrome's built-in Prompt API (Gemini Nano). It's a web
// platform global that only exists on capable Chrome 138+ builds, so we reach
// for it through globalThis and treat its absence as "just use the raw text".
type LanguageModelAvailability =
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available";

interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy(): void;
}

interface LanguageModelStatic {
  availability(): Promise<LanguageModelAvailability>;
  create(): Promise<LanguageModelSession>;
}

function getLanguageModel(): LanguageModelStatic | undefined {
  return (globalThis as { LanguageModel?: LanguageModelStatic }).LanguageModel;
}

// One-shot diagnostic: logs whether the Prompt API is reachable from *this*
// context (we call it from the content script) and its download state. Lets us
// confirm at runtime that direct content-script access works before trusting
// the tidy path to ever fire.
export async function probeLanguageModel(): Promise<void> {
  const model = getLanguageModel();
  logger.info("[probe] LanguageModel present:", Boolean(model));
  if (!model) return;
  try {
    logger.info("[probe] availability:", await model.availability());
  } catch (error) {
    logger.error("[probe] availability check failed", error);
  }
}

function buildTidyPrompt(text: string, locale: Locale): string {
  if (locale === "ko") {
    return [
      "다음 텍스트를 핵심 주제만 담은 짧은 한국어 명사구 하나로 정리해줘.",
      "질문 문장이나 설명, 따옴표 없이 주제 구절만 한 줄로 출력해.",
      "",
      "텍스트:",
      text,
    ].join("\n");
  }
  return [
    "Rewrite the following into a single short topic phrase (a noun phrase, not a question).",
    "Output only the phrase on one line — no quotes, no explanation.",
    "",
    "Text:",
    text,
  ].join("\n");
}

function cleanOutput(raw: string): string {
  const firstLine = raw.trim().split("\n")[0]?.trim() ?? "";
  // Models often wrap the answer in quotes despite the instruction.
  return firstLine.replace(/^["'“”「『]+|["'”」』]+$/g, "").trim();
}

// Condenses a long selection into a tidy subject phrase using on-device AI.
// Returns null whenever the model is unavailable, still downloading, or errors
// out — every caller must fall back to the original text on null.
export async function tidyTopic(
  text: string,
  locale: Locale,
): Promise<string | null> {
  const model = getLanguageModel();
  if (!model) return null;
  try {
    const availability = await model.availability();
    if (availability === "unavailable") return null;
    const session = await model.create();
    try {
      const output = cleanOutput(await session.prompt(buildTidyPrompt(text, locale)));
      return output.length > 0 ? output : null;
    } finally {
      session.destroy();
    }
  } catch (error) {
    logger.error("AI tidy failed", error);
    return null;
  }
}
