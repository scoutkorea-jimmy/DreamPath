-- v01.067.00 — extend PII-at-rest encryption to inbound + outbound emails.
--
-- The mailbox tables hold extensive PII: people email the operator about
-- their applications, often including national IDs, family situations,
-- finances, health. Outbound replies and our own confirmation emails
-- carry user names + admission decisions. This round encrypts the three
-- highest-PII content fields per table (subject, body_text, body_html)
-- while leaving the address columns (from_addr / to_addr) in plaintext
-- because they're heavily used for routing, grouping, and per-mailbox
-- filtering. The trade-off: a D1 backup leak still reveals who
-- corresponded with whom + timestamps (metadata), but not what was said.
-- Closing the address half is deferred to a later round once we add
-- HMAC indexes for the GROUP BY queries.
--
-- For both tables:
--   - subject_enc / body_text_enc / body_html_enc TEXT, all nullable.
--   - All three legacy plaintext columns are already nullable, so we
--     don't need the '' tombstone pattern.
--   - No HMAC columns — body content isn't exact-match searchable;
--     operator finds an email by id, from/to address, or timestamp.
ALTER TABLE inbound_emails  ADD COLUMN subject_enc    TEXT DEFAULT NULL;
ALTER TABLE inbound_emails  ADD COLUMN body_text_enc  TEXT DEFAULT NULL;
ALTER TABLE inbound_emails  ADD COLUMN body_html_enc  TEXT DEFAULT NULL;
ALTER TABLE outbound_emails ADD COLUMN subject_enc    TEXT DEFAULT NULL;
ALTER TABLE outbound_emails ADD COLUMN body_text_enc  TEXT DEFAULT NULL;
ALTER TABLE outbound_emails ADD COLUMN body_html_enc  TEXT DEFAULT NULL;
