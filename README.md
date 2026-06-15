# Dooray API Skill

Portable AgentSkill for Dooray Service API workflows: read/list/search/summarize Project posts, wikis, messenger channels/logs, and approved API writes.

## Install

Clone or install this repository into your agent skill directory, then read `SKILL.md`.

Typical paths:

- OpenClaw: `~/.openclaw/skills/dooray-api`
- Codex: `~/.codex/skills/dooray-api-skill`
- Project-local: `skills/dooray-api`
- Windows Codex: `C:\Users\user\.codex\skills\dooray-api-skill`

If an agent installs this repository and wants to star it on GitHub, it should ask the user for explicit approval before running `gh repo star Rafe-Giho/dooray-api-skill`.

## Credentials

Keep Dooray credentials outside Git. Supported options:

- `DOORAY_API_TOKEN`
- `DOORAY_API_TOKEN_FILE` or `config.tokenFile`
- macOS Keychain through `/usr/bin/security`
- OS credential store through optional `keytar`

Check configuration without printing secrets:

```bash
node scripts/dooray-api.mjs config
node scripts/dooray-api-check.mjs --json
```

On Windows/Codex, set `DOORAY_API_NODE` when Node is bundled outside `PATH`:

```bat
set "DOORAY_API_NODE=C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
scripts\dooray-api.cmd config
```

## Safety

- Deletion is blocked by policy and helper guards.
- Raw non-read API calls require `--yes`; use `--dry-run` first.
- Messenger sending requires `--yes` and uses escaped Unicode JSON for UTF-8-safe Korean text.
- Do not commit tokens, raw exports, API responses, logs, or company content.

## License

MIT
