import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
import { fakeBrowser } from "wxt/testing";
import { App } from "./App";
import { drawerStorage } from "@/src/lib/storage";
import { createDrawerItem } from "@/src/lib/template";

describe("App visibility", () => {
  beforeEach(() => {
    fakeBrowser.reset();
    history.replaceState(null, "", "/");
  });

  afterEach(() => {
    history.replaceState(null, "", "/");
  });

  it("renders nothing outside a conversation", () => {
    history.replaceState(null, "", "/settings/profile");
    const { queryByLabelText } = render(<App site="claude" />);
    expect(queryByLabelText("서랍 닫기")).toBeNull();
  });

  it("renders the drawer inside a conversation", () => {
    history.replaceState(null, "", "/chat/chat-1");
    const { queryByLabelText } = render(<App site="claude" />);
    expect(queryByLabelText("서랍 닫기")).not.toBeNull();
  });

  it("hides the drawer when leaving a conversation", async () => {
    history.replaceState(null, "", "/chat/chat-1");
    const { queryByLabelText } = render(<App site="claude" />);
    expect(queryByLabelText("서랍 닫기")).not.toBeNull();

    act(() => {
      history.replaceState(null, "", "/settings/profile");
    });

    await waitFor(() => {
      expect(queryByLabelText("서랍 닫기")).toBeNull();
    });
  });
});

describe("App conversation adoption", () => {
  beforeEach(() => {
    fakeBrowser.reset();
    history.replaceState(null, "", "/");
  });

  afterEach(() => {
    history.replaceState(null, "", "/");
  });

  it("adopts pending items when the new chat gains a conversation id", async () => {
    await drawerStorage.add(createDrawerItem("pending", "claude", null));
    render(<App site="claude" />);

    act(() => {
      history.replaceState(null, "", "/chat/chat-1");
    });

    await waitFor(async () => {
      const items = await drawerStorage.getAll();
      expect(items.map((i) => i.conversationId)).toEqual(["chat-1"]);
    });
  });

  it("does not adopt when moving between existing conversations", async () => {
    history.replaceState(null, "", "/chat/chat-1");
    await drawerStorage.add(createDrawerItem("pending", "claude", null));
    render(<App site="claude" />);

    act(() => {
      history.replaceState(null, "", "/chat/chat-2");
    });

    await waitFor(async () => {
      const items = await drawerStorage.getAll();
      expect(items.map((i) => i.conversationId)).toEqual([null]);
    });
  });
});
