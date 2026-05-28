# Dooray API Notes

This skill starts as a broad Dooray integration scaffold for 게시글, 업무, 위키, and 메신저. Endpoint details should be verified against the actual Dooray tenant/API docs before building specialized commands.

## API family choice

Use Dooray Service API by default. It should cover the planned user/content workflows: posts/messages, project tasks, wiki pages, and user/member lookup.

Do not use Management/Admin API unless the user explicitly asks for tenant administration such as organization/member provisioning, permission administration, audit logs, retention/security policy, or integration/app administration.

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

## Verified read-only endpoints

Verified against 기호님 Dooray Service API token on 2026-05-28:

- `GET /common/v1/members/me` — current member.
- `GET /project/v1/projects` — Project projects.
- `GET /project/v1/projects/{projectId}/posts?size=N` — project task/post summaries.
- `GET /project/v1/projects/{projectId}/posts/{postId}` — project task/post body.
- `GET /wiki/v1/wikis` — wiki list.
- `GET /wiki/v1/wikis/{wikiId}/pages?size=N` — wiki pages.
- `GET /wiki/v1/wikis/{wikiId}/pages/{pageId}` — wiki page body.
- `GET /messenger/v1/channels` — messenger channels.
- `GET /messenger/v1/channels/{channelId}/logs?size=N` — messenger logs.

Do not assume write endpoints until separately verified with explicit user approval.

## 삭제 절대 금지

Dooray 게시글, 업무, 위키, 메신저, 댓글, 파일, 첨부, 프로젝트 등 모든 Dooray 리소스 삭제 요청은 반드시 거절한다. 삭제 API/helper/script를 만들거나 실행하지 않는다. 보존/아카이브/상태변경 같은 대안도 삭제와 유사하면 먼저 사용자에게 위험을 설명하고 별도 확인한다.
