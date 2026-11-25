# Browser testing

The GitHub browser job runs Playwright against the local SynapKor server. For a headed run with a browser window on your computer, run these commands from the repository root with Node.js and npm installed.

```powershell
npm ci --prefix backend
npm install --no-save --no-package-lock @playwright/test@1.56.1
npx playwright install chromium
npx playwright test --headed --workers=1
```

## Playwright MCP for Codex

Install the Microsoft server in the Codex client that will control the browser.

```powershell
codex mcp add playwright -- npx -y @playwright/mcp@latest --browser chrome
codex mcp list
```

Restart the Codex client and open a new session if needed for the tools to appear. Ask Playwright MCP to navigate to the SynapKor demo. Chrome should open visibly. Playwright MCP defaults to headed mode.

[Microsoft Playwright MCP](https://playwright.dev/mcp/introduction) · [Codex MCP configuration](https://developers.openai.com/codex/mcp)
