# HANDOFF · 수신 메일의 발신자가 반송 주소로 저장됨

- **시작**: 2026-08-27 (KST)
- **지시 원문**: "010c01a…@ap-northeast-2.amazonses.com <010c01a…> · 2026. 8. 26.
  오후 4:10:10 — 이렇게 메일계정이 표현되는게 정상이야?"
- **상태**: 완료 (v01.101.03 배포·푸시·위키 반영)
- **기준 버전**: v01.101.02

## 증상
관리자 메일함 읽기 창의 발신자 이름·주소가 둘 다
`010c01a03ce7a2b1-…-000000@ap-northeast-2.amazonses.com` 로 표시된다.
실제 발신자(`Snowflake <no-reply@snowflake.com>`)가 어디에도 없다.

## 원인
`worker.js` 의 `email()` 이 `message.from` 을 발신자로 저장한다(worker.js:743-744).
Cloudflare Email Worker 의 `message.from` 은 **envelope sender(MAIL FROM /
Return-Path)** 다. 대량 발송 서비스(SES · 메일링리스트)는 여기에 반송 수집용
주소를 넣는다 — 사람이 읽을 발신자는 `From:` **헤더**에 있다.
대부분의 메일은 둘이 같아서 여태 드러나지 않았다.

## 이것은 표시 문제가 아니다
`admin.html` 의 `startReply()` 가 `setComposeTo(msg.from_addr)` 로 답장 수신자를
잡는다(admin.html:3508). 지금 답장을 누르면 **반송 주소로 메일이 나간다.**

## 진행
- [x] From 헤더 우선 파싱 + `firstEmailAddress()` + 단위 시험 10케이스 전부 통과
      (SES 캠페인 · RFC 2047 한글 이름 · 콤마 든 인용 이름 · 복수 주소 · 헤더 부재 ·
      주소 없는 헤더 · 대문자 정규화 · 전부 빈 경우)
- [x] **백필 불가 확정** — `raw` 를 보관하지 않고 `raw_size` 만 저장한다. 기존
      15통의 발신자는 반송 주소로 남는다.
- [x] preflight · 배포 · 라이브 version.js 01.101.03 확인 · 위키 2종 · 커밋/푸시

## 다음 라운드로 넘긴 것 (마이그레이션 필요)
- `Reply-To` 헤더 존중 — 메일링리스트는 회신 주소를 여기에 둔다.
- envelope sender 를 별도 컬럼에 보존 — 반송·스팸 추적에 쓸 수 있다.
