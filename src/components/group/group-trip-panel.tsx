'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/client';
import {
  loadTripMembers, loadTripExpenses, loadSharedItems,
  addExpense, deleteExpense, settleExpenseSplit,
  addSharedItem, claimSharedItem, toggleSharedItem, deleteSharedItem,
} from '@/lib/supabase/group-data';
import { notifyExpenseAdded, notifyItemAdded, notifyItemClaimed } from '@/lib/supabase/notifications';
import type { Trip, TripMember, TripExpense, SharedItem } from '@/types';
import { trackView } from '@/lib/tracking';

const EXPENSE_CATEGORIES = [
  { key: 'food', label: '🍽️ Food', color: 'gold' },
  { key: 'transport', label: '🚌 Transport', color: 'teal' },
  { key: 'accommodation', label: '🏨 Stay', color: 'stamp-blue' },
  { key: 'activities', label: '🎯 Activities', color: 'stamp-green' },
  { key: 'shopping', label: '🛍️ Shopping', color: 'stamp-red' },
  { key: 'other', label: '📦 Other', color: 'text-muted' },
];

const ITEM_CATEGORIES = ['Essentials', 'Shared gear', 'Food & drinks', 'Activities', 'Other'];

type Tab = 'budget' | 'items' | 'members';

export function GroupTripPanel({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { user } = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('budget');
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add expense form
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expAmount, setExpAmount] = useState('');
  const [expCurrency, setExpCurrency] = useState('EUR');
  const [expCategory, setExpCategory] = useState('food');
  const [expDesc, setExpDesc] = useState('');
  const [addingExp, setAddingExp] = useState(false);

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemText, setItemText] = useState('');
  const [itemCategory, setItemCategory] = useState('Essentials');
  const [addingItem, setAddingItem] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [m, e, i] = await Promise.all([
      loadTripMembers(supabase, trip.id),
      loadTripExpenses(supabase, trip.id),
      loadSharedItems(supabase, trip.id),
    ]);
    setMembers(m);
    setExpenses(e);
    setItems(i);
    setLoading(false);
  }, [trip.id]);

  useEffect(() => { loadData(); trackView('group_trips'); }, [loadData]);

  // ─── Budget calculations ───
  const totalSpent = expenses.reduce((a, e) => a + e.amount, 0);
  const mainCurrency = expenses[0]?.currency || 'EUR';

  // Calculate balances: who owes whom
  const balances: Record<string, number> = {};
  members.filter(m => m.status === 'accepted').forEach(m => { balances[m.userId] = 0; });
  expenses.forEach(exp => {
    // Payer gets credited
    balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;
    // Each split person gets debited
    exp.splits.forEach(s => {
      balances[s.userId] = (balances[s.userId] || 0) - s.amount;
    });
  });

  const getMemberName = (uid: string) => members.find(m => m.userId === uid)?.displayName || 'Unknown';

  async function handleAddExpense() {
    if (!user || !expAmount || !expDesc) return;
    setAddingExp(true);
    try {
      const supabase = createClient();
      const memberIds = members.filter(m => m.status === 'accepted').map(m => m.userId);
      await addExpense(supabase, trip.id, user.id, parseFloat(expAmount), expCurrency, expCategory, expDesc, 'equal', memberIds);
      notifyExpenseAdded(supabase, trip.id, user.id, parseFloat(expAmount), expCurrency, expDesc).catch(() => {});
      toast('Expense added!');
      setShowAddExpense(false);
      setExpAmount('');
      setExpDesc('');
      await loadData();
    } catch {
      toast('Failed to add expense', 'error');
    }
    setAddingExp(false);
  }

  async function handleDeleteExpense(id: number) {
    const supabase = createClient();
    await deleteExpense(supabase, id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    toast('Expense removed');
  }

  async function handleSettle(expenseId: number, userId: string, settled: boolean) {
    const supabase = createClient();
    await settleExpenseSplit(supabase, expenseId, userId, settled);
    await loadData();
  }

  async function handleAddItem() {
    if (!itemText.trim()) return;
    setAddingItem(true);
    try {
      const supabase = createClient();
      await addSharedItem(supabase, trip.id, itemText.trim(), itemCategory);
      if (user) notifyItemAdded(supabase, trip.id, user.id, itemText.trim()).catch(() => {});
      toast('Item added!');
      setItemText('');
      setShowAddItem(false);
      await loadData();
    } catch {
      toast('Failed to add item', 'error');
    }
    setAddingItem(false);
  }

  async function handleClaimItem(itemId: number) {
    if (!user) return;
    const supabase = createClient();
    await claimSharedItem(supabase, itemId, user.id);
    const item = items.find(i => i.id === itemId);
    if (item) notifyItemClaimed(supabase, trip.id, user.id, item.text).catch(() => {});
    await loadData();
  }

  async function handleToggleItem(itemId: number, checked: boolean) {
    const supabase = createClient();
    await toggleSharedItem(supabase, itemId, checked);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, checked } : i));
  }

  async function handleDeleteItem(itemId: number) {
    const supabase = createClient();
    await deleteSharedItem(supabase, itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-bg2 rounded-2xl p-8 text-center">
          <div className="text-3xl animate-pulse mb-2">👥</div>
          <div className="text-text-muted">Loading group trip...</div>
        </div>
      </div>
    );
  }

  const acceptedMembers = members.filter(m => m.status === 'accepted');
  const catIcon = (key: string) => EXPENSE_CATEGORIES.find(c => c.key === key)?.label.split(' ')[0] || '📦';

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg2 border border-white/[0.08] rounded-2xl w-full max-w-[700px] max-h-[85vh] mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 pb-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{trip.emoji}</span>
              <div>
                <h2 className="font-[family-name:var(--font-playfair)] text-xl">{trip.name}</h2>
                <div className="text-[12px] text-text-muted">{acceptedMembers.length} members · Group trip</div>
              </div>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text text-xl cursor-pointer bg-transparent border-none">×</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b border-white/[0.08]">
            {([
              { key: 'budget' as Tab, label: '💰 Budget', count: expenses.length },
              { key: 'items' as Tab, label: '📦 Items', count: items.length },
              { key: 'members' as Tab, label: '👥 Members', count: acceptedMembers.length },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-[13px] cursor-pointer transition-all border-b-2 -mb-[1px] ${
                  tab === t.key ? 'border-gold text-gold font-medium' : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                {t.label} {t.count > 0 && <span className="text-[11px] opacity-60">({t.count})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ─── Budget Tab ─── */}
          {tab === 'budget' && (
            <div>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-bg3 border border-white/[0.08] rounded-xl p-3 text-center">
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Total spent</div>
                  <div className="font-[family-name:var(--font-playfair)] text-2xl text-gold mt-1">
                    {mainCurrency} {totalSpent.toFixed(2)}
                  </div>
                </div>
                <div className="bg-bg3 border border-white/[0.08] rounded-xl p-3 text-center">
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Per person</div>
                  <div className="font-[family-name:var(--font-playfair)] text-2xl text-teal mt-1">
                    {mainCurrency} {acceptedMembers.length > 0 ? (totalSpent / acceptedMembers.length).toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>

              {/* Balances */}
              {Object.keys(balances).length > 0 && expenses.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Balances</div>
                  <div className="space-y-1.5">
                    {Object.entries(balances).map(([uid, bal]) => (
                      <div key={uid} className="flex items-center justify-between bg-bg3 rounded-lg px-3 py-2">
                        <span className="text-[13px]">{getMemberName(uid)}</span>
                        <span className={`text-[13px] font-medium ${bal > 0.01 ? 'text-teal' : bal < -0.01 ? 'text-stamp-red' : 'text-text-muted'}`}>
                          {bal > 0.01 ? `+${bal.toFixed(2)}` : bal < -0.01 ? bal.toFixed(2) : 'settled'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add expense */}
              {!showAddExpense ? (
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-gold/30 text-gold text-sm cursor-pointer hover:bg-gold/5 transition-all mb-4"
                >
                  + Add expense
                </button>
              ) : (
                <div className="bg-bg3 border border-white/[0.08] rounded-xl p-4 mb-4">
                  <div className="text-[11px] text-text-muted uppercase tracking-wider mb-3">New expense</div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="number"
                      value={expAmount}
                      onChange={e => setExpAmount(e.target.value)}
                      placeholder="Amount"
                      className="bg-bg4 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text outline-none"
                    />
                    <select
                      value={expCurrency}
                      onChange={e => setExpCurrency(e.target.value)}
                      className="bg-bg4 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text outline-none"
                    >
                      {['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'THB', 'BRL', 'MXN'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={expDesc}
                    onChange={e => setExpDesc(e.target.value)}
                    placeholder="What was it for?"
                    className="w-full bg-bg4 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text outline-none mb-2"
                  />
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {EXPENSE_CATEGORIES.map(c => (
                      <button
                        key={c.key}
                        onClick={() => setExpCategory(c.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-all ${
                          expCategory === c.key ? 'bg-gold/15 border border-gold/30 text-gold' : 'bg-bg4 border border-white/[0.06] text-text-muted'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-text-muted mb-3">Split equally among {acceptedMembers.length} members</div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddExpense}
                      disabled={addingExp || !expAmount || !expDesc}
                      className="flex-1 py-2 rounded-lg bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 disabled:opacity-40"
                    >
                      {addingExp ? 'Adding...' : 'Add'}
                    </button>
                    <button
                      onClick={() => setShowAddExpense(false)}
                      className="px-4 py-2 rounded-lg bg-bg4 border border-white/[0.08] text-text-muted text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Expense list */}
              <div className="space-y-2">
                {expenses.map(exp => (
                  <div key={exp.id} className="bg-bg3 border border-white/[0.08] rounded-xl p-3 group">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{catIcon(exp.category)}</span>
                      <div className="flex-1">
                        <div className="text-[13px] font-medium">{exp.description}</div>
                        <div className="text-[11px] text-text-muted">
                          Paid by {exp.paidByName} · {new Date(exp.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[15px] font-[family-name:var(--font-playfair)] text-gold">
                          {exp.currency} {exp.amount.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {exp.currency} {(exp.amount / Math.max(exp.splits.length, 1)).toFixed(2)}/pp
                        </div>
                      </div>
                      {(exp.paidBy === user?.id) && (
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-transparent group-hover:text-text-muted hover:!text-stamp-red text-sm cursor-pointer transition-colors ml-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {/* Splits */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {exp.splits.map(s => (
                        <button
                          key={s.userId}
                          onClick={() => handleSettle(exp.id, s.userId, !s.settled)}
                          className={`text-[10px] px-2 py-0.5 rounded-md cursor-pointer transition-all ${
                            s.settled ? 'bg-teal/10 text-teal border border-teal/20' : 'bg-bg4 text-text-muted border border-white/[0.06]'
                          }`}
                        >
                          {s.displayName}: {exp.currency}{s.amount.toFixed(2)} {s.settled ? '✓' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {expenses.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  <div className="text-3xl mb-2">💰</div>
                  <div className="text-sm">No expenses yet</div>
                  <div className="text-[11px] mt-1">Add your first group expense above</div>
                </div>
              )}
            </div>
          )}

          {/* ─── Items Tab ─── */}
          {tab === 'items' && (
            <div>
              {!showAddItem ? (
                <button
                  onClick={() => setShowAddItem(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-teal/30 text-teal text-sm cursor-pointer hover:bg-teal/5 transition-all mb-4"
                >
                  + Add shared item
                </button>
              ) : (
                <div className="bg-bg3 border border-white/[0.08] rounded-xl p-4 mb-4">
                  <input
                    value={itemText}
                    onChange={e => setItemText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                    placeholder="Item name..."
                    className="w-full bg-bg4 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text outline-none mb-2"
                  />
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {ITEM_CATEGORIES.map(c => (
                      <button
                        key={c}
                        onClick={() => setItemCategory(c)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-all ${
                          itemCategory === c ? 'bg-teal/15 border border-teal/30 text-teal' : 'bg-bg4 border border-white/[0.06] text-text-muted'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddItem} disabled={addingItem || !itemText.trim()} className="flex-1 py-2 rounded-lg bg-teal text-bg text-sm font-medium cursor-pointer hover:opacity-85 disabled:opacity-40">
                      {addingItem ? 'Adding...' : 'Add'}
                    </button>
                    <button onClick={() => setShowAddItem(false)} className="px-4 py-2 rounded-lg bg-bg4 border border-white/[0.08] text-text-muted text-sm cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Group by category */}
              {ITEM_CATEGORIES.filter(cat => items.some(i => i.category === cat)).map(cat => (
                <div key={cat} className="mb-4">
                  <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">{cat}</div>
                  <div className="space-y-1.5">
                    {items.filter(i => i.category === cat).map(item => (
                      <div key={item.id} className="flex items-center gap-2.5 bg-bg3 rounded-lg px-3 py-2 group">
                        <button
                          onClick={() => handleToggleItem(item.id, !item.checked)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                            item.checked ? 'bg-teal border-teal text-bg' : 'border-white/20 bg-transparent'
                          }`}
                        >
                          {item.checked && <span className="text-[11px]">✓</span>}
                        </button>
                        <div className="flex-1">
                          <span className={`text-[13px] ${item.checked ? 'line-through text-text-muted' : ''}`}>{item.text}</span>
                        </div>
                        {item.claimedName ? (
                          <span className="text-[10px] text-teal bg-teal/10 border border-teal/20 rounded-md px-2 py-0.5">
                            {item.claimedName}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleClaimItem(item.id)}
                            className="text-[10px] text-gold bg-gold/10 border border-gold/20 rounded-md px-2 py-0.5 cursor-pointer hover:bg-gold/20 transition-all"
                          >
                            I&apos;ll bring it
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-transparent group-hover:text-text-muted hover:!text-stamp-red text-sm cursor-pointer transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  <div className="text-3xl mb-2">📦</div>
                  <div className="text-sm">No shared items yet</div>
                  <div className="text-[11px] mt-1">Add items that the group needs to bring</div>
                </div>
              )}
            </div>
          )}

          {/* ─── Members Tab ─── */}
          {tab === 'members' && (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 bg-bg3 rounded-xl px-4 py-3">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-bg4 flex items-center justify-center text-lg font-semibold">
                      {m.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-[14px] font-medium">{m.displayName}</div>
                    <div className="text-[11px] text-text-muted">@{m.username}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {m.role === 'owner' && (
                      <span className="text-[10px] text-gold bg-gold/10 border border-gold/20 rounded-md px-2 py-0.5">Owner</span>
                    )}
                    {m.status === 'pending' && (
                      <span className="text-[10px] text-text-muted bg-bg4 border border-white/[0.08] rounded-md px-2 py-0.5">Pending</span>
                    )}
                    {balances[m.userId] !== undefined && expenses.length > 0 && (
                      <span className={`text-[11px] ${balances[m.userId] > 0.01 ? 'text-teal' : balances[m.userId] < -0.01 ? 'text-stamp-red' : 'text-text-muted'}`}>
                        {balances[m.userId] > 0.01 ? `+${balances[m.userId].toFixed(2)}` : balances[m.userId] < -0.01 ? balances[m.userId].toFixed(2) : 'settled'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
