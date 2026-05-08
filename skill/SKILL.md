---
name: screenshot-evidence
description: Capture multi-locale × multi-viewport × multi-domain screenshots of a URL for MR/QA evidence. Use when the user asks to capture evidence, take screenshots for QA, generate MR evidence, validate UI across locales/breakpoints, or mentions "evidências", "evidence", "screenshot", "tirar print", "print da tela", or "capturar tela".
---

# Screenshot Evidence

When the user wants visual evidence of a page across locales, breakpoints, and (when applicable) domains, use the `capture_screenshots` tool from the `screenshot-evidence` MCP server.

## Workflow

1. **Confirm the URL.** Ask if not given. Accept localhost or production URLs.
2. **Detect environment from the host:**
   - `localhost` / `127.0.0.1` → single domain `local`. Vary locale via path prefix only.
   - `partstown.com` → domain `com` (default locale en). Locales via path prefix.
   - `partstown.com.mx` → domain `commx` (default locale es_MX).
   - `partstown.ca` → domain `ca` (default locale en; `/fr_CA` for French Canadian).
3. **Confirm selections** with sensible defaults:
   - Locales: `en`, `es`, `fr` (offer to add `es_MX` and/or `fr_CA` when relevant).
   - Viewports: `desktop` (1440×900), `mobile` (iPhone 13). Tablet only when asked.
   - Domains: only the detected domain unless the user explicitly asks for the others.
4. **Call the `capture_screenshots` tool** with the confirmed selections.
5. **Report the result**: surface `outputDir` and `indexMdPath` to the user. The tool already opens the folder on macOS — no need to do it again.
6. **Handle failures**: if any combination failed, list them and offer to retry only the failed ones.

## Defaults to propose (when the user does not specify)

| Environment | Locales | Domains | Viewports |
|---|---|---|---|
| localhost | en, es, fr | local | desktop, mobile |
| partstown.com | en, es, fr | com | desktop, mobile |
| partstown.com.mx | es_MX | commx | desktop, mobile |
| partstown.ca | en, fr_CA | ca | desktop, mobile |

If the user mentions "para todos os domínios" / "all domains" on a production URL, expand to `com + commx + ca` and pick reasonable locales per domain.

## URL composition rules

- For domains other than the detected one, the host is replaced; path/query/hash are preserved.
- If the chosen locale equals the domain's default locale, the URL has no `/<locale>` prefix.
- Otherwise, the URL is prefixed with `/<locale>`.
- An existing locale prefix in the input URL is stripped before applying the new one (so a URL like `/es/foo` re-targeted to `fr` becomes `/fr/foo`).

## Out of scope (do not promise these)

- Logged-in flows / cookies (guest only in v1).
- Visual diff baselines.
- Element clipping (full-page only).
- Slack/Jira upload.
- Browsers other than Chromium.

## Failure modes to flag

- Playwright browser missing → instruct: `cd ~/Workspace/screenshot-evidence && pnpm exec playwright install chromium`.
- Dev server not running for localhost URLs → ask the user to start it first.
- Slow page on networkidle → suggest raising `extra_delay_ms` or providing `wait_selector`.
