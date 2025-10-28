-- Create tables for computed/derived data
-- This allows us to keep generated data in Supabase instead of committing to GitHub

-- Item embeddings table (for visualization)
CREATE TABLE IF NOT EXISTS item_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  x DECIMAL NOT NULL,
  y DECIMAL NOT NULL,
  profit INTEGER NOT NULL,
  stable DECIMAL NOT NULL,
  hold_min INTEGER NOT NULL,
  margin INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_item_embeddings_name ON item_embeddings(name);
CREATE INDEX IF NOT EXISTS idx_item_embeddings_updated ON item_embeddings(updated_at DESC);

-- Summary index table (daily summaries)
CREATE TABLE IF NOT EXISTS daily_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  net_worth BIGINT NOT NULL DEFAULT 0,
  profit BIGINT NOT NULL DEFAULT 0,
  percent_change DECIMAL NOT NULL DEFAULT 0,
  roi_decimal DECIMAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date DESC);

-- Enable Row Level Security
ALTER TABLE item_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- Allow public read access (since this is for a public dashboard)
CREATE POLICY "Allow public read access to item_embeddings"
  ON item_embeddings FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to daily_summaries"
  ON daily_summaries FOR SELECT
  USING (true);

-- Allow service role to insert/update/delete
CREATE POLICY "Allow service role full access to item_embeddings"
  ON item_embeddings FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to daily_summaries"
  ON daily_summaries FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE item_embeddings IS 'Computed PCA embeddings for item visualization';
COMMENT ON TABLE daily_summaries IS 'Daily profit/ROI summaries computed from flips';
