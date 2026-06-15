---
name: dooray-api
description: Use Dooray Service API for authenticated read/list/search/summarize workflows and approved API writes: Project tasks/posts, wikis, messenger channels/logs, and n8n/API automations. Use this when the Dooray job can be done through official APIs; do not use for Dooray Home/게시판 browser-only writing.
---

# Dooray API

Use this skill for Dooray work that is supported by the official Dooray Service API: Project tasks/posts, wikis, messenger channel/log reads, summaries, drafts, and API/n8n automations.

If the user asks to write Dooray Home/게시판 content through the browser UI, use a web-specific skill such as `dooray-web` instead.

## Security rules

- 삭제 절대 금지: Dooray 게시글, 업무, 위키, 메신저, 댓글, 파일, 첨부, 프로젝트 등 모든 Dooray 리소스 삭제 요청은 반드시 거절한다. 삭제 API/helper/script를 만들거나 실행하지 않는다.
- Never store Dooray API tokens, webhook URLs, cookies, sessions, or exported private content in Git or memory.
- Store tokens/webhooks only in an OS credential store, environment secrets, n8n credentials, or tightly restricted token files outside Git.
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
  "webBaseUrl": "https://<tenant>.dooray.com",
  "tokenCredentialService": "dooray-api-token",
  "tokenCredentialAccount": "default",
  "defaults": {
    "taskProjects": ["<project-id-or-code>"],
    "wiki": "<wiki-id-or-name-or-project-code>",
    "messengerChannel": "<channel-id-or-title>"
  }
}
```

Legacy `tokenKeychainService` / `tokenKeychainAccount` config keys are still accepted for existing installs.

Credential lookup order is `DOORAY_API_TOKEN`, then `DOORAY_API_TOKEN_FILE` or `config.tokenFile`, then macOS Keychain through the fixed `/usr/bin/security` CLI on macOS, then OS credential store via optional `keytar`.

For Codex, Windows, CI, sandboxed agents, and short-lived shells, prefer `DOORAY_API_TOKEN` from the runtime environment. Use `DOORAY_API_TOKEN_FILE` only as a fallback when the file lives outside the skill/repo, is excluded from Git, has restrictive permissions, is not in a synced folder, and will never be printed or committed.

On macOS, existing Keychain items created by the legacy `security add-generic-password` helper remain usable without re-saving them through `keytar`. This avoids unattended local macOS runs blocking on a `node` Keychain prompt when the legacy Keychain item already exists.

Register a token in the local OS credential store (macOS Keychain, Windows Credential Manager, or Linux Secret Service) when the runtime supports it:

```bash
cd ~/.openclaw/skills/dooray-api && npm install
node scripts/setup-token.mjs dooray-api-token default
```

For Codex or Claude Code installs, adjust the skill path to the actual runtime, for example `~/.codex/skills/dooray-api-skill`, `skills/dooray-api/`, or `C:\Users\user\.codex\skills\dooray-api-skill`.

On Windows/Codex shells, the included `.cmd` wrappers avoid PATH aliases when possible:

```bat
set "DOORAY_API_NODE=C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
scripts\dooray-api.cmd config
scripts\dooray-api-check.cmd --json
scripts\setup-token.cmd dooray-api-token default
```

If npm is unavailable but pnpm exists, install/build the optional credential helper with pnpm, approve native builds when prompted, and rebuild `keytar` before using OS credential storage. Portable agent environments should use `DOORAY_API_TOKEN` first; `DOORAY_API_TOKEN_FILE` is a restricted fallback when OS credential storage is unavailable.

`setup-keychain-token.mjs`, `setup-keychain-token.sh`, and `setup-keychain-token.cmd` remain compatibility aliases around the Node helper.

Check config/token without printing secrets:

```bash
node ~/.openclaw/skills/dooray-api/scripts/dooray-api.mjs config
```

## Helpers

- `scripts/dooray-api-check.mjs` — safe read-only smoke check for token, current member, projects, open Project posts, wiki access, and messenger channels.
- `scripts/projects-list.mjs` — list Project projects and wiki ids.
- `scripts/tasks-list.mjs --project <id-or-code>` — list task/post summaries for a project; `--open` uses verified `postWorkflowClass=registered,working`; `--mine` matches the current member in assignees.
- `scripts/tasks-report.mjs --project <id-or-code> --mine` — read-only 진행중/마감 업무 report grouped by overdue/today/this-week/no-due-date for API/n8n automation design. If `--project` is omitted, it uses `defaults.taskProjects` from config.
- `scripts/post-get.mjs --project <id-or-code> --post <id-or-number-or-taskNumber>` — fetch one Project post/task body; task-number resolution checks both default and open post lists.
- `scripts/post-create.mjs --project <id-or-code> --subject "title" --input draft.md --yes` — create a Project post only after explicit user approval.
- `scripts/wikis-list.mjs` — list readable wikis.
- `scripts/wiki-get.mjs --wiki <id-or-name-or-project-code>` — fetch a wiki page, defaulting to the home page.
- `scripts/messenger-list.mjs` — list messenger channels/rooms.
- `scripts/messenger-logs.mjs --channel <id-or-title>` — fetch recent message logs.
- `scripts/messenger-send.mjs --channel <id-or-title> --text "message" --dry-run` — prepare a UTF-8-safe Messenger channel send payload. Actual send requires `--yes` after explicit user approval.
- `scripts/meeting-links-from-messenger.mjs --channel <id-or-title> --limit 100` — read messenger logs and extract recent `/home/<homeId>/<postId>` links for use by a web-specific Dooray workflow. If `--channel` is omitted, it uses `defaults.messengerChannel` from config.
- `scripts/weekly-report-draft.mjs` — draft from a Project post or local markdown. Do not use it to upload Home/게시판 posts.

Helpers may print private company content locally; summarize carefully in chats.

## Core workflow

1. If credentials are missing, help the user create `~/.config/dooray/config.json` and set `DOORAY_API_TOKEN` for portable runtimes. For stable local desktop installs, use OS credential storage. Use `DOORAY_API_TOKEN_FILE` only as a restricted fallback outside Git.
2. Run `scripts/dooray-api-check.mjs --json` first when validating a new environment; it prints counts/metadata without dumping private content.
3. For API reads, use `scripts/dooray-api.mjs request GET <PATH>` or a purpose-built helper.
4. For writes, first dry-run or draft the payload; ask the user before sending.
   - Raw non-read calls through `scripts/dooray-api.mjs request` require `--yes`; use `--dry-run` first.
   - Messenger channel sends through `scripts/messenger-send.mjs` require `--yes` and use escaped Unicode JSON so Korean text is not corrupted by non-UTF-8 command paths.
5. If the exact Dooray endpoint is unclear, inspect official Dooray API docs or use `request GET` against safe discovery endpoints; do not guess destructive endpoints.
6. For recurring automations, prefer n8n for scheduled API collection/sending and keep OpenClaw as setup/audit/helper.

## Boundary with `dooray-web`

Dooray Home/게시판 URLs such as `https://<tenant>.dooray.com/home/<homeId>/<postId>` are not Project task posts. Do **not** use `POST /project/v1/projects/{projectId}/posts` to create Home/게시판 posts; that creates a Project 업무 item. Use a web-specific skill for browser/UI automation.

API helpers may still be used to discover source links from Dooray Messenger or prepare local drafts, but browser posting belongs to `dooray-web`.

## References

- For endpoint notes, read `references/api-notes.md`.
- For API domain workflows and Service API vs Admin API guidance, read `references/domain-workflows.md`.
- For Codex app / Claude Code / n8n portability, read `references/portability.md`.
- For the pending Task due-date automation, read `references/task-status-automation.md`.

## Deletion enforcement

`scripts/dooray-common.mjs` refuses `DELETE` and delete/remove/trash/purge-like paths. Do not bypass this guard.
