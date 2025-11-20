-- OSRS Flip Tracker Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create flips table
CREATE TABLE IF NOT EXISTS flips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Account & Item Info
    account_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('FINISHED', 'ACTIVE', 'CANCELLED')),

    -- Transaction Details
    opened_quantity INTEGER NOT NULL,
    spent BIGINT NOT NULL,
    closed_quantity INTEGER,
    received_post_tax BIGINT,
    tax_paid BIGINT,
    profit BIGINT,

    -- Timestamps
    opened_time TIMESTAMPTZ NOT NULL,
    closed_time TIMESTAMPTZ,
    updated_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique identifier for deduplication
    flip_hash TEXT UNIQUE NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_flips_account ON flips(account_id);
CREATE INDEX IF NOT EXISTS idx_flips_item ON flips(item_name);
CREATE INDEX IF NOT EXISTS idx_flips_opened_time ON flips(opened_time DESC);
CREATE INDEX IF NOT EXISTS idx_flips_closed_time ON flips(closed_time DESC);
CREATE INDEX IF NOT EXISTS idx_flips_profit ON flips(profit DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_flips_status ON flips(status);
CREATE INDEX IF NOT EXISTS idx_flips_hash ON flips(flip_hash);

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_flips_account_time ON flips(account_id, opened_time DESC);
CREATE INDEX IF NOT EXISTS idx_flips_item_time ON flips(item_name, opened_time DESC);

-- Create materialized view for item statistics (fast aggregation)
CREATE MATERIALIZED VIEW IF NOT EXISTS item_stats AS
SELECT
    item_name,
    COUNT(*) as total_flips,
    SUM(profit) as total_profit,
    AVG(profit) as avg_profit,
    SUM(spent) as total_spent,
    SUM(received_post_tax) as total_received,
    CASE
        WHEN SUM(spent) > 0 THEN (SUM(received_post_tax)::FLOAT / SUM(spent)::FLOAT - 1) * 100
        ELSE 0
    END as roi_percent,
    MAX(closed_time) as last_flipped,
    MIN(opened_time) as first_flipped
FROM flips
WHERE status = 'FINISHED' AND profit IS NOT NULL
GROUP BY item_name;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_stats_item ON item_stats(item_name);
CREATE INDEX IF NOT EXISTS idx_item_stats_profit ON item_stats(total_profit DESC);
CREATE INDEX IF NOT EXISTS idx_item_stats_flips ON item_stats(total_flips DESC);

-- Create function to refresh item stats
CREATE OR REPLACE FUNCTION refresh_item_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY item_stats;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) for public access
ALTER TABLE flips ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON flips
    FOR SELECT TO anon
    USING (true);

-- Create policy to allow authenticated insert
CREATE POLICY "Allow authenticated insert" ON flips
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Function to get daily summaries
CREATE OR REPLACE FUNCTION get_daily_summaries(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    date DATE,
    day BIGINT,
    flips BIGINT,
    items_flipped BIGINT,
    profit BIGINT,
    net_worth BIGINT,
    percent_change NUMERIC,
    percent_to_goal NUMERIC,
    total_spent BIGINT,
    avg_profit NUMERIC,
    avg_roi NUMERIC
) AS $$
DECLARE
    starting_balance BIGINT := 1000; -- Initial starting balance
BEGIN
    RETURN QUERY
    WITH daily_data AS (
        SELECT
            DATE(opened_time) as date,
            COUNT(*) as flips,
            COUNT(DISTINCT item_name) as items_flipped,
            SUM(f.profit) as profit,
            SUM(f.spent) as total_spent,
            AVG(f.profit)::NUMERIC as avg_profit,
            CASE
                WHEN SUM(f.spent) > 0 THEN ((SUM(received_post_tax)::FLOAT / SUM(f.spent)::FLOAT - 1) * 100)::NUMERIC
                ELSE 0
            END as avg_roi
        FROM flips f
        WHERE status = 'FINISHED'
            AND f.profit IS NOT NULL
            AND (start_date IS NULL OR DATE(opened_time) >= start_date)
            AND (end_date IS NULL OR DATE(opened_time) <= end_date)
        GROUP BY DATE(opened_time)
    ),
    date_range AS (
        SELECT
            COALESCE(
                (SELECT MIN(date) FROM daily_data),
                CURRENT_DATE
            ) as min_date,
            COALESCE(
                (SELECT MAX(date) FROM daily_data),
                CURRENT_DATE
            ) as max_date
    ),
    all_dates AS (
        SELECT generate_series(
            (SELECT min_date FROM date_range),
            (SELECT max_date FROM date_range),
            '1 day'::INTERVAL
        )::DATE as date
    ),
    filled_data AS (
        SELECT
            ad.date,
            COALESCE(dd.flips, 0) as flips,
            COALESCE(dd.items_flipped, 0) as items_flipped,
            COALESCE(dd.profit, 0) as profit,
            COALESCE(dd.total_spent, 0) as total_spent,
            COALESCE(dd.avg_profit, 0) as avg_profit,
            COALESCE(dd.avg_roi, 0) as avg_roi
        FROM all_dates ad
        LEFT JOIN daily_data dd ON ad.date = dd.date
        ORDER BY ad.date ASC
    ),
    cumulative_data AS (
        SELECT
            d.date,
            ROW_NUMBER() OVER (ORDER BY d.date) as day,
            d.flips,
            d.items_flipped,
            d.profit,
            d.total_spent,
            d.avg_profit,
            d.avg_roi,
            starting_balance + SUM(d.profit) OVER (ORDER BY d.date) as net_worth
        FROM filled_data d
    )
    SELECT
        cd.date,
        cd.day,
        cd.flips,
        cd.items_flipped,
        cd.profit,
        cd.net_worth,
        CASE
            WHEN cd.day = 1 THEN ((cd.net_worth::FLOAT - starting_balance::FLOAT) / starting_balance::FLOAT * 100)::NUMERIC
            ELSE ((cd.net_worth::FLOAT - LAG(cd.net_worth) OVER (ORDER BY cd.date)::FLOAT) / LAG(cd.net_worth) OVER (ORDER BY cd.date)::FLOAT * 100)::NUMERIC
        END as percent_change,
        (cd.net_worth::FLOAT / 2147000000::FLOAT * 100)::NUMERIC as percent_to_goal,
        cd.total_spent,
        cd.avg_profit,
        cd.avg_roi
    FROM cumulative_data cd
    ORDER BY cd.date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_daily_summaries TO anon;
GRANT EXECUTE ON FUNCTION refresh_item_stats TO authenticated;

COMMENT ON TABLE flips IS 'OSRS Grand Exchange flip transactions';
COMMENT ON MATERIALIZED VIEW item_stats IS 'Aggregated statistics per item (refresh periodically)';
COMMENT ON FUNCTION get_daily_summaries IS 'Returns daily flip summaries for dashboard';

-- Additional tables for OSRS data
-- Run create-volume-table.sql to set up volume data storage
-- Run create-computed-data-tables.sql to set up computed data storage