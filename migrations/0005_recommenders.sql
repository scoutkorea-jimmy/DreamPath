-- Store the list of scout recommenders (>=3) as a JSON array on the application.
-- We keep the legacy single-recommender columns intact for backward compatibility,
-- but new submissions populate `recommenders_json` instead.
ALTER TABLE applications ADD COLUMN recommenders_json TEXT;
