import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES } from "./i18n";

// chrome.i18n fails silently: a missing key resolves to an empty string and a
// stale __MSG_ placeholder ships as literal text. These tests are the only thing
// standing between a typo and a broken store listing.

const LOCALES_DIR = join(process.cwd(), "public/_locales");
const CONFIG_PATH = join(process.cwd(), "wxt.config.ts");

function readMessages(locale: string): Record<string, { message: string }> {
  return JSON.parse(
    readFileSync(join(LOCALES_DIR, locale, "messages.json"), "utf8"),
  );
}

describe("public/_locales", () => {
  it("has a directory for every locale the UI supports", () => {
    expect(readdirSync(LOCALES_DIR).sort()).toEqual([...LOCALES].sort());
  });

  it("defines the same keys in every locale", () => {
    const [first, ...rest] = LOCALES;
    const expected = Object.keys(readMessages(first)).sort();
    for (const locale of rest) {
      expect(Object.keys(readMessages(locale)).sort()).toEqual(expected);
    }
  });

  it("has a non-empty message for every key", () => {
    for (const locale of LOCALES) {
      for (const [key, entry] of Object.entries(readMessages(locale))) {
        expect(entry.message.trim(), `${locale}/${key}`).not.toBe("");
      }
    }
  });

  it("keeps store descriptions within Chrome's 132 character limit", () => {
    for (const locale of LOCALES) {
      expect(
        readMessages(locale).extDescription.message.length,
        locale,
      ).toBeLessThanOrEqual(132);
    }
  });

  it("resolves every __MSG_*__ placeholder used in the manifest", () => {
    const config = readFileSync(CONFIG_PATH, "utf8");
    const used = [...config.matchAll(/__MSG_(\w+)__/g)].map((m) => m[1]);

    expect(used.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      const keys = Object.keys(readMessages(locale));
      for (const key of used) {
        expect(keys, `${locale} is missing ${key}`).toContain(key);
      }
    }
  });
});
