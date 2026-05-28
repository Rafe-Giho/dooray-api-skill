---
name: dooray
description: Work with Dooray for posts/messages, Project tasks, and Wiki pages through authenticated Dooray APIs or webhook-based automations. Use when the user asks to search, fetch, summarize, triage, report, create drafts for, or automate Dooray 게시글/메신저, 업무/Task, 위키, 프로젝트, or n8n Dooray workflows.
---

# Dooray

Use this skill for Dooray 게시글/메신저, 업무(Task), 위키, 프로젝트, and related automations.

## Security rules

- Never store Dooray API tokens, webhook URLs, cookies, sessions, or exported private content in Git or memory.
- Store tokens/webhooks only in macOS Keychain or n8n credentials.
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

Register a token locally:

```bash
~/.openclaw/skills/dooray/scripts/setup-keychain-token.sh dooray-api-token default
```

Check config/token without printing secrets:

```bash
node ~/.openclaw/skills/dooray/scripts/dooray-api.mjs config
```

## Core workflow

1. If credentials are missing, help the user create `~/.config/dooray/config.json` and store a token with `setup-keychain-token.sh`.
2. For API reads, use `scripts/dooray-api.mjs request <METHOD> <PATH>` or a purpose-built helper added later.
3. For writes, first dry-run or draft the payload; ask the user before sending.
4. If the exact Dooray endpoint is unclear, inspect official Dooray API docs or use `request GET` against safe discovery endpoints; do not guess destructive endpoints.
5. For recurring automations, prefer n8n for scheduled collection/sending and keep OpenClaw as setup/audit/helper.

## Current domains

- 게시글/메신저: fetch/search/summarize messages or prepare/send announcements after confirmation.
- 업무/Task: list assigned/in-progress tasks, summarize due dates, prepare status reports.
- 위키: fetch/search/summarize wiki pages, draft updates; edit only after confirmation.
- 자동화: build n8n workflows around Dooray API, credentials, schedules, and message formatting.

## References

- For implementation roadmap and endpoint notes, read `references/api-notes.md`.
- For the pending Task due-date automation, read `references/task-status-automation.md`.
