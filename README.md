# screenshot-evidence

CLI + MCP server + Claude Code skill to capture **multi-locale × multi-viewport × multi-domain** screenshots of any URL — designed for generating MR/QA evidence in seconds instead of minutes.

## Why

Every UI change at PartsTown needs evidence in `en`, `es`, `fr` (and sometimes `es_MX`/`fr_CA`), in desktop and mobile, sometimes across `.com` / `.com.mx` / `.ca`. Doing this by hand is slow and easy to skip. This tool runs Playwright (Chromium) for each combination and writes PNGs + an `index.md` to a single folder.

## Install (one-time)

```bash
cd ~/Workspace/screenshot-evidence
pnpm install
pnpm exec playwright install chromium
pnpm build
pnpm link --global
which screenshot-evidence   # should resolve to a symlink under your pnpm global bin
```

`pnpm link --global` puts `screenshot-evidence` on your `$PATH`. Re-run after every `pnpm build` if the dist path changes (rare).

## CLI usage

```bash
# Localhost — varies locale via path prefix
screenshot-evidence http://localhost:3000/m/star/1-12

# Production — varies domain + locale prefix
screenshot-evidence "https://www.partstown.com/parts?q=pitco"

# Pure flags (no prompts)
screenshot-evidence "https://www.partstown.com/parts?q=pitco" \
  --no-interactive \
  --domains com,commx,ca \
  --locales en,es,fr,es_MX,fr_CA \
  --viewports desktop,mobile \
  --delay 2000
```

Output goes to `~/Workspace/screenshot-evidence/output/<YYYY-MM-DD_HH-mm>_<slug>/`. Override with `--output-dir`.

### Flags

| Flag | Default | Notes |
|---|---|---|
| `[url]` | (prompt) | Base URL. Host determines local vs prod and the default domain. |
| `--locales` | en,es,fr | Comma-separated. One of: en, es, fr, es_MX, fr_CA |
| `--domains` | (detected) | local for localhost; com/commx/ca for prod |
| `--viewports` | desktop,mobile | One of: desktop (1440×900), mobile (iPhone 13), tablet (iPad Mini) |
| `--delay <ms>` | 1500 | Extra delay after `networkidle` |
| `--wait-selector <sel>` | — | Wait for selector before capturing |
| `--output-dir <path>` | `<pkg>/output` | Custom base dir |
| `--slug <slug>` | (auto) | Override the slug derived from the URL |
| `--no-interactive` | false | Skip prompts; use defaults / flag values |

## MCP setup (Claude Code)

Add to `~/.claude/settings.json` (or wherever your global Claude Code settings live):

```json
{
  "mcpServers": {
    "screenshot-evidence": {
      "command": "node",
      "args": ["/Users/jeandrocouto/Workspace/screenshot-evidence/dist/mcp.js"]
    }
  }
}
```

Restart Claude Code. The agent now has a `capture_screenshots` tool. Ask in natural language: _"captura evidência de http://localhost:3000/m/star/1-12 em en/es/fr × desktop/mobile"_.

## Skill setup (Claude Code)

Symlink the skill folder into your skills directory so Claude Code auto-loads it:

```bash
mkdir -p ~/.claude/skills
ln -s ~/Workspace/screenshot-evidence/skill ~/.claude/skills/screenshot-evidence
```

Restart Claude Code. The skill triggers on phrases like _"tirar print"_, _"evidências"_, _"screenshot for QA"_, etc.

## URL composition rules

| Domain | Host | Default locale (no prefix) | Other locales |
|---|---|---|---|
| `local`   | localhost              | en    | path prefix `/<locale>/...`     |
| `com`     | www.partstown.com      | en    | path prefix `/<locale>/...`     |
| `commx`   | www.partstown.com.mx   | es_MX | path prefix `/<locale>/...`     |
| `ca`      | www.partstown.ca       | en    | path prefix `/<locale>/...`     |

- The host of the input URL is replaced; path/query/hash are preserved.
- An existing locale prefix (e.g. `/es/foo`) is stripped before the new prefix is applied.
- If the chosen locale equals the domain default, no prefix is added.

## Output

```
output/2026-05-08_15-30_m-star-1-12/
├── desktop_en.png
├── desktop_es.png
├── desktop_fr.png
├── mobile_en.png
├── mobile_es.png
├── mobile_fr.png
└── index.md          # Markdown table you can paste into the MR description
```

## Development

```bash
pnpm dev:cli http://localhost:3000/m/star/1-12   # tsx — no build step
pnpm dev:mcp                                      # MCP server via tsx
pnpm test                                         # node --test
pnpm build                                        # tsc → dist/
```

## Troubleshooting

- **`Executable doesn't exist at .../chromium`** → `pnpm exec playwright install chromium`.
- **`screenshot-evidence: command not found`** → re-run `pnpm link --global` from the project dir.
- **Page never reaches networkidle** → use `--wait-selector` or raise `--delay`.
- **Stuck on Cloudflare challenge** in production → captures may show the challenge page; production captures are best-effort and not a substitute for visiting the page yourself.

## Out of scope (v1)

- Logged-in flows (no `storageState.json` support).
- Visual diffs / baselines.
- Element clipping (full-page only).
- Slack/Jira upload.
- Browsers other than Chromium.
