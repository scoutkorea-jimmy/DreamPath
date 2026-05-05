-- 0017_outbound_html_cc_bcc.sql — outbound mail now carries rich (HTML) body
-- composed via TipTap, plus CC and BCC recipient lists. Stored as comma-
-- separated strings (we don't normalize into a recipients table because it's
-- send-once audit data, not a relational entity).

ALTER TABLE outbound_emails ADD COLUMN body_html TEXT;
ALTER TABLE outbound_emails ADD COLUMN cc        TEXT;
ALTER TABLE outbound_emails ADD COLUMN bcc       TEXT;
