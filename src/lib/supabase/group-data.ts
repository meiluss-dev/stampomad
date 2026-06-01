import { SupabaseClient } from '@supabase/supabase-js';
import type { TripMember, TripExpense, ExpenseSplit, SharedItem, GroupInvite } from '@/types';

// ── Trip Members ──

export async function loadTripMembers(supabase: SupabaseClient, tripId: number): Promise<TripMember[]> {
  const { data, error } = await supabase
    .from('trip_members')
    .select('*, user_profiles!trip_members_user_id_profiles_fkey(username, display_name, avatar_url)')
    .eq('trip_id', tripId);
  if (error) { console.error('[Group] loadMembers error:', error); return []; }
  return (data || []).map((m: any) => ({
    id: m.id,
    tripId: m.trip_id,
    userId: m.user_id,
    role: m.role,
    status: m.status,
    joinedAt: m.joined_at,
    displayName: m.user_profiles?.display_name || m.user_profiles?.username || 'Unknown',
    avatarUrl: m.user_profiles?.avatar_url || null,
    username: m.user_profiles?.username || '',
  }));
}

export async function inviteMember(supabase: SupabaseClient, tripId: number, inviteeUserId: string, invitedBy: string) {
  const { error } = await supabase.from('trip_members').insert({
    trip_id: tripId,
    user_id: inviteeUserId,
    role: 'member',
    status: 'pending',
    invited_by: invitedBy,
  });
  if (error) throw error;
}

export async function respondToInvite(supabase: SupabaseClient, membershipId: number, accept: boolean) {
  const { error } = await supabase.from('trip_members').update({
    status: accept ? 'accepted' : 'declined',
  }).eq('id', membershipId);
  if (error) throw error;
}

export async function removeMember(supabase: SupabaseClient, membershipId: number) {
  const { error } = await supabase.from('trip_members').delete().eq('id', membershipId);
  if (error) throw error;
}

export async function lookupUserByUsername(supabase: SupabaseClient, search: string) {
  // Try exact username match first
  const { data: exact } = await supabase
    .from('user_profiles')
    .select('user_id, username, display_name, avatar_url')
    .eq('username', search)
    .single();
  if (exact) return [exact];

  // Fuzzy search on username, display_name, and email
  const { data: fuzzy } = await supabase
    .from('user_profiles')
    .select('user_id, username, display_name, avatar_url, email')
    .or(`username.ilike.%${search}%,display_name.ilike.%${search}%,email.ilike.%${search}%`)
    .limit(5);
  // Strip email from results (search only, not exposed to UI)
  return (fuzzy || []).map(({ email: _email, ...rest }) => rest);
}

export async function makeGroupTrip(supabase: SupabaseClient, tripId: number, userId: string) {
  // Mark trip as group + add owner as first member
  const { error: tripErr } = await supabase.from('trips').update({ is_group: true }).eq('id', tripId);
  if (tripErr) {
    console.error('[Group] makeGroupTrip update error:', tripErr);
    throw new Error(`Failed to mark trip as group: ${tripErr.message}`);
  }
  // Try to add owner as member — ignore if already exists (409 conflict)
  const { error: memberErr } = await supabase.from('trip_members').insert({
    trip_id: tripId,
    user_id: userId,
    role: 'owner',
    status: 'accepted',
  });
  if (memberErr && memberErr.code !== '23505') {
    // 23505 = unique_violation (already a member) — that's fine
    console.error('[Group] makeGroupTrip insert error:', memberErr);
    throw new Error(`Failed to add owner as member: ${memberErr.message}`);
  }
}

export async function disbandGroup(supabase: SupabaseClient, tripId: number) {
  // Remove all members
  const { error: delErr } = await supabase.from('trip_members').delete().eq('trip_id', tripId);
  if (delErr) throw delErr;
  // Mark trip as non-group
  const { error: updErr } = await supabase.from('trips').update({ is_group: false }).eq('id', tripId);
  if (updErr) throw updErr;
}

// ── Pending Invites for current user ──

export async function loadPendingInvites(supabase: SupabaseClient, userId: string): Promise<GroupInvite[]> {
  const { data, error } = await supabase
    .from('trip_members')
    .select('*, trips!trip_members_trip_id_fkey(name, emoji, code), inviter:user_profiles!trip_members_invited_by_profiles_fkey(display_name, avatar_url)')
    .eq('user_id', userId)
    .eq('status', 'pending');
  if (error) { console.error('[Group] loadInvites error:', error); return []; }
  return (data || []).map((m: any) => ({
    id: m.id,
    tripId: m.trip_id,
    tripName: m.trips?.name || 'Trip',
    tripEmoji: m.trips?.emoji || '✈️',
    tripCode: m.trips?.code || '',
    inviterName: m.inviter?.display_name || 'Someone',
    inviterAvatar: m.inviter?.avatar_url || null,
    status: m.status,
    createdAt: m.joined_at,
  }));
}

// ── Expenses ──

export async function loadTripExpenses(supabase: SupabaseClient, tripId: number): Promise<TripExpense[]> {
  const { data: expenses, error } = await supabase
    .from('trip_expenses')
    .select('*, user_profiles!trip_expenses_paid_by_profiles_fkey(display_name)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) { console.error('[Group] loadExpenses error:', error); return []; }

  const expenseIds = (expenses || []).map(e => e.id);
  let splits: any[] = [];
  if (expenseIds.length > 0) {
    const { data: splitsData } = await supabase
      .from('expense_splits')
      .select('*, user_profiles!expense_splits_user_id_profiles_fkey(display_name)')
      .in('expense_id', expenseIds);
    splits = splitsData || [];
  }

  return (expenses || []).map((e: any) => ({
    id: e.id,
    tripId: e.trip_id,
    paidBy: e.paid_by,
    paidByName: e.user_profiles?.display_name || 'Unknown',
    amount: Number(e.amount),
    currency: e.currency,
    category: e.category,
    description: e.description,
    splitType: e.split_type,
    splits: splits
      .filter(s => s.expense_id === e.id)
      .map(s => ({
        userId: s.user_id,
        displayName: s.user_profiles?.display_name || 'Unknown',
        amount: Number(s.amount),
        settled: s.settled,
      })),
    createdAt: e.created_at,
  }));
}

export async function addExpense(
  supabase: SupabaseClient,
  tripId: number,
  paidBy: string,
  amount: number,
  currency: string,
  category: string,
  description: string,
  splitType: 'equal' | 'custom',
  memberUserIds: string[],
  customAmounts?: Record<string, number>,
) {
  const { data: expense, error } = await supabase.from('trip_expenses').insert({
    trip_id: tripId,
    paid_by: paidBy,
    amount,
    currency,
    category,
    description,
    split_type: splitType,
  }).select().single();
  if (error) throw error;

  // Create splits
  const splitAmount = splitType === 'equal' ? amount / memberUserIds.length : 0;
  const splitsToInsert = memberUserIds.map(uid => ({
    expense_id: expense.id,
    user_id: uid,
    amount: splitType === 'custom' ? (customAmounts?.[uid] || 0) : splitAmount,
    settled: uid === paidBy, // payer's share is auto-settled
  }));

  const { error: splitErr } = await supabase.from('expense_splits').insert(splitsToInsert);
  if (splitErr) throw splitErr;

  return expense;
}

export async function deleteExpense(supabase: SupabaseClient, expenseId: number) {
  await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
  await supabase.from('trip_expenses').delete().eq('id', expenseId);
}

export async function settleExpenseSplit(supabase: SupabaseClient, expenseId: number, userId: string, settled: boolean) {
  await supabase.from('expense_splits').update({ settled }).eq('expense_id', expenseId).eq('user_id', userId);
}

// ── Shared Items ──

export async function loadSharedItems(supabase: SupabaseClient, tripId: number): Promise<SharedItem[]> {
  const { data, error } = await supabase
    .from('shared_items')
    .select('*, assigned:user_profiles!shared_items_assigned_to_profiles_fkey(display_name), claimer:user_profiles!shared_items_claimed_by_profiles_fkey(display_name)')
    .eq('trip_id', tripId)
    .order('created_at');
  if (error) { console.error('[Group] loadItems error:', error); return []; }
  return (data || []).map((i: any) => ({
    id: i.id,
    tripId: i.trip_id,
    text: i.text,
    category: i.category,
    assignedTo: i.assigned_to,
    assignedName: i.assigned?.display_name || null,
    claimedBy: i.claimed_by,
    claimedName: i.claimer?.display_name || null,
    checked: i.checked,
  }));
}

export async function addSharedItem(supabase: SupabaseClient, tripId: number, text: string, category: string, assignedTo?: string) {
  const { error } = await supabase.from('shared_items').insert({
    trip_id: tripId,
    text,
    category,
    assigned_to: assignedTo || null,
  });
  if (error) throw error;
}

export async function claimSharedItem(supabase: SupabaseClient, itemId: number, userId: string) {
  await supabase.from('shared_items').update({ claimed_by: userId }).eq('id', itemId);
}

export async function toggleSharedItem(supabase: SupabaseClient, itemId: number, checked: boolean) {
  await supabase.from('shared_items').update({ checked }).eq('id', itemId);
}

export async function deleteSharedItem(supabase: SupabaseClient, itemId: number) {
  await supabase.from('shared_items').delete().eq('id', itemId);
}

// ── Chat Messages ──

export interface TripMessage {
  id: number;
  tripId: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  message: string;
  createdAt: string;
}

export async function loadTripMessages(supabase: SupabaseClient, tripId: number, limit = 50): Promise<TripMessage[]> {
  const { data, error } = await supabase
    .from('trip_messages')
    .select('*, user_profiles!trip_messages_user_id_profiles_fkey(display_name, avatar_url)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) { console.error('[Group] loadMessages error:', error); return []; }
  return (data || []).map((m: any) => ({
    id: m.id,
    tripId: m.trip_id,
    userId: m.user_id,
    displayName: m.user_profiles?.display_name || 'Unknown',
    avatarUrl: m.user_profiles?.avatar_url || null,
    message: m.message,
    createdAt: m.created_at,
  }));
}

export async function sendTripMessage(supabase: SupabaseClient, tripId: number, userId: string, message: string) {
  const { error } = await supabase.from('trip_messages').insert({
    trip_id: tripId,
    user_id: userId,
    message: message.trim().slice(0, 2000),
  });
  if (error) throw error;
}

export async function deleteTripMessage(supabase: SupabaseClient, messageId: number) {
  const { error } = await supabase.from('trip_messages').delete().eq('id', messageId);
  if (error) throw error;
}

// ── Load group trips the user is a member of (not owner) ──

export async function loadGroupMemberships(supabase: SupabaseClient, userId: string) {
  // Step 1: Get trip IDs where user is an accepted member
  const { data: memberships, error } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .eq('role', 'member');
  if (error) { console.error('[Group] loadMemberships error:', error); return []; }
  if (!memberships || memberships.length === 0) return [];

  // Step 2: Load the actual trip data
  const tripIds = memberships.map(m => m.trip_id);
  const { data: trips, error: tripErr } = await supabase
    .from('trips')
    .select('id, name, code, emoji, start_date, end_date, days, cities, continent, user_id')
    .in('id', tripIds);
  if (tripErr) { console.error('[Group] loadMembership trips error:', tripErr); return []; }

  return (trips || []).map(t => ({
    tripId: t.id,
    trip: {
      id: t.id,
      name: t.name,
      code: t.code,
      emoji: t.emoji || '✈️',
      start: t.start_date,
      end: t.end_date,
      days: t.days || 1,
      cities: t.cities || '',
      continent: t.continent || '',
    },
  }));
}
