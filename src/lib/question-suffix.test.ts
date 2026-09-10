import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeBrowser } from "wxt/testing";
import { storage } from "wxt/utils/storage";
import {
  getQuestionSuffixEnabled,
  getQuestionSuffixes,
  setQuestionSuffix,
  setQuestionSuffixEnabled,
  watchQuestionSuffixEnabled,
  watchQuestionSuffixes,
  QUESTION_SUFFIX_MAX_LENGTH,
} from "./question-suffix";

describe("question suffix switch", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("is on when nothing is stored", async () => {
    expect(await getQuestionSuffixEnabled()).toBe(true);
  });

  it("round-trips off and back on", async () => {
    await setQuestionSuffixEnabled(false);
    expect(await getQuestionSuffixEnabled()).toBe(false);
    await setQuestionSuffixEnabled(true);
    expect(await getQuestionSuffixEnabled()).toBe(true);
  });

  it("treats malformed values as on", async () => {
    await storage.setItem("local:questionSuffixEnabled", "off");
    expect(await getQuestionSuffixEnabled()).toBe(true);
  });

  it("notifies watchers when switched", async () => {
    const cb = vi.fn();
    const unwatch = watchQuestionSuffixEnabled(cb);
    await setQuestionSuffixEnabled(false);
    await vi.waitFor(() => expect(cb).toHaveBeenCalledWith(false));
    unwatch();
  });
});

describe("question suffix storage", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("has no custom suffixes when nothing is stored", async () => {
    expect(await getQuestionSuffixes()).toEqual({});
  });

  it("stores a separate suffix for each language", async () => {
    await setQuestionSuffix("ko", "를 쉽게 알려줘");
    await setQuestionSuffix("en", " — keep it short");
    expect(await getQuestionSuffixes()).toEqual({
      ko: "를 쉽게 알려줘",
      en: " — keep it short",
    });
  });

  it("leaves the other language on its default", async () => {
    await setQuestionSuffix("ko", "를 쉽게 알려줘");
    expect((await getQuestionSuffixes()).en).toBeUndefined();
  });

  it("keeps an empty suffix distinct from the default", async () => {
    await setQuestionSuffix("ko", "");
    expect(await getQuestionSuffixes()).toEqual({ ko: "" });
  });

  it("clears one language back to its default with null", async () => {
    await setQuestionSuffix("ko", "를 쉽게 알려줘");
    await setQuestionSuffix("en", " — keep it short");
    await setQuestionSuffix("ko", null);
    expect(await getQuestionSuffixes()).toEqual({ en: " — keep it short" });
  });

  it("ignores malformed stored values", async () => {
    await storage.setItem("local:questionSuffix", "를 알려줘");
    expect(await getQuestionSuffixes()).toEqual({});
  });

  it("rejects a suffix over the length cap", async () => {
    await expect(
      setQuestionSuffix("ko", "가".repeat(QUESTION_SUFFIX_MAX_LENGTH + 1)),
    ).rejects.toThrow();
    expect(await getQuestionSuffixes()).toEqual({});
  });

  it("notifies watchers when a suffix changes", async () => {
    const cb = vi.fn();
    const unwatch = watchQuestionSuffixes(cb);
    await setQuestionSuffix("ko", "를 알려줘");
    await vi.waitFor(() => expect(cb).toHaveBeenCalledWith({ ko: "를 알려줘" }));
    await setQuestionSuffix("ko", null);
    await vi.waitFor(() => expect(cb).toHaveBeenLastCalledWith({}));
    unwatch();
  });
});
