import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, '../.output/chrome-mv3');

// Kept in sync with DRAWER_WIDTH_PX in src/lib/dock.ts; e2e runs against the
// built extension, so it can't import from src.
const DRAWER_WIDTH_PX = 320;

// Fixture mimics chatgpt.com's input box so the adapter resolves without login.
// A live-site flow requires a logged-in session and is documented as manual.
//
// This test loads the built extension (.output/chrome-mv3) into a real
// Chromium instance and drives the full capture -> persist -> insert flow
// against the local fixture page above. It requires a headful (or
// `--headless=new`) Chromium launch to load the unpacked extension.
let context: BrowserContext;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
    ],
  });
});

test.afterAll(async () => {
  await context.close();
});

test('captures a selection and inserts the question', async () => {
  const page = await context.newPage();
  // The extension only matches claude.ai / chatgpt.com; route a fake chatgpt page.
  await page.route('*://chatgpt.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<html><head><style>
        /* Mirrors chatgpt.com's real app shell, which carries Tailwind's
           w-screen (width: 100vw). Viewport units ignore a margin on <html>,
           so a plain-flow fixture would dock fine and hide the bug. */
        body { margin: 0 }
        .w-screen { width: 100vw }
      </style></head><body>
        <div id="shell" class="flex h-svh w-screen flex-col">
          <p id="answer">side effect</p>
          <div id="prompt-textarea" contenteditable="true"></div>
        </div>
      </body></html>`,
    }),
  );
  await page.goto('https://chatgpt.com/');

  await page.getByText('side effect').selectText();
  await page.dispatchEvent('body', 'mouseup');

  // The button lives in the extension's shadow root.
  const host = page.locator('question-drawer-ui');
  await host.getByRole('button', { name: '서랍에 담기' }).click();

  const item = host.getByText('side effect에 대해 자세히 설명해줘');
  await expect(item).toBeVisible();

  await item.click();

  // The drawer opens docked, so the host page gets pushed aside.
  // `:root` (not `html`) because `html` also matches the synthetic
  // <html> WXT injects inside the shadow root for style isolation.
  await expect(page.locator(':root')).toHaveClass(/qd-docked/);

  // Marking <html> is not enough: assert the shell actually got narrower.
  // Without this the drawer just covers the page and the test still passes.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.innerWidth -
          document.getElementById('shell')!.getBoundingClientRect().width,
      ),
    )
    .toBe(DRAWER_WIDTH_PX);

  await expect(page.locator('#prompt-textarea')).toContainText('side effect에 대해 자세히 설명해줘');
});
