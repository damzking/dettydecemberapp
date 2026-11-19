-- Portable setup for an external PostgreSQL database, run manually with psql.
-- On Replit use the development schema push; Publish manages production schema.
CREATE TABLE IF NOT EXISTS ideas (
  id text PRIMARY KEY,
  city text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  area text NOT NULL,
  price_level text NOT NULL,
  blurb text NOT NULL,
  seller text,
  status text NOT NULL,
  date_checked text NOT NULL,
  source text NOT NULL
);
CREATE TABLE IF NOT EXISTS tips (
  id text PRIMARY KEY,
  category text NOT NULL,
  title text NOT NULL,
  body text NOT NULL
);
CREATE TABLE IF NOT EXISTS price_items (
  id text PRIMARY KEY,
  label text NOT NULL,
  range_text text NOT NULL,
  last_checked text NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
  id text PRIMARY KEY,
  idea_id text NOT NULL REFERENCES ideas(id) ON DELETE RESTRICT,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
