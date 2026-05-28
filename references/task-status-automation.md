# Dooray 내 Task 진행상태/기한 요약 n8n 자동화 준비안

## 결론
가능성이 높으므로 나중에 구축할 후보로 보관한다.

근거:
- Dooray는 서비스 API/개인 API 토큰을 제공하는 것으로 확인됨.
- n8n 커뮤니티 노드 `n8n-nodes-dooray`가 존재하며 Project/Task/Message/Calendar 액션을 지원한다고 안내되어 있음.
- Task 조회, 메시지 전송이 둘 다 가능해 보이므로 “내 진행중 task와 기한을 모아 Dooray 메신저로 알림” 구조가 적합하다.

## 목표
주기적으로 Dooray에서 기호님의 진행중 Task 목록과 기한을 수집하고, 요약 메시지를 Dooray 메신저 채널/DM으로 전송한다.

## 권장 구조
n8n 워크플로우로 구현한다. 누트가 직접 메시지를 던지는 방식이 아니라, n8n이 스케줄에 따라 정보를 수집하고 Dooray 메신저로 발송한다.

1. Cron Trigger
   - 예: 평일 오전 9시, 또는 매주 월요일 오전 등.
2. Dooray Task 조회
   - 개인 API 토큰 사용.
   - 담당자 = 기호님 또는 “내 업무” 기준.
   - 상태 = 진행중/열림/검토중 등 팀에서 쓰는 상태값만 필터.
   - dueDate/마감일 포함.
3. 정렬/필터링
   - 마감일 오름차순.
   - 기한 초과, 오늘/이번 주 마감, 기한 없음 구분.
4. 메시지 포맷 생성
   - 너무 길면 상위 N개 + 링크.
   - 프로젝트/업무명/상태/기한/URL 포함.
5. Dooray Messenger 전송
   - Dooray 메신저 DM 또는 지정 채널로 발송.
   - 가능하면 n8n Dooray Message Send 노드 사용.
   - 안 되면 Dooray Webhook/HTTP Request 노드로 대체.

## n8n 워크플로우 초안
- Trigger: Cron
- Node 1: Dooray Task Get Many 또는 HTTP Request
- Node 2: Function/Code — 상태/기한 필터링 및 정렬
- Node 3: IF — task 없음/있음 분기
- Node 4: Set/Function — 메시지 본문 생성
- Node 5: Dooray Message Send 또는 HTTP Request — Dooray 메신저 전송

## 메시지 예시
오늘 기준 진행중 업무 요약

- [D-0] 프로젝트명 / 업무명 — 오늘 마감
- [D-2] 프로젝트명 / 업무명 — 2026-05-01 마감
- [기한 없음] 프로젝트명 / 업무명 — 상태: 진행중

총 N건: 기한초과 A건, 이번 주 마감 B건, 기한 없음 C건

## 구축 시 확인해야 할 것
1. Dooray API 사용 가능 여부
   - 회사 Dooray 테넌트에서 개인 API 토큰 발급이 허용되는지.
   - API base URL: 민간/공공/전용망 여부에 따라 다를 수 있음.
2. 조회 기준
   - “내 task”의 정의: 담당자, 참조자, 요청자 포함 여부.
   - 대상 프로젝트 전체/특정 프로젝트.
   - 진행중으로 볼 상태값: 등록, 진행, 검토, 보류 등.
3. 알림 위치
   - Dooray 메신저 DM으로 받을지, 팀/개인 채널로 받을지.
   - 채널 ID 또는 수신자 계정 ID 필요.
4. 실행 주기
   - 매일/평일/매주 월요일 중 선택.
   - 업무 시작 전 또는 퇴근 전 등.
5. 보안
   - Dooray API 토큰은 n8n credentials/환경변수에 저장.
   - 토큰을 OpenClaw memory/plans에 기록하지 않는다.

## 리스크/대안
- 회사 정책상 API 토큰 발급이 막혀 있으면 구현 보류.
- n8n 커뮤니티 노드가 회사 Dooray 환경과 맞지 않으면 HTTP Request 노드로 직접 API 호출.
- Task API에서 “내 업무” 필터가 부족하면 프로젝트별 조회 후 담당자/상태를 n8n에서 후처리.
- Dooray 메신저 직접 전송이 제한되면 Incoming Webhook 채널로 발송.

## 나중에 구축 시작 조건
기호님이 아래 정보를 주면 바로 설계/구현 가능:
- Dooray 접속/테넌트 유형 및 API base URL
- 개인 API 토큰 발급 가능 여부
- 알림 받을 Dooray 메신저 위치(DM/채널)
- 대상 프로젝트 범위
- 진행중 상태값 정의
- 원하는 알림 주기와 시간
