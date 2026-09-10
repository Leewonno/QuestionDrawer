import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { fakeBrowser } from "wxt/testing";
import { useQuestionSuffix } from "./useQuestionSuffix";
import {
  getQuestionSuffixEnabled,
  getQuestionSuffixes,
  setQuestionSuffix,
  setQuestionSuffixEnabled,
} from "@/src/lib/question-suffix";
import type { Locale } from "@/src/lib/i18n";

describe("useQuestionSuffix", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it("starts on the language default", () => {
    const { result } = renderHook(() => useQuestionSuffix("ko"));
    expect(result.current.suffix).toBeNull();
  });

  it("adopts the stored suffix for its language", async () => {
    await setQuestionSuffix("ko", "를 쉽게 알려줘");
    const { result } = renderHook(() => useQuestionSuffix("ko"));
    await waitFor(() => expect(result.current.suffix).toBe("를 쉽게 알려줘"));
  });

  it("switches to the other language's suffix with the locale", async () => {
    await setQuestionSuffix("ko", "를 쉽게 알려줘");
    await setQuestionSuffix("en", " — keep it short");
    const { result, rerender } = renderHook(
      ({ locale }: { locale: Locale }) => useQuestionSuffix(locale),
      { initialProps: { locale: "ko" } },
    );
    await waitFor(() => expect(result.current.suffix).toBe("를 쉽게 알려줘"));

    rerender({ locale: "en" });
    expect(result.current.suffix).toBe(" — keep it short");
  });

  it("follows changes made in another tab", async () => {
    const { result } = renderHook(() => useQuestionSuffix("ko"));
    await act(() => setQuestionSuffix("ko", "를 알려줘"));
    await waitFor(() => expect(result.current.suffix).toBe("를 알려줘"));
  });

  it("is switched on by default and applies the language default", () => {
    const { result } = renderHook(() => useQuestionSuffix("ko"));
    expect(result.current.enabled).toBe(true);
    expect(result.current.appliedSuffix).toBeNull();
  });

  it("applies no tail while switched off, keeping the wording", async () => {
    await setQuestionSuffix("ko", "를 쉽게 알려줘");
    await setQuestionSuffixEnabled(false);
    const { result } = renderHook(() => useQuestionSuffix("ko"));
    await waitFor(() => expect(result.current.enabled).toBe(false));
    await waitFor(() => expect(result.current.suffix).toBe("를 쉽게 알려줘"));
    expect(result.current.appliedSuffix).toBe("");
  });

  it("persists the switch", async () => {
    const { result } = renderHook(() => useQuestionSuffix("ko"));
    act(() => result.current.setEnabled(false));
    expect(result.current.appliedSuffix).toBe("");
    await waitFor(async () =>
      expect(await getQuestionSuffixEnabled()).toBe(false),
    );
  });

  it("persists under the current language only", async () => {
    const { result } = renderHook(() => useQuestionSuffix("ko"));
    act(() => result.current.setSuffix("의 예시를 보여줘"));
    expect(result.current.suffix).toBe("의 예시를 보여줘");
    await waitFor(async () =>
      expect(await getQuestionSuffixes()).toEqual({ ko: "의 예시를 보여줘" }),
    );
  });
});
