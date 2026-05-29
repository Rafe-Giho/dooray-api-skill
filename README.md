# dooray-api

Dooray Service API 기반 작업용 OpenClaw 스킬입니다.

## 용도

- Dooray Project 업무/게시글 조회 및 요약
- Wiki 조회 및 요약
- Messenger 채널/로그 조회 및 링크 탐색
- n8n/API 기반 자동화 준비
- 승인된 API 쓰기 작업 보조

## 사용하지 않는 경우

Dooray Home/게시판 웹 화면에서 회의록을 작성하거나 이전 게시글을 복사하는 작업은 `dooray-web` 스킬을 사용합니다.

특히 AI기술혁신부 회의록 게시판 작성은 Project post API로 만들면 안 됩니다.

## 주요 파일

- `SKILL.md` — 스킬 본문
- `scripts/` — Dooray API helper scripts
- `references/` — API/도메인/자동화 참고 문서

## 보안

토큰, webhook URL, 쿠키, 세션, 사내 비공개 원문은 Git이나 메모리에 저장하지 않습니다.
