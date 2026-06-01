'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/client';
import {
  loadTripExpenses, loadSharedItems,
  addExpense, deleteExpense, settleExpenseSplit,
  addSharedItem, claimSharedItem, toggleSharedItem, deleteSharedItem,
  removeMember, disbandGroup, makeGroupTrip,
  loadTripMessages, deleteTripMessage,
  type TripMessage,
} from '@/lib/supabase/group-data';
import { notifyExpenseAdded, notifyItemAdded, notifyItemClaimed } from '@/lib/supabase/notifications';
import type { Trip, TripMember, TripExpense, SharedItem } from '@/types';
import { trackView } from '@/lib/tracking';
import { InviteModal } from '@/components/group/invite-modal';

const EXPENSE_CATEGORIES = [
  { key: 'food', label: '🍽️ Food', color: 'gold' },
  { key: 'transport', label: '🚌 Transport', color: 'teal' },
  { key: 'accommodation', label: '🏨 Stay', color: 'stamp-blue' },
  { key: 'activities', label: '🎯 Activities', color: 'stamp-green' },
  { key: 'shopping', label: '🛍️ Shopping', color: 'stamp-red' },
  { key: 'other', label: '📦 Other', color: 'text-muted' },
];

const ITEM_CATEGORIES = ['Essentials', 'Shared gear', 'Food & drinks', 'Activities', 'Other'];

type Tab = 'budget' | 'items' | 'chat' | 'members';

export function GroupTripPanel({ trip, onClose, initialTab }: { trip: Trip; onClose: () => void; initialTab?: 'budget' | 'items' | 'chat' | 'members' }) {
  const { user, updateTrip } = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>(initialTab || 'budget');
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Add expense form
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expAmount, setExpAmount] = useState('');
  const [expCurrency, setExpCurrency] = useState('EUR');
  const [expCategory, setExpCategory] = useState('food');
  const [expDesc, setExpDesc] = useState('');
  const [expPaidBy, setExpPaidBy] = useState('');
  const [expSplitType, setExpSplitType] = useState<'equal' | 'custom'>('equal');
  const [expExcluded, setExpExcluded] = useState<Set<string>>(new Set());
  const [expCustomAmounts, setExpCustomAmounts] = useState<Record<string, string>>({});
  const [addingExp, setAddingExp] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemText, setItemText] = useState('');
  const [itemCategory, setItemCategory] = useState('Essentials');
  const [addingItem, setAddingItem] = useState(false);

  // Chat
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();

    // Ensure owner is always a member
    if (user) {
      await makeGroupTrip(supabase, trip.id, user.id);
    }

    // Load members via API (bypasses RLS so all members are visible)
    const membersPromise = fetch(`/api/group-members?tripId=${trip.id}`)
      .then(r => r.ok ? r.json() : [])
      .catch(() => []);

    const [m, e, i, msgs] = await Promise.all([
      membersPromise,
      loadTripExpenses(supabase, trip.id),
      loadSharedItems(supabase, trip.id),
      loadTripMessages(supabase, trip.id),
    ]);
    setMembers(m);
    setExpenses(e);
    setItems(i);
    setMessages(msgs);
    setLoading(false);
  }, [trip.id, user]);

  // Load messages separately for polling
  const loadMessages = useCallback(async () => {
    const supabase = createClient();
    const msgs = await loadTripMessages(supabase, trip.id);
    setMessages(msgs);
  }, [trip.id]);

  useEffect(() => { loadData(); trackView('group_trips'); }, [loadData]);

  // Auto-refresh chat every 5s when on chat tab
  useEffect(() => {
    if (tab === 'chat') {
      chatIntervalRef.current = setInterval(loadMessages, 5000);
      return () => { if (chatIntervalRef.current) clearInterval(chatIntervalRef.current); };
    } else {
      if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
    }
  }, [tab, loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (tab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tab]);

  // ─── Budget calculations ───
  const totalSpent = expenses.reduce((a, e) => a + e.amount, 0);
  const mainCurrency = expenses[0]?.currency || 'EUR';

  // Calculate net balances: positive = owed money, negative = owes money
  const balances: Record<string, number> = {};
  members.filter(m => m.status === 'accepted').forEach(m => { balances[m.userId] = 0; });
  expenses.forEach(exp => {
    balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;
    exp.splits.forEach(s => {
      balances[s.userId] = (balances[s.userId] || 0) - s.amount;
    });
  });

  const getMemberName = (uid: string) => members.find(m => m.userId === uid)?.displayName || 'Unknown';

  // Simplify debts: minimum transactions to settle up (greedy algorithm)
  const debts: { from: string; to: string; amount: number }[] = [];
  if (expenses.length > 0) {
    const debtors = Object.entries(balances).filter(([, v]) => v < -0.01).map(([k, v]) => ({ id: k, amount: -v })).sort((a, b) => b.amount - a.amount);
    const creditors = Object.entries(balances).filter(([, v]) => v > 0.01).map(([k, v]) => ({ id: k, amount: v })).sort((a, b) => b.amount - a.amount);
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const payment = Math.min(debtors[di].amount, creditors[ci].amount);
      if (payment > 0.01) {
        debts.push({ from: debtors[di].id, to: creditors[ci].id, amount: Math.round(payment * 100) / 100 });
      }
      debtors[di].amount -= payment;
      creditors[ci].amount -= payment;
      if (debtors[di].amount < 0.01) di++;
      if (creditors[ci].amount < 0.01) ci++;
    }
  }

  async function handleAddExpense() {
    if (!user || !expAmount || !expDesc) return;
    const paidBy = expPaidBy || user.id;
    const amount = parseFloat(expAmount);
    setAddingExp(true);
    try {
      const supabase = createClient();
      const allAccepted = members.filter(m => m.status === 'accepted').map(m => m.userId);
      const splitMembers = expSplitType === 'equal'
        ? allAccepted.filter(id => !expExcluded.has(id))
        : allAccepted;
      const customAmounts = expSplitType === 'custom'
        ? Object.fromEntries(Object.entries(expCustomAmounts).map(([k, v]) => [k, parseFloat(v) || 0]))
        : undefined;
      await addExpense(supabase, trip.id, paidBy, amount, expCurrency, expCategory, expDesc, expSplitType, splitMembers, customAmounts);
      notifyExpenseAdded(supabase, trip.id, user.id, amount, expCurrency, expDesc).catch(() => {});
      toast('Expense added!');
      setShowAddExpense(false);
      setExpAmount(''); setExpDesc(''); setExpPaidBy('');
      setExpSplitType('equal'); setExpExcluded(new Set()); setExpCustomAmounts({});
      await loadData();
    } catch {
      toast('Failed to add expense', 'error');
    }
    setAddingExp(false);
  }

  async function handleSettleUp(fromId: string, toId: string, amount: number) {
    if (!user) return;
    try {
      const supabase = createClient();
      await addExpense(supabase, trip.id, fromId, amount, mainCurrency, 'other', `Settlement: ${getMemberName(fromId)} → ${getMemberName(toId)}`, 'custom', [toId], { [toId]: amount });
      toast('Settlement recorded!');
      setShowSettleUp(false);
      await loadData();
    } catch {
      toast('Failed to record settlement', 'error');
    }
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

  async function handleSendMessage() {
    if (!user || !chatInput.trim()) return;
    const msg = chatInput.trim();
    setSendingMsg(true);
    try {
      // Send message + notifications via API (bypasses RLS for notifications)
      const res = await fetch('/api/chat-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: trip.id, message: msg }),
      });
      if (!res.ok) throw new Error('Failed to send');
      setChatInput('');
      await loadMessages();
    } catch {
      toast('Failed to send message', 'error');
    }
    setSendingMsg(false);
  }

  async function handleDeleteMessage(msgId: number) {
    try {
      const supabase = createClient();
      await deleteTripMessage(supabase, msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch {
      toast('Failed to delete message', 'error');
    }
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
              { key: 'chat' as Tab, label: '💬 Chat', count: messages.length },
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
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-bg3 border border-white/[0.08] rounded-xl p-3 text-center">
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Total</div>
                  <div className="font-[family-name:var(--font-playfair)] text-xl text-gold mt-1">
                    {mainCurrency} {totalSpent.toFixed(2)}
                  </div>
                </div>
                <div className="bg-bg3 border border-white/[0.08] rounded-xl p-3 text-center">
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Per person</div>
                  <div className="font-[family-name:var(--font-playfair)] text-xl text-teal mt-1">
                    {mainCurrency} {acceptedMembers.length > 0 ? (totalSpent / acceptedMembers.length).toFixed(2) : '0.00'}
                  </div>
                </div>
                <div className="bg-bg3 border border-white/[0.08] rounded-xl p-3 text-center">
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Expenses</div>
                  <div className="font-[family-name:var(--font-playfair)] text-xl text-text mt-1">{expenses.length}</div>
                </div>
              </div>

              {/* Who owes whom — simplified debts */}
              {debts.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Settle up</div>
                  <div className="space-y-2">
                    {debts.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 bg-bg3 border border-white/[0.08] rounded-xl px-3 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-stamp-red/15 text-stamp-red flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {getMemberName(d.from).charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px]">
                            <span className="font-medium">{getMemberName(d.from)}</span>
                            <span className="text-text-muted"> owes </span>
                            <span className="font-medium">{getMemberName(d.to)}</span>
                          </div>
                          <div className="text-[14px] font-[family-name:var(--font-playfair)] text-gold">{mainCurrency} {d.amount.toFixed(2)}</div>
                        </div>
                        <button
                          onClick={() => handleSettleUp(d.from, d.to, d.amount)}
                          className="px-3 py-1.5 rounded-lg bg-teal/15 text-teal text-[11px] font-medium cursor-pointer hover:bg-teal/25 transition-all border border-teal/20"
                        >
                          Settle
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Balances per person */}
              {expenses.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Balances</div>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {Object.entries(balances).map(([uid, bal]) => (
                      <div key={uid} className="bg-bg3 border border-white/[0.08] rounded-xl px-3 py-2 text-center min-w-[90px] shrink-0">
                        <div className="text-[11px] text-text-muted truncate">{getMemberName(uid).split(' ')[0]}</div>
                        <div className={`text-[13px] font-medium mt-0.5 ${bal > 0.01 ? 'text-teal' : bal < -0.01 ? 'text-stamp-red' : 'text-text-muted'}`}>
                          {bal > 0.01 ? `+${bal.toFixed(2)}` : bal < -0.01 ? bal.toFixed(2) : '✓'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {debts.length === 0 && expenses.length > 0 && (
                <div className="bg-teal/8 border border-teal/20 rounded-xl px-4 py-3 mb-4 text-center">
                  <span className="text-teal text-sm">✓ All settled up!</span>
                </div>
              )}

              {/* Add expense */}
              {!showAddExpense ? (
                <button
                  onClick={() => { setShowAddExpense(true); setExpPaidBy(user?.id || ''); }}
                  className="w-full py-2.5 rounded-xl border border-dashed border-gold/30 text-gold text-sm cursor-pointer hover:bg-gold/5 transition-all mb-4"
                >
                  + Add expense
                </button>
              ) : (
                <div className="bg-bg3 border border-white/[0.08] rounded-xl p-4 mb-4">
                  <div className="text-[11px] text-text-muted uppercase tracking-wider mb-3">New expense</div>

                  {/* Amount + Currency */}
                  <div className="grid grid-cols-[1fr_80px] gap-2 mb-2">
                    <input
                      type="number"
                      value={expAmount}
                      onChange={e => setExpAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-bg4 border border-white/[0.08] rounded-lg px-3 py-2.5 text-lg text-text outline-none font-[family-name:var(--font-playfair)]"
                    />
                    <select
                      value={expCurrency}
                      onChange={e => setExpCurrency(e.target.value)}
                      className="bg-bg4 border border-white/[0.08] rounded-lg px-2 py-2.5 text-sm text-text outline-none"
                    >
                      {['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'THB', 'BRL', 'MXN', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'INR', 'KRW', 'NZD'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <input
                    value={expDesc}
                    onChange={e => setExpDesc(e.target.value)}
                    placeholder="What was it for?"
                    className="w-full bg-bg4 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text outline-none mb-2"
                  />

                  {/* Category */}
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

                  {/* Paid by */}
                  <div className="mb-3">
                    <div className="text-[11px] text-text-muted mb-1.5">Paid by</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {acceptedMembers.map(m => (
                        <button
                          key={m.userId}
                          onClick={() => setExpPaidBy(m.userId)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer transition-all ${
                            expPaidBy === m.userId ? 'bg-gold/15 border border-gold/30 text-gold' : 'bg-bg4 border border-white/[0.06] text-text-muted'
                          }`}
                        >
                          {m.displayName.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Split type */}
                  <div className="mb-3">
                    <div className="text-[11px] text-text-muted mb-1.5">Split</div>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => setExpSplitType('equal')}
                        className={`flex-1 py-1.5 rounded-lg text-[12px] cursor-pointer transition-all ${
                          expSplitType === 'equal' ? 'bg-teal/15 border border-teal/30 text-teal' : 'bg-bg4 border border-white/[0.06] text-text-muted'
                        }`}
                      >
                        Equal
                      </button>
                      <button
                        onClick={() => setExpSplitType('custom')}
                        className={`flex-1 py-1.5 rounded-lg text-[12px] cursor-pointer transition-all ${
                          expSplitType === 'custom' ? 'bg-teal/15 border border-teal/30 text-teal' : 'bg-bg4 border border-white/[0.06] text-text-muted'
                        }`}
                      >
                        Custom amounts
                      </button>
                    </div>

                    {expSplitType === 'equal' && (
                      <div className="flex gap-1.5 flex-wrap">
                        {acceptedMembers.map(m => {
                          const excluded = expExcluded.has(m.userId);
                          return (
                            <button
                              key={m.userId}
                              onClick={() => {
                                const next = new Set(expExcluded);
                                excluded ? next.delete(m.userId) : next.add(m.userId);
                                setExpExcluded(next);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-all ${
                                excluded ? 'bg-bg4 border border-white/[0.06] text-text-muted line-through opacity-50' : 'bg-teal/10 border border-teal/20 text-teal'
                              }`}
                            >
                              {m.displayName.split(' ')[0]}
                            </button>
                          );
                        })}
                        <span className="text-[10px] text-text-muted self-center ml-1">
                          {expAmount ? `${mainCurrency} ${(parseFloat(expAmount) / Math.max(acceptedMembers.length - expExcluded.size, 1)).toFixed(2)}/pp` : ''}
                        </span>
                      </div>
                    )}

                    {expSplitType === 'custom' && (
                      <div className="space-y-1.5">
                        {acceptedMembers.map(m => (
                          <div key={m.userId} className="flex items-center gap-2">
                            <span className="text-[12px] text-text-muted w-24 truncate">{m.displayName.split(' ')[0]}</span>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={expCustomAmounts[m.userId] || ''}
                              onChange={e => setExpCustomAmounts(prev => ({ ...prev, [m.userId]: e.target.value }))}
                              className="flex-1 bg-bg4 border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-text outline-none"
                            />
                          </div>
                        ))}
                        <div className="text-[10px] text-text-muted">
                          Total: {mainCurrency} {Object.values(expCustomAmounts).reduce((a, v) => a + (parseFloat(v) || 0), 0).toFixed(2)}
                          {expAmount && ` / ${parseFloat(expAmount).toFixed(2)}`}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAddExpense}
                      disabled={addingExp || !expAmount || !expDesc}
                      className="flex-1 py-2 rounded-lg bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 disabled:opacity-40"
                    >
                      {addingExp ? 'Adding...' : 'Add expense'}
                    </button>
                    <button
                      onClick={() => { setShowAddExpense(false); setExpSplitType('equal'); setExpExcluded(new Set()); setExpCustomAmounts({}); }}
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
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{exp.description}</div>
                        <div className="text-[11px] text-text-muted">
                          {exp.paidByName} paid · {new Date(exp.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[15px] font-[family-name:var(--font-playfair)] text-gold">
                          {exp.currency} {exp.amount.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {exp.splits.length > 0 ? `${exp.currency} ${(exp.amount / exp.splits.length).toFixed(2)}/pp` : ''}
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

          {/* ─── Chat Tab ─── */}
          {tab === 'chat' && (
            <div className="flex flex-col h-full min-h-[300px]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-text-muted">
                    <div className="text-3xl mb-2">💬</div>
                    <div className="text-sm">No messages yet</div>
                    <div className="text-[11px] mt-1">Start the conversation!</div>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMe = msg.userId === user?.id;
                  const prevMsg = messages[i - 1];
                  const showAvatar = !prevMsg || prevMsg.userId !== msg.userId ||
                    (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 300000);
                  const time = new Date(msg.createdAt);
                  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateStr = time.toLocaleDateString();
                  const prevDate = prevMsg ? new Date(prevMsg.createdAt).toLocaleDateString() : '';
                  const showDate = dateStr !== prevDate;

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center my-3">
                          <span className="text-[10px] text-text-muted bg-bg3 px-3 py-1 rounded-full">{dateStr}</span>
                        </div>
                      )}
                      <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                        {showAvatar ? (
                          msg.avatarUrl ? (
                            <img src={msg.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-bg4 flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5">
                              {msg.displayName.charAt(0).toUpperCase()}
                            </div>
                          )
                        ) : (
                          <div className="w-7 shrink-0" />
                        )}
                        <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                          {showAvatar && !isMe && (
                            <span className="text-[10px] text-text-muted mb-0.5 ml-1">{msg.displayName.split(' ')[0]}</span>
                          )}
                          <div
                            className={`group relative px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                              isMe
                                ? 'bg-gold/15 text-text rounded-br-md'
                                : 'bg-bg3 text-text rounded-bl-md'
                            }`}
                          >
                            {msg.message}
                            <span className={`block text-[9px] mt-0.5 ${isMe ? 'text-gold/50 text-right' : 'text-text-muted/50'}`}>
                              {timeStr}
                            </span>
                            {isMe && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="absolute -left-6 top-1/2 -translate-y-1/2 text-text-muted/0 group-hover:text-text-muted hover:!text-stamp-red text-[11px] cursor-pointer transition-colors"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2 mt-auto pt-2 border-t border-white/[0.06]">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message..."
                  maxLength={2000}
                  className="flex-1 bg-bg3 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-gold/30 placeholder:text-text-muted"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMsg || !chatInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 disabled:opacity-40 shrink-0"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* ─── Members Tab ─── */}
          {tab === 'members' && (
            <div className="space-y-2">
              {/* Invite button */}
              <button
                onClick={() => setInviteOpen(true)}
                className="w-full py-2.5 rounded-xl border border-dashed border-gold/30 text-gold text-sm hover:bg-gold/5 transition-colors cursor-pointer"
              >
                + Invite member
              </button>

              {members.length === 0 && (
                <div className="text-center py-6 text-text-muted">
                  <div className="text-2xl mb-2">👥</div>
                  <p className="text-sm">No members yet. Invite someone to get started!</p>
                </div>
              )}

              {members.map(m => {
                const isOwner = members.find(x => x.userId === user?.id)?.role === 'owner';
                const isSelf = m.userId === user?.id;
                return (
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
                    <div className="flex items-center gap-2">
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
                      {isOwner && !isSelf && m.role !== 'owner' && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Remove ${m.displayName} from this trip?`)) return;
                            try {
                              const supabase = createClient();
                              await removeMember(supabase, m.id);
                              setMembers(prev => prev.filter(x => x.id !== m.id));
                              toast(`Removed ${m.displayName}`);
                            } catch {
                              toast('Failed to remove member', 'error');
                            }
                          }}
                          className="text-[11px] text-stamp-red hover:bg-stamp-red/10 rounded-md px-2 py-1 transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Disband group — owner only (show even with 0 members so they can un-group) */}
              {(members.find(m => m.userId === user?.id)?.role === 'owner' || members.length === 0) && (
                <div className="mt-6 pt-4 border-t border-white/[0.06]">
                  <button
                    onClick={async () => {
                      if (!confirm(`Disband this group? All members will be removed and "${trip.name}" becomes a regular trip.`)) return;
                      try {
                        const supabase = createClient();
                        await disbandGroup(supabase, trip.id);
                        await updateTrip({ ...trip, isGroup: false });
                        toast('Group disbanded — trip is now private');
                        onClose();
                      } catch {
                        toast('Failed to disband group', 'error');
                      }
                    }}
                    className="w-full py-2.5 rounded-xl border border-stamp-red/30 text-stamp-red text-sm hover:bg-stamp-red/10 transition-colors cursor-pointer"
                  >
                    👥 Disband group
                  </button>
                  <p className="text-[11px] text-text-muted text-center mt-2">Removes all members. Your trip stays.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {inviteOpen && (
        <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} trip={trip} />
      )}
    </div>
  );
}
