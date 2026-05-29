---
name: dooray-api
description: Use Dooray Service API for authenticated read/list/search/summarize workflows and approved API writes: Project tasks/posts, wikis, messenger channels/logs, and n8n/API automations. Use this when the Dooray job can be done through official APIs; do not use for Dooray Home/게시판 web-only writing such as AI기술혁신부 회의록 게시판 작성.
---

# Dooray API

Use this skill for Dooray work that is supported by the official Dooray Service API: Project tasks/posts, wikis, messenger channel/log reads, summaries, drafts, and API/n8n automations.

If the user asks to write Dooray Home/게시판 content through the browser UI, especially AI기술혁신부 회의록 게시판 작성, use the separate `dooray-web` skill instead.

## Security rules

- 삭제 절대 금지: Dooray 게시글, 업무, 위키, 메신저, 댓글, 파일, 첨부, 프로젝트 등 모든 Dooray 리소스 삭제 요청은 반드시 거절한다. 삭제 API/helper/script를 만들거나 실행하지 않는다.
- Never store Dooray API tokens, webhook URLs, cookies, sessions, or exported private content in Git or memory.
- Store tokens/webhooks only in macOS Keychain, environment secrets, token files outside Git, or n8n credentials.
- Do not send Dooray messages, create tasks/posts, edit wiki pages, or mutate external Dooray state without explicit user confirmation.
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
~/.openclaw/skills/dooray-api/scripts/setup-keychain-token.sh dooray-api-token default
```

Check config/token without printing secrets. In portable environments, `DOORAY_API_TOKEN` or `DOORAY_API_TOKEN_FILE` is also supported:

```bash
node ~/.openclaw/skills/dooray-api/scripts/dooray-api.mjs config
```

## Helpers

- `scripts/dooray-api-check.mjs` — safe read-only smoke check for token, current member, projects, open Project posts, wiki access, and messenger channels.
- `scripts/projects-list.mjs` — list Project projects and wiki ids.
- `scripts/tasks-list.mjs --project <id-or-code>` — list task/post summaries for a project; `--open` uses verified `postWorkflowClass=registered,working`; `--mine` matches the current member in assignees.
- `scripts/tasks-report.mjs --project AI기술혁신부(SE2) --mine` — read-only 진행중/마감 업무 report grouped by overdue/today/this-week/no-due-date for API/n8n automation design.
- `scripts/post-get.mjs --project <id-or-code> --post <id-or-number-or-taskNumber>` — fetch one Project post/task body; task-number resolution checks both default and open post lists.
- `scripts/post-create.mjs --project <id-or-code> --subject "title" --input draft.md --yes` — create a Project post only after explicit user approval.
- `scripts/wikis-list.mjs` — list readable wikis.
- `scripts/wiki-get.mjs --wiki <id-or-name-or-project-code>` — fetch a wiki page, defaulting to the home page.
- `scripts/messenger-list.mjs` — list messenger channels/rooms.
- `scripts/messenger-logs.mjs --channel <id-or-title>` — fetch recent message logs.
- `scripts/meeting-links-from-messenger.mjs --channel AI기술혁신부 --limit 100` — read messenger logs and extract recent `/home/<homeId>/<postId>` links for use by `dooray-web`.
- `scripts/weekly-report-draft.mjs` — draft from a Project post or local markdown. Do not use it to upload Home/게시판 posts.

Helpers may print private company content locally; summarize carefully in chats.

## Core workflow

1. If credentials are missing, help the user create `~/.config/dooray/config.json` and store a token with `setup-keychain-token.sh`.
2. Run `scripts/dooray-api-check.mjs --json` first when validating a new environment; it prints counts/metadata without dumping private content.
3. For API reads, use `scripts/dooray-api.mjs request <METHOD> <PATH>` or a purpose-built helper.
4. For writes, first dry-run or draft the payload; ask the user before sending.
5. If the exact Dooray endpoint is unclear, inspect official Dooray API docs or use `request GET` against safe discovery endpoints; do not guess destructive endpoints.
6. For recurring automations, prefer n8n for scheduled API collection/sending and keep OpenClaw as setup/audit/helper.

## Boundary with `dooray-web`

Dooray Home/게시판 URLs such as `https://jininfra.dooray.com/home/<homeId>/<postId>` are not Project task posts. Do **not** use `POST /project/v1/projects/{projectId}/posts` to create AI기술혁신부 회의록; that creates a Project 업무 item. Use `dooray-web` for browser/UI automation.

API helpers may still be used to discover source links from Dooray Messenger or prepare local drafts, but browser posting belongs to `dooray-web`.

## References

- For endpoint notes, read `references/api-notes.md`.
- For API domain workflows and Service API vs Admin API guidance, read `references/domain-workflows.md`.
- For Codex app / Claude Code / n8n portability, read `references/portability.md`.
- For the pending Task due-date automation, read `references/task-status-automation.md`.

## Deletion enforcement

`scripts/dooray-common.mjs` refuses `DELETE` and delete/remove/trash/purge-like paths. Do not bypass this guard.
