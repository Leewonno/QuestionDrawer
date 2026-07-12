import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Question Drawer',
    description: 'Drag-select terms in Claude/ChatGPT answers and save follow-up questions.',
    permissions: ['storage', 'clipboardWrite'],
    host_permissions: ['*://claude.ai/*', '*://chatgpt.com/*'],
  },
});
