-- Create OSRS Item Volumes table
-- This table stores 24-hour volume data for OSRS items
-- Updated periodically via GitHub Actions

CREATE TABLE IF NOT EXISTS osrs_item_volumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id TEXT NOT NULL UNIQUE,
  item_name TEXT,
  volume_24h BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_osrs_item_volumes_item_id ON osrs_item_volumes(item_id);
CREATE INDEX IF NOT EXISTS idx_osrs_item_volumes_volume ON osrs_item_volumes(volume_24h DESC);
CREATE INDEX IF NOT EXISTS idx_osrs_item_volumes_last_updated ON osrs_item_volumes(last_updated DESC);

-- Enable Row Level Security
ALTER TABLE osrs_item_volumes ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for dashboard queries)
CREATE POLICY "Allow public read access to osrs_item_volumes"
  ON osrs_item_volumes FOR SELECT
  USING (true);

-- Allow service role to insert/update/delete (for GitHub Actions updates)
CREATE POLICY "Allow service role full access to osrs_item_volumes"
  ON osrs_item_volumes FOR ALL
  USING (auth.role() = 'service_role');

-- Allow authenticated users to insert/update (for manual updates)
CREATE POLICY "Allow authenticated write access to osrs_item_volumes"
  ON osrs_item_volumes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update access to osrs_item_volumes"
  ON osrs_item_volumes FOR UPDATE
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE osrs_item_volumes IS 'OSRS item 24-hour trading volumes from Wiki API';
COMMENT ON COLUMN osrs_item_volumes.item_id IS 'OSRS item ID (matches Wiki API)';
COMMENT ON COLUMN osrs_item_volumes.item_name IS 'Human-readable item name';
COMMENT ON COLUMN osrs_item_volumes.volume_24h IS 'Total 24h volume (high + low trades)';
COMMENT ON COLUMN osrs_item_volumes.last_updated IS 'Timestamp of last data update';
