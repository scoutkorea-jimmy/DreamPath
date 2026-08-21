# HANDOFF · 사이트 현행화 라운드 (진입 게이트 해제 + 신청 차단 + 규칙 체계)

- **시작**: 2026-08-22 (KST)
- **지시 원문**: "코리아 드림패스 사이트도 이제 현행화를 시작할 건데 그 첫 페이지에
  그 고지사항은 안 떠도 되고 모든 신청만 막아놔줘." + 폴더/규칙 체계 7개 항목
- **상태**: 완료 (2026-08-22)
- **버전**: v01.095.00 (배포됨)

## 목표
- [x] 진입 안내 게이트(EntryGate) 끄기
- [x] 모든 신청 차단 (폼 + 서버 + 마이페이지 파이프라인)
- [x] 다음 개폐를 운영자가 직접 하도록 관리자 토글 2종
- [x] 수신 메일 전량 `scoutkorea@kakao.com` 자동 포워드 설정 (7번)
- [x] 규칙 체계 구축 (1~6번) — CLAUDE.md 개편 + `rules/` 신설
- [x] 위키(`wiki:versions` · `wiki:kms`) 갱신
- [x] 루트 `HANDOFF.md` 갱신

## 진행
- [x] `c.apply_gate.closed` 신설 · 워커 503 게이트 · Apply/Member 화면 · 관리자 토글
- [x] v01.095.00 배포 · 커밋 · 푸시 (`05c1512`)
- [x] KV 에 `apply_gate` / `entry_gate` / `email_templates.forward_to` 명시 기록
- [x] `rules/` 폴더 + 인벤토리 생성기 + 규칙 문서 작성
- [x] `CLAUDE.md` 개편(라우팅표 + 새 절차) · `rules/` 신설 · 위키/HANDOFF 갱신
- [x] **완료** — 남은 것은 운영자 조치 1건(Cloudflare 목적지 인증)뿐

## 알게 된 사실 / 막힌 지점
- KV `dp_content_v1` 에는 `entry_gate` 키가 아예 없었다 → 코드 기본값이 곧 라이브 값이었다.
  이제 KV 에 명시 기록했으므로 **KV 가 코드 기본값을 이긴다**.
- 공개 `GET /api/content` 는 `stripPrivateContent()` 를 거친 **스크럽본**이다.
  KV 를 되쓸 때 이걸 그대로 쓰면 비공개 필드가 날아간다 — 반드시 `wrangler kv key get` 원본을 쓸 것.
- 메일 포워드는 Cloudflare 목적지 **인증(사람이 링크 클릭)** 없이는 동작하지 않는다.

## 검증
- 운영 호출: `/api/applications` · `/applications/upload` ·
  `/me/applications/:id/pay` · `/documents` → 전부 `503 applications_closed`.
- 로컬 헤드리스 크롬: 진입 게이트 미표시, `/apply` 안내 화면, 폼 미렌더, JS 예외 0건.
- `GET /api/content` 라이브 확인: `forward_to=scoutkorea@kakao.com`,
  `apply_gate.closed=true`, `entry_gate.enabled=false`.

## 종료 시 할 일
- [x] 배포 → 커밋 → 푸시 (`05c1512`, `26b5de7`)
- [x] 루트 `HANDOFF.md` + 관리자 위키(versions · kms) 갱신
- [x] `rules/03-history-success.md` 기록
- [x] 이 파일을 `rules/handoff/done/` 으로 이동

## 운영자에게 남은 조치
- [ ] **Cloudflare → Email → Routing → Destination addresses** 에서
      `scoutkorea@kakao.com` 인증 메일 링크 클릭. 그전까지 포워드만 실패하고
      메일은 D1(관리자 메일함)에 정상 보관된다. 실패는 관리자 → 오류 로그
      (`email_worker`)에 남는다.
