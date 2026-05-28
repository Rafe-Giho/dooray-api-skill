# Dooray API Notes

This skill starts as a broad Dooray integration scaffold. Endpoint details should be verified against the actual Dooray tenant/API docs before building specialized commands.

## Intended API areas

- Common/member identity: verify token and current user.
- Messenger/posts: read or send messages/posts, depending on tenant API support.
- Project/task: projects, tasks, assignees, workflow/status, due dates, comments.
- Wiki: wiki projects/pages, page bodies, update history.

## Implementation pattern

- Use `dooray-api.mjs request METHOD PATH` for low-level verified calls.
- Add deterministic wrappers only after verifying endpoints against the live tenant:
  - `tasks-list.mjs`
  - `tasks-report.mjs`
  - `wiki-get.mjs`
  - `posts-search.mjs`
  - `message-send.mjs`
- Wrappers should support read-only by default and require explicit flags for writes.

## Safety

- Treat Dooray content as private company data.
- Do not log full API responses unless needed locally.
- Redact tokens/webhook URLs in all outputs.
- For write operations, print payload and wait for user confirmation unless the user already gave a specific command.
