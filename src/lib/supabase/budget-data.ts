import { SupabaseClient } from '@supabase/supabase-js';

export interface TripBudget {
  id: number;
  tripId: number;
  totalBudget: number;
  currency: string;
}

export interface BudgetExpense {
  id: number;
  tripId: number;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string | null;
  createdAt: string;
}

export async function loadTripBudget(supabase: SupabaseClient, tripId: number, userId: string): Promise<TripBudget | null> {
  const { data } = await supabase
    .from('trip_budgets')
    .select('*')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single();
  if (!data) return null;
  return { id: data.id, tripId: data.trip_id, totalBudget: Number(data.total_budget), currency: data.currency };
}

export async function saveTripBudget(supabase: SupabaseClient, tripId: number, userId: string, totalBudget: number, currency: string) {
  await supabase.from('trip_budgets').upsert({
    trip_id: tripId,
    user_id: userId,
    total_budget: totalBudget,
    currency,
  });
}

export async function loadBudgetExpenses(supabase: SupabaseClient, tripId: number, userId: string): Promise<BudgetExpense[]> {
  const { data, error } = await supabase
    .from('budget_expenses')
    .select('*')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .order('date', { ascending: false, nullsFirst: false });
  if (error) { console.error('[Budget] loadExpenses error:', error); return []; }
  return (data || []).map(e => ({
    id: e.id,
    tripId: e.trip_id,
    amount: Number(e.amount),
    currency: e.currency,
    category: e.category,
    description: e.description,
    date: e.date,
    createdAt: e.created_at,
  }));
}

export async function addBudgetExpense(
  supabase: SupabaseClient,
  tripId: number,
  userId: string,
  amount: number,
  currency: string,
  category: string,
  description: string,
  date?: string,
) {
  const { error } = await supabase.from('budget_expenses').insert({
    trip_id: tripId,
    user_id: userId,
    amount,
    currency,
    category,
    description,
    date: date || new Date().toISOString().split('T')[0],
  });
  if (error) throw error;
}

export async function deleteBudgetExpense(supabase: SupabaseClient, expenseId: number) {
  await supabase.from('budget_expenses').delete().eq('id', expenseId);
}
