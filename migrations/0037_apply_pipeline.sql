-- 0037_apply_pipeline.sql
-- DreamPath×CUFS 신청 시스템 개편 — 상태머신 파이프라인 토대.
--
-- WHAT: applications 테이블에 파이프라인 단계별 컬럼을 추가하고,
--   학생 고유번호(candidate_no) 발급용 연도별 카운터 테이블을 만든다.
--   설계서 v0.1 §6.1 기준.
-- WHY: 단일 5단계 위저드(신청→가짜결제 1회)를 서버 권위 상태머신
--   (draft→submitted→screen_passed→cufs_no_submitted→cufs_admitted→
--    docs_submitted→docs_verified→paid→enrolled)으로 전환.
-- CAVEAT: 운영자 확정(2026-06-19)에 따라 기존 레거시 신청 행은 전부 초기화한다.
--   프로토타입 테스트 데이터라 보존 가치가 없고, 신·구 status 의미가 충돌하기 때문.

-- ── 1) 파이프라인 단계 컬럼 ────────────────────────────────────────────────
ALTER TABLE applications ADD COLUMN candidate_no            TEXT;    -- 학생 고유번호 DP{YY}-{5자리}
ALTER TABLE applications ADD COLUMN phone                   TEXT;    -- 지원자 전화번호(국제번호)
ALTER TABLE applications ADD COLUMN phone_enc               TEXT;    -- 암호화본(PII)
ALTER TABLE applications ADD COLUMN cufs_reg_no             TEXT;    -- CUFS 접수번호(학생 입력)
ALTER TABLE applications ADD COLUMN cufs_reg_no_enc         TEXT;    -- 암호화본(PII)
ALTER TABLE applications ADD COLUMN screen_decided_at       TEXT;    -- 1차 스크리닝 결정 시각
ALTER TABLE applications ADD COLUMN screen_decided_by       TEXT;    -- 결정한 관리자 user_id
ALTER TABLE applications ADD COLUMN screen_note             TEXT;    -- 스크리닝 사유/메모
ALTER TABLE applications ADD COLUMN cufs_admit_verified_at  TEXT;    -- 합격증 검증 시각
ALTER TABLE applications ADD COLUMN cufs_admit_verified_by  TEXT;    -- 검증 관리자 user_id
ALTER TABLE applications ADD COLUMN docs_submitted_at       TEXT;    -- 서류 3종 제출 시각
ALTER TABLE applications ADD COLUMN docs_verified_at        TEXT;    -- 서류 검증(결제 오픈) 시각
ALTER TABLE applications ADD COLUMN docs_verified_by        TEXT;    -- 검증 관리자 user_id
ALTER TABLE applications ADD COLUMN enrolled_at             TEXT;    -- 등록 확정 시각
ALTER TABLE applications ADD COLUMN enrolled_by             TEXT;    -- 확정 관리자 user_id
ALTER TABLE applications ADD COLUMN provider_txn_id         TEXT;    -- 결제 PG 거래 식별자(데모=fake)

-- ── 2) 2차 결제 동의 3종 + 동의 버전 추적 ─────────────────────────────────
ALTER TABLE applications ADD COLUMN consent_cufs_refund_at  TEXT;    -- CUFS 환불 규정 동의 시각
ALTER TABLE applications ADD COLUMN consent_kdp_refund_at   TEXT;    -- KDP 환불 규정 동의 시각
ALTER TABLE applications ADD COLUMN consent_pg_pii_at       TEXT;    -- PG사 개인정보 제공 동의 시각
ALTER TABLE applications ADD COLUMN consent_versions_json   TEXT;    -- {consent_key: version} 스냅샷

-- ── 3) 학생 고유번호 발급용 연도별 카운터 ─────────────────────────────────
-- year(YY 2자리)별 마지막 시퀀스를 보관. 발급은 worker에서
--   INSERT ... ON CONFLICT DO UPDATE SET seq = seq + 1 RETURNING seq
-- 로 원자적 증가(동시성 안전).
CREATE TABLE IF NOT EXISTS candidate_counters (
  year TEXT PRIMARY KEY,
  seq  INTEGER NOT NULL DEFAULT 0
);

-- candidate_no는 전역 유일. 레거시 행은 NULL이므로 UNIQUE 충돌 없음.
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_candidate_no ON applications(candidate_no);
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);

-- ── 4) (C4) 레거시 신청 데이터 초기화 ──────────────────────────────────────
-- 운영자 확정(2026-06-19): 기존 프로토타입 신청 행은 전부 삭제.
-- R2 첨부 객체는 worker 측 정리 스크립트/관리자에서 별도 정리(orphan).
DELETE FROM application_files;
DELETE FROM apply_drafts;
DELETE FROM consents WHERE application_id IS NOT NULL;
DELETE FROM applications;
