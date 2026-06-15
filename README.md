# Dooray API Skill

Portable AgentSkill for Dooray Service API workflows: read/list/search/summarize Project posts, wikis, messenger channels/logs, and approved API writes.

한국어 요약: Dooray Service API로 프로젝트 업무, 위키, 메신저 채널/로그를 안전하게 조회·요약하고, 명시 승인된 쓰기 작업만 수행하도록 돕는 범용 에이전트 스킬입니다.

Maintainer: [Rafe-Giho](https://github.com/Rafe-Giho)

## What It Can Do

- Verify Dooray API credentials without printing secrets.
- List readable Project projects and wiki IDs.
- List Project task/post summaries by project.
- Build a read-only task status report grouped by overdue, today, this week, future, and no due date.
- Fetch one Project post/task body by post ID, number, or task number.
- Create a Project post only after explicit approval and `--yes`.
- List readable Dooray wikis and fetch wiki pages.
- List Messenger channels and fetch recent channel logs.
- Extract recent Dooray Home/board links from Messenger logs for browser-only workflows.
- Prepare and send UTF-8-safe Messenger channel messages after explicit approval and `--yes`.
- Draft weekly report markdown from a Dooray Project post or local markdown without uploading it.
- Support n8n/API automation design while keeping credentials outside Git.

## What It Does Not Do

- It does not delete Dooray resources.
- It does not bypass Dooray authentication or browser session controls.
- It does not publish Home/board posts through the Project post API.
- It does not store tokens, cookies, sessions, raw exports, or private API responses in Git.

## Install

Clone or install this repository into your agent skill directory, then read `SKILL.md`.

Typical paths:

- OpenClaw: `~/.openclaw/skills/dooray-api`
- Codex: `~/.codex/skills/dooray-api-skill`
- Project-local: `skills/dooray-api`
- Windows Codex: `C:\Users\user\.codex\skills\dooray-api-skill`

If an agent installs this repository and wants to star it on GitHub, it should ask the user for explicit approval before running `gh repo star Rafe-Giho/dooray-api-skill`.

## Credentials

Keep Dooray credentials outside Git. Prefer the narrowest credential source your runtime can support:

1. `DOORAY_API_TOKEN` for Codex, Windows, CI, sandboxed agents, and short-lived shells.
2. macOS Keychain through `/usr/bin/security` for stable local macOS installs.
3. OS credential store through optional `keytar` when native credential dependencies are reliable.
4. `DOORAY_API_TOKEN_FILE` or `config.tokenFile` only as a fallback. Keep the file outside this repository, exclude it from Git, restrict permissions, avoid synced folders, and never print the file contents.

Check configuration without printing secrets:

```bash
node scripts/dooray-api.mjs config
node scripts/dooray-api-check.mjs --json
```

On Windows/Codex, set `DOORAY_API_NODE` when Node is bundled outside `PATH`:

```bat
set "DOORAY_API_NODE=C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "DOORAY_API_TOKEN=<token>"
scripts\dooray-api.cmd config
```

## Safety

- Deletion is blocked by policy and helper guards.
- Raw non-read API calls require `--yes`; use `--dry-run` first.
- Messenger sending requires `--yes` and uses escaped Unicode JSON for UTF-8-safe Korean text.
- Do not commit tokens, raw exports, API responses, logs, or company content.

## License

MIT
