-- P2-5 expansion (v01.045): encrypt applicant birthdate the same way
-- v01.042 encrypted phone. Birthdate is a high-sensitivity PII field
-- — combined with name + email it pins down a real-world identity, so
-- a DB leak shouldn't carry it in plaintext.
ALTER TABLE applications ADD COLUMN birthdate_enc TEXT DEFAULT NULL;
