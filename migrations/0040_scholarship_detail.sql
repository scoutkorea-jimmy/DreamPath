-- 0040_scholarship_detail.sql — richer scholarship detail pages (v01.091).
--
-- Clicking a board item now opens an internal detail page (/scholarship/:id)
-- that shows the full information ON our site (the external apply link lives
-- there too). Two new columns support that:
--   image     — optional feature image URL (uploaded to R2 via
--               /api/admin/upload-image, stored as a /uploads/ path)
--   info_json — flexible labelled info rows as a JSON array of {label, value}
--               (장학자격 / 범위 / 대상 / 선발인원 … — operator adds what they need)

ALTER TABLE scholarship_posts ADD COLUMN image     TEXT;
ALTER TABLE scholarship_posts ADD COLUMN info_json TEXT;
