-- 0015_member_profile_photo.sql — profile photo storage on member_profiles.
-- Stored as a data URL (data:image/jpeg;base64,...) inline. We cap the
-- raw upload at 2 MB on the client + server, which is ~2.7 MB encoded.
-- Migration to R2 is a follow-up once the bucket is provisioned; the
-- API surface (PUT /api/me/profile { photo }) stays the same.

ALTER TABLE member_profiles ADD COLUMN photo TEXT;
ALTER TABLE member_profiles ADD COLUMN photo_size INTEGER;
