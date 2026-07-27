import { describe, it, expect, vi, afterEach } from "vitest";
import { tidyTopic, AI_TIDY_MIN_LENGTH } from "./ai";

type Availability = "unavailable" | "downloadable" | "downloading" | "available";

function stubLanguageModel(opts: {
  availability: Availability;
  prompt?: (input: string) => Promise<string>;
}) {
  const destroy = vi.fn();
  const prompt = vi.fn(opts.prompt ?? (async () => "정리된 주제"));
  const create = vi.fn(async () => ({ prompt, destroy }));
  (globalThis as Record<string, unknown>).LanguageModel = {
    availability: vi.fn(async () => opts.availability),
    create,
  };
  return { prompt, destroy, create };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).LanguageModel;
  vi.restoreAllMocks();
});

describe("tidyTopic", () => {
  it("returns null when the Prompt API is absent", async () => {
    expect(await tidyTopic("some long text here", "ko")).toBeNull();
  });

  it("returns null when the model is unavailable", async () => {
    const { create } = stubLanguageModel({ availability: "unavailable" });
    expect(await tidyTopic("some long text here", "ko")).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("returns the model's tidied phrase when available", async () => {
    stubLanguageModel({
      availability: "available",
      prompt: async () => "리액트 훅의 동작 원리",
    });
    expect(await tidyTopic("리액트에서 훅이 어떻게 동작하는지 궁금해요", "ko")).toBe(
      "리액트 훅의 동작 원리",
    );
  });

  it("strips wrapping quotes and keeps only the first line", async () => {
    stubLanguageModel({
      availability: "available",
      prompt: async () => '"클로저의 개념"\n(불필요한 설명)',
    });
    expect(await tidyTopic("자바스크립트 클로저에 대해 설명해줘 자세하게", "ko")).toBe(
      "클로저의 개념",
    );
  });

  it("sends the Korean instruction and the source text to the model", async () => {
    const { prompt } = stubLanguageModel({ availability: "available" });
    await tidyTopic("긴 원본 텍스트입니다 정말로 길어요", "ko");
    const sent = prompt.mock.calls[0][0] as string;
    expect(sent).toContain("긴 원본 텍스트입니다 정말로 길어요");
    expect(sent).toContain("명사구");
  });

  it("sends the English instruction for the en locale", async () => {
    const { prompt } = stubLanguageModel({ availability: "available" });
    await tidyTopic("a fairly long english source sentence", "en");
    const sent = prompt.mock.calls[0][0] as string;
    expect(sent).toContain("a fairly long english source sentence");
    expect(sent).toContain("topic phrase");
  });

  it("destroys the session even on success", async () => {
    const { destroy } = stubLanguageModel({ availability: "available" });
    await tidyTopic("some long text to tidy up here", "ko");
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("falls back to null when prompting throws, destroying the session", async () => {
    const destroy = vi.fn();
    (globalThis as Record<string, unknown>).LanguageModel = {
      availability: vi.fn(async () => "available"),
      create: vi.fn(async () => ({
        prompt: vi.fn(async () => {
          throw new Error("model exploded");
        }),
        destroy,
      })),
    };
    expect(await tidyTopic("some long text to tidy up here", "ko")).toBeNull();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("returns null when the model yields only blank output", async () => {
    stubLanguageModel({ availability: "available", prompt: async () => "   \n  " });
    expect(await tidyTopic("some long text to tidy up here", "ko")).toBeNull();
  });

  it("exposes the 30-character gate constant used by the capture path", () => {
    expect(AI_TIDY_MIN_LENGTH).toBe(30);
  });
});
