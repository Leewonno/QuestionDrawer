import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    // Resolved from public/_locales/<locale>/messages.json. The manifest is the
    // one place the runtime locale toggle can't reach — Chrome picks the store
    // name and description from the browser UI language, falling back to
    // default_locale. In-app strings live in src/lib/i18n.ts instead.
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "ko",
    permissions: ["storage", "clipboardWrite"],
    host_permissions: [
      "*://claude.ai/*",
      "*://chatgpt.com/*",
      "*://*.kimi.com/*",
      "*://gemini.google.com/*",
      "*://*.deepseek.com/*",
      "*://grok.com/*",
    ],
    // Pretendard is loaded at runtime via a chrome-extension:// URL so it
    // bypasses the host pages' strict `default-src 'none'` CSP. The font must be
    // web-accessible for the content script to fetch it.
    web_accessible_resources: [
      {
        resources: ["fonts/*"],
        matches: [
          "*://claude.ai/*",
          "*://chatgpt.com/*",
          "*://*.kimi.com/*",
          "*://gemini.google.com/*",
          "*://*.deepseek.com/*",
          "*://grok.com/*",
        ],
      },
    ],
  },
});
