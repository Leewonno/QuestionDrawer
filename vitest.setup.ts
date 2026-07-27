import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// jsdom reports navigator.language as "en-US", which would flip the UI to
// English. The existing suite is written against the Korean UI, so pin the
// detected locale to Korean; English behaviour is covered by tests that set the
// locale explicitly.
Object.defineProperty(navigator, "language", {
  value: "ko-KR",
  configurable: true,
});

afterEach(() => {
  cleanup();
});
