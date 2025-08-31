-- +migrate Up
ALTER TABLE matches ADD COLUMN holes TEXT DEFAULT '18';
-- +migrate Down
ALTER TABLE matches DROP COLUMN holes;
