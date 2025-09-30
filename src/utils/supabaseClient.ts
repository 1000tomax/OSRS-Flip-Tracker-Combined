import { createClient } from '@supabase/supabase-js';

// Hardcode credentials temporarily to bypass Cloudflare Pages Secret env var limitation
// The anon key is safe to expose - it's designed for client-side use
// Security is enforced by Supabase Row Level Security (RLS) policies
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fmmdulnvciiafuuogwfu.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbWR1bG52Y2lpYWZ1dW9nd2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjQ2MDcsImV4cCI6MjA3NDgwMDYwN30.qwInC3vYLz7Ybx8oJUI3Dp-Sc2vbyuvMNtEsg8Z4xnw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Flip {
  id: string;
  account_id: string;
  item_name: string;
  status: 'FINISHED' | 'ACTIVE' | 'CANCELLED';
  opened_quantity: number;
  spent: number;
  closed_quantity: number | null;
  received_post_tax: number | null;
  tax_paid: number | null;
  profit: number | null;
  opened_time: string;
  closed_time: string | null;
  updated_time: string;
  flip_hash: string;
  created_at: string;
}

export interface ItemStat {
  item_name: string;
  total_flips: number;
  total_profit: number;
  avg_profit: number;
  total_spent: number;
  total_received: number;
  roi_percent: number;
  last_flipped: string;
  first_flipped: string;
}

export interface DailySummary {
  date: string;
  total_flips: number;
  total_profit: number;
  total_spent: number;
  avg_profit: number;
  avg_roi: number;
}

// API Functions
export async function getFlips({
  limit = 100,
  offset = 0,
  itemName,
  accountId,
  startDate,
  endDate,
}: {
  limit?: number;
  offset?: number;
  itemName?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  let query = supabase
    .from('flips')
    .select('*')
    .eq('status', 'FINISHED')
    .order('opened_time', { ascending: false })
    .range(offset, offset + limit - 1);

  if (itemName) {
    query = query.eq('item_name', itemName);
  }

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  if (startDate) {
    query = query.gte('opened_time', startDate);
  }

  if (endDate) {
    query = query.lte('opened_time', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Flip[];
}

export async function getItemStats() {
  const { data, error } = await supabase
    .from('item_stats')
    .select('*')
    .order('total_profit', { ascending: false });

  if (error) throw error;
  return data as ItemStat[];
}

export async function getDailySummaries(startDate?: string, endDate?: string) {
  const { data, error } = await supabase.rpc('get_daily_summaries', {
    start_date: startDate || null,
    end_date: endDate || null,
  });

  if (error) throw error;
  return data as DailySummary[];
}

export async function getFlipsByDate(date: string) {
  const startOfDay = `${date}T00:00:00Z`;
  const endOfDay = `${date}T23:59:59Z`;

  return getFlips({
    startDate: startOfDay,
    endDate: endOfDay,
    limit: 10000,
  });
}

export async function searchItems(searchTerm: string, limit = 20) {
  const { data, error } = await supabase
    .from('item_stats')
    .select('item_name, total_flips, total_profit, roi_percent')
    .ilike('item_name', `%${searchTerm}%`)
    .order('total_profit', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Get total count for pagination
export async function getFlipsCount(filters?: {
  itemName?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
}) {
  let query = supabase
    .from('flips')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'FINISHED');

  if (filters?.itemName) {
    query = query.eq('item_name', filters.itemName);
  }

  if (filters?.accountId) {
    query = query.eq('account_id', filters.accountId);
  }

  if (filters?.startDate) {
    query = query.gte('opened_time', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('opened_time', filters.endDate);
  }

  const { count, error } = await query;

  if (error) throw error;
  return count || 0;
}
