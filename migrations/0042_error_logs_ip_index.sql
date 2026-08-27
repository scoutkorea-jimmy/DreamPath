-- 0042 — /api/errors 의 IP 기준 rate limit 을 D1 로 세기 위한 인덱스.
--
-- 왜 KV 가 아니라 D1 인가: KV 기반 rateLimit() 은 read-after-write 가 즉시
-- 반영되지 않아 빠른 연속 요청에서 카운트를 놓친다. 2026-08-27 실측에서
-- 38회 요청 중 19회만 세었다(약 50% 유실). 오류 보고는 어차피 같은 요청에서
-- D1 에 쓰므로, 같은 트랜잭션 경로에서 세는 편이 정확하고 추가 저장소도 없다.
CREATE INDEX IF NOT EXISTS idx_error_logs_ip_ts ON error_logs (ip, ts);
