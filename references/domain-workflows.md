# Dooray Domain Workflows

Use Service API by default for all user/content work. Management/Admin API is out of scope unless the user explicitly asks for tenant administration.

## API choice

### Use Service API for

- 게시글/메신저: read/search/summarize posts/messages, draft replies, send messages after confirmation.
- 업무/Task: list projects/tasks, inspect assignees/status/due dates/comments, create/update tasks after confirmation.
- 위키: list/search/read wiki pages, draft edits, update pages after confirmation.
- 사용자 본인/멤버 조회: identify current user or resolve assignee/recipient ids when Service API supports it.

### Do not use Management/Admin API unless explicitly needed for

- tenant-wide admin settings
- organization/member provisioning or deletion
- permission/role administration
- audit/compliance logs
- app/integration administration
- global retention/security policy changes

For 기호님의 planned workflows, Service API should be enough. If a specific endpoint is unavailable in Service API, pause and confirm before considering Management/Admin API.

## 게시글 / 메신저 workflow

Read-only default:

1. Resolve the target room/channel/post/thread.
2. Fetch only the needed range or search result.
3. Summarize with links, authors, dates, and action items.
4. Avoid pasting long private content into group chats.

Write flow:

1. Draft the message locally.
2. Show target + body + attachments/links.
3. Ask for confirmation.
4. Send only after explicit approval.

Future helpers:

- `posts-search.mjs`
- `posts-get.mjs`
- `messages-list.mjs`
- `message-send.mjs --dry-run` default

## 업무 / Task workflow

Read-only default:

1. Identify project scope and user scope.
2. Fetch tasks assigned to or watched by the user.
3. Filter statuses: open/in-progress/review/blocked as configured.
4. Group by overdue/today/this week/no due date.
5. Return concise summary and links.

Write flow:

1. Draft task create/update/comment payload.
2. Ask before changing assignee/status/due date/content.
3. Prefer comments over destructive edits when possible.

Future helpers:

- `tasks-list.mjs`
- `tasks-report.mjs`
- `tasks-comment.mjs --dry-run` default
- `tasks-update.mjs --dry-run` default

## 위키 workflow

Read-only default:

1. Resolve wiki project/page by id, title, or search.
2. Fetch page body and metadata.
3. Summarize or extract requested sections.
4. Preserve links and page identifiers for traceability.

Write flow:

1. Draft patch or replacement text.
2. Show a human-readable diff when possible.
3. Ask for confirmation.
4. Update only the intended page.

Future helpers:

- `wiki-search.mjs`
- `wiki-get.mjs`
- `wiki-draft-update.mjs`
- `wiki-update.mjs --dry-run` default

## Automation workflow

For recurring Dooray work, prefer n8n when it owns the schedule and message delivery.

Good candidates:

- Daily/weekly task status report.
- Due-date reminders.
- Project digest.
- Wiki change digest.

OpenClaw role:

- design workflow
- verify API calls
- generate n8n node payloads
- audit security and message format
- run local one-off checks when requested
