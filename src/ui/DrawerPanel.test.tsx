import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fakeBrowser } from "wxt/testing";
import { DrawerPanel } from "./DrawerPanel";
import { drawerStorage } from "@/src/lib/storage";
import { createDrawerItem } from "@/src/lib/template";
import { DOCK_CLASS } from "@/src/lib/dock";
import {
  getQuestionSuffixEnabled,
  getQuestionSuffixes,
} from "@/src/lib/question-suffix";

describe("DrawerPanel", () => {
  beforeEach(() => {
    fakeBrowser.reset();
    document.documentElement.classList.remove(DOCK_CLASS);
    // The tests below store items with no conversation id, so they need a URL
    // with none either. Keeps the isolation test at the bottom from leaking.
    history.replaceState(null, "", "/");
  });

  it("renders stored questions and fires onItemClick", async () => {
    await drawerStorage.add(createDrawerItem("side effect", "claude", null));
    const onItemClick = vi.fn();
    render(
      <DrawerPanel
        site="claude"
        onItemClick={onItemClick}
        conversationId={null}
      />,
    );

    const item = await screen.findByText("side effect에 대해 자세히 설명해줘");
    await userEvent.click(item);
    expect(onItemClick).toHaveBeenCalledTimes(1);
  });

  it("removes an item when its delete button is clicked", async () => {
    await drawerStorage.add(createDrawerItem("side effect", "claude", null));
    render(
      <DrawerPanel
        site="claude"
        onItemClick={() => {}}
        conversationId={null}
      />,
    );

    await screen.findByText("side effect에 대해 자세히 설명해줘");
    await userEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() =>
      expect(
        screen.queryByText("side effect에 대해 자세히 설명해줘"),
      ).toBeNull(),
    );
  });

  it("counts the questions in the header", async () => {
    await drawerStorage.add(createDrawerItem("side effect", "claude", null));
    await drawerStorage.add(createDrawerItem("cleanup", "claude", null));
    render(
      <DrawerPanel
        site="claude"
        onItemClick={() => {}}
        conversationId={null}
      />,
    );

    expect(await screen.findByText("담긴 질문 2개")).toBeInTheDocument();
  });

  it("shows the empty state when nothing is stored", async () => {
    render(
      <DrawerPanel
        site="claude"
        onItemClick={() => {}}
        conversationId={null}
      />,
    );

    expect(
      await screen.findByText("답변에서 궁금한 부분을 드래그해 담아보세요"),
    ).toBeInTheDocument();
  });

  it("lists the newest question last", async () => {
    await drawerStorage.add({
      ...createDrawerItem("older", "claude", null),
      createdAt: 1000,
    });
    await drawerStorage.add({
      ...createDrawerItem("newer", "claude", null),
      createdAt: 2000,
    });
    render(
      <DrawerPanel
        site="claude"
        onItemClick={() => {}}
        conversationId={null}
      />,
    );

    await screen.findByText("newer에 대해 자세히 설명해줘");
    const questions = screen
      .getAllByRole("listitem")
      .map((li) => li.textContent ?? "");
    expect(questions[0]).toContain("older");
    expect(questions[1]).toContain("newer");
  });

  it("hides questions captured in another conversation", async () => {
    history.replaceState(null, "", "/c/chat-1");
    await drawerStorage.add(createDrawerItem("elsewhere", "claude", "chat-2"));
    render(
      <DrawerPanel
        site="claude"
        onItemClick={() => {}}
        conversationId={null}
      />,
    );

    expect(
      await screen.findByText("답변에서 궁금한 부분을 드래그해 담아보세요"),
    ).toBeInTheDocument();
    expect(screen.queryByText("elsewhere에 대해 자세히 설명해줘")).toBeNull();
  });

  it("saves a typed question through the add modal", async () => {
    const onAddQuestion = vi.fn();
    render(
      <DrawerPanel
        site="claude"
        onItemClick={() => {}}
        onAddQuestion={onAddQuestion}
        conversationId={null}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "질문 직접 담기" }),
    );
    await userEvent.type(
      screen.getByRole("dialog").querySelector("textarea")!,
      "리액트 훅 설명해줘",
    );
    await userEvent.click(screen.getByRole("button", { name: "담기" }));

    expect(onAddQuestion).toHaveBeenCalledWith("리액트 훅 설명해줘");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not offer the add button without an onAddQuestion handler", () => {
    render(
      <DrawerPanel
        site="claude"
        onItemClick={() => {}}
        conversationId={null}
      />,
    );
    expect(screen.queryByRole("button", { name: "질문 직접 담기" })).toBeNull();
  });

  it("opens the suffix settings prefilled with the default wording", async () => {
    render(
      <DrawerPanel
        site="claude"
        onItemClick={() => {}}
        conversationId={null}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "질문 꼬리말 설정" }),
    );

    expect(
      screen.getByRole("textbox", { name: "질문 뒤에 붙일 문장" }),
    ).toHaveValue("에 대해 자세히 설명해줘");
    expect(
      screen.getByText("리액트 훅에 대해 자세히 설명해줘"),
    ).toBeInTheDocument();
  });

  it("saves a custom suffix and previews it while typing", async () => {
    render(
      <DrawerPanel
        site="claude"
        onItemClick={() => {}}
        conversationId={null}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "질문 꼬리말 설정" }),
    );
    const field = screen.getByRole("textbox", { name: "질문 뒤에 붙일 문장" });
    await userEvent.clear(field);
    await userEvent.type(field, "를 쉽게 알려줘");
    expect(screen.getByText("리액트 훅를 쉽게 알려줘")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(async () =>
      expect(await getQuestionSuffixes()).toEqual({ ko: "를 쉽게 알려줘" }),
    );
  });

  it("goes back to following the language default after a reset", async () => {
    render(
      <DrawerPanel
        site="claude"
        onItemClick={() => {}}
        conversationId={null}
      />,
    );
    const openSettings = () =>
      userEvent.click(screen.getByRole("button", { name: "질문 꼬리말 설정" }));

    await openSettings();
    const field = screen.getByRole("textbox", { name: "질문 뒤에 붙일 문장" });
    await userEvent.clear(field);
    await userEvent.type(field, "를 알려줘");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(async () =>
      expect(await getQuestionSuffixes()).toEqual({ ko: "를 알려줘" }),
    );

    await openSettings();
    expect(
      screen.getByRole("textbox", { name: "질문 뒤에 붙일 문장" }),
    ).toHaveValue("를 알려줘");
    await userEvent.click(screen.getByRole("button", { name: "기본값으로" }));
    expect(
      screen.getByRole("textbox", { name: "질문 뒤에 붙일 문장" }),
    ).toHaveValue("에 대해 자세히 설명해줘");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(async () =>
      expect(await getQuestionSuffixes()).toEqual({}),
    );
  });

  it("switches the tail off without losing the wording", async () => {
    render(
      <DrawerPanel
        site="claude"
        onItemClick={() => {}}
        conversationId={null}
      />,
    );
    const openSettings = () =>
      userEvent.click(screen.getByRole("button", { name: "질문 꼬리말 설정" }));

    await openSettings();
    const toggle = screen.getByRole("switch", { name: "꼬리말 붙이기" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(
      screen.getByRole("textbox", { name: "질문 뒤에 붙일 문장" }),
    ).toBeDisabled();
    expect(screen.getByText("리액트 훅")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(async () =>
      expect(await getQuestionSuffixEnabled()).toBe(false),
    );
    expect(await getQuestionSuffixes()).toEqual({});

    await openSettings();
    expect(
      screen.getByRole("switch", { name: "꼬리말 붙이기" }),
    ).toHaveAttribute("aria-checked", "false");
    expect(
      screen.getByRole("textbox", { name: "질문 뒤에 붙일 문장" }),
    ).toHaveValue("에 대해 자세히 설명해줘");
  });

  it("docks the page while open and undocks when collapsed", async () => {
    render(
      <DrawerPanel
        site="claude"
        onItemClick={() => {}}
        conversationId={null}
      />,
    );

    await waitFor(() =>
      expect(document.documentElement.classList.contains(DOCK_CLASS)).toBe(
        true,
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: "서랍 닫기" }));

    expect(document.documentElement.classList.contains(DOCK_CLASS)).toBe(false);
    expect(
      screen.getByRole("button", { name: "서랍 열기" }),
    ).toBeInTheDocument();
  });
});
