---
name: dooray
description: Work with Dooray for posts/messages, Project tasks, and Wiki pages through authenticated Dooray APIs or webhook-based automations. Use when the user asks to search, fetch, summarize, triage, report, create drafts for, or automate Dooray 게시글/메신저, 업무/Task, 위키, 프로젝트, or n8n Dooray workflows.
---

# Dooray

Use this skill for Dooray 게시글, 업무(Task), 위키, 메신저, 프로젝트, and related automations. Default to Dooray Service API for user/content workflows; do not use Management/Admin API unless the user explicitly requests tenant administration.

## Security rules

- Never store Dooray API tokens, webhook URLs, cookies, sessions, or exported private content in Git or memory.
- Store tokens/webhooks only in macOS Keychain, environment secrets, token files outside Git, or n8n credentials.
- Do not send Dooray messages, create tasks, edit wiki pages, or mutate external Dooray state without explicit user confirmation.
- Read/list/search/summarize is safe when credentials are already configured.
- For group chats, summarize minimally and do not leak private Dooray content unless the user explicitly asked in the same trusted context.

## Local config

Default config path:

```text
~/.config/dooray/config.json
```

Recommended shape:

```json
{
  "baseUrl": "https://api.dooray.com",
  "tokenKeychainService": "dooray-api-token",
  "tokenKeychainAccount": "default",
  "tenant": "",
  "defaults": {
    "taskProjects": [],
    "wikiProjects": [],
    "messageTarget": ""
  }
}
```

Register a token locally on Mac/OpenClaw:

```bash
~/.openclaw/skills/dooray/scripts/setup-keychain-token.sh dooray-api-token default
```

Check config/token without printing secrets. In portable environments, `DOORAY_API_TOKEN` or `DOORAY_API_TOKEN_FILE` is also supported:

```bash
node ~/.openclaw/skills/dooray/scripts/dooray-api.mjs config
```


## Read-only helpers

- `scripts/projects-list.mjs` — list Project projects and wiki ids.
- `scripts/tasks-list.mjs --project <id-or-code>` — list task/post summaries for a project.
- `scripts/post-get.mjs --project <id-or-code> --post <id-or-number>` — fetch one Project post/task body.
- `scripts/wikis-list.mjs` — list readable wikis.
- `scripts/wiki-get.mjs --wiki <id-or-name-or-project-code>` — fetch a wiki page, defaulting to the home page.
- `scripts/messenger-list.mjs` — list messenger channels/rooms.
- `scripts/messenger-logs.mjs --channel <id-or-title>` — fetch recent message logs.

These helpers are read-only. They may print private company content locally; summarize carefully in chats.

## Core workflow

1. If credentials are missing, help the user create `~/.config/dooray/config.json` and store a token with `setup-keychain-token.sh`.
2. For API reads, use `scripts/dooray-api.mjs request <METHOD> <PATH>` or a purpose-built helper added later.
3. For writes, first dry-run or draft the payload; ask the user before sending.
4. If the exact Dooray endpoint is unclear, inspect official Dooray API docs or use `request GET` against safe discovery endpoints; do not guess destructive endpoints.
5. For recurring automations, prefer n8n for scheduled collection/sending and keep OpenClaw as setup/audit/helper.

## Current domains

- 게시글: fetch/search/summarize posts, extract action items, draft replies.
- 업무/Task: list assigned/in-progress tasks, summarize due dates, prepare status reports, draft task updates.
- 위키: fetch/search/summarize wiki pages, draft updates; edit only after confirmation.
- 메신저: fetch/summarize rooms or messages when supported, draft/send messages after confirmation.
- 자동화: build n8n workflows around Dooray API, credentials, schedules, and message formatting.

## References

- For implementation roadmap and endpoint notes, read `references/api-notes.md`.
- For 게시글/업무/위키/메신저 domain workflows and Service API vs Admin API guidance, read `references/domain-workflows.md`.
- For Codex app / Claude Code / n8n portability, read `references/portability.md`.
- For the pending Task due-date automation, read `references/task-status-automation.md`.


## Portability

This skill is not Mac-mini-only. Keep the package portable for Codex app and Claude Code by using environment credentials (`DOORAY_API_TOKEN` or `DOORAY_API_TOKEN_FILE`) when Keychain is unavailable. For detailed setup differences, read `references/portability.md`.

## AI기술혁신부 주간 보고서 초안

Default department/project for weekly meeting/report drafts is `AI기술혁신부(SE2)`. Other departments can be added later by passing `--project <project-code>` and preserving the same transformation rules.

Use `scripts/weekly-report-draft.mjs` to create a local draft from the previous meeting/report markdown or Dooray post. This helper is read-only toward Dooray; it does not upload or edit anything.

Rules implemented:

- Update likely title to the actual target week, e.g. `5월 4주차 주간업무보고서`.
- Update likely `No.`/meeting date fields to the draft date.
- Preserve existing table rows and the `구분`, `프로젝트`, `담당자` cells.
- In markdown tables, blank only `진행사항` and `이슈사항` columns to `•`.
- Preserve `전파사항`.
- Preserve `휴가 및 외근`, but remove bullet/table rows with dates before the meeting date when detectable.

Example:

```bash
node scripts/weekly-report-draft.mjs \
  --project 'AI기술혁신부(SE2)' \
  --post <previous-post-id> \
  --date 2026-05-28 \
  --out /tmp/weekly-report-draft.md
```

Do not create/update the Dooray post until the user reviews the draft and explicitly approves upload.
