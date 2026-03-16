ALTER TABLE messages ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX messages_search_idx ON messages USING GIN (search_vector);
