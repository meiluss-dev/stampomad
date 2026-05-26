'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { loadTripBudget, saveTripBudget, loadBudgetExpenses, addBudgetExpense, deleteBudgetExpense } from '@/lib/supabase/budget-data';
import type { TripBudget, BudgetExpense } from '@/lib/supabase/budget-data';
import type { Trip } from '@/types';
import { trackView } from '@/lib/tracking';

const CATEGORIES = [
  { key: 'food', label: '🍽️ Food', color: 'gold' },
  { key: 'transport', label: '🚌 Transport', color: 'teal' },
  { key: 'stay', label: '🏨 Stay', color: 'stamp-blue' },
  { key: 'activities', label: '🎯 Activities', color: 'stamp-green' },
  { key: 'shopping', label: '🛍️ Shopping', color: 'stamp-red' },
  { key: 'other', label: '📌 Other', color: 'text-muted' },
];

export function BudgetModal({ open, onOpenChange, trip }: { open: boolean; onOpenChange: (open: boolean) => void; trip: Trip }) {
  const { user } = useStore();
  const { toast } = useToast();
  const [budget, setBudget] = useState<TripBudget | null>(null);
  const [expenses, setExpenses] = useState<BudgetExpense[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Budget setup
  const [editBudget, setEditBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('EUR');

  // Add expense form
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const load = useCallback(async () => {
    if (!user || !open) return;
    const supabase = createClient();
    const [b, e] = await Promise.all([
      loadTripBudget(supabase, trip.id, user.id),
      loadBudgetExpenses(supabase, trip.id, user.id),
    ]);
    setBudget(b);
    setExpenses(e);
    if (b) {
      setBudgetAmount(String(b.totalBudget));
      setBudgetCurrency(b.currency);
    }
    setLoaded(true);
  }, [user, trip.id, open]);

  useEffect(() => { if (open) { load(); trackView('budget_tracker'); } }, [open, load]);

  async function handleSaveBudget() {
    if (!user) return;
    const val = parseFloat(budgetAmount);
    if (isNaN(val) || val < 0) { toast('Enter a valid budget amount', 'error'); return; }
    const supabase = createClient();
    await saveTripBudget(supabase, trip.id, user.id, val, budgetCurrency);
    setBudget({ id: 0, tripId: trip.id, totalBudget: val, currency: budgetCurrency });
    setEditBudget(false);
    toast('Budget saved!');
  }

  async function handleAddExpense() {
    if (!user) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { toast('Enter a valid amount', 'error'); return; }
    const supabase = createClient();
    await addBudgetExpense(supabase, trip.id, user.id, val, budget?.currency || 'EUR', category, description, date);
    await load();
    setAmount('');
    setDescription('');
    setShowAdd(false);
    toast('Expense added!');
  }

  async function handleDelete(id: number) {
    const supabase = createClient();
    await deleteBudgetExpense(supabase, id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    toast('Expense removed');
  }

  const totalSpent = expenses.reduce((a, e) => a + e.amount, 0);
  const remaining = budget ? budget.totalBudget - totalSpent : 0;
  const pct = budget && budget.totalBudget > 0 ? Math.min(100, Math.round((totalSpent / budget.totalBudget) * 100)) : 0;
  const dailyBudget = budget && trip.days > 0 ? budget.totalBudget / trip.days : 0;

  // Spending by category
  const byCat: Record<string, number> = {};
  expenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });

  // Spending by day
  const byDay: Record<string, number> = {};
  expenses.forEach(e => { if (e.date) byDay[e.date] = (byDay[e.date] || 0) + e.amount; });

  const cur = budget?.currency || 'EUR';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg2 border-white/[0.12] text-text max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            💰 {trip.emoji} {trip.name}
          </DialogTitle>
        </DialogHeader>

        {!loaded ? (
          <div className="text-center py-8 text-text-muted animate-pulse">Loading budget...</div>
        ) : (
          <div className="space-y-4">
            {/* Budget overview */}
            {!budget && !editBudget ? (
              <div className="text-center py-6 bg-bg3 rounded-xl">
                <div className="text-2xl mb-2">💰</div>
                <div className="text-sm text-text-muted mb-3">No budget set for this trip</div>
                <button
                  onClick={() => setEditBudget(true)}
                  className="px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold text-sm cursor-pointer hover:bg-gold/15 transition-all"
                >
                  Set Budget
                </button>
              </div>
            ) : editBudget ? (
              <div className="bg-bg3 rounded-xl p-4">
                <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">Trip Budget</div>
                <div className="flex gap-2">
                  <select
                    value={budgetCurrency}
                    onChange={e => setBudgetCurrency(e.target.value)}
                    className="bg-bg4 border border-white/[0.08] rounded-lg px-2 py-2 text-sm outline-none w-20"
                  >
                    {['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SEK', 'NOK', 'PLN', 'CZK', 'THB', 'BRL', 'INR'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={budgetAmount}
                    onChange={e => setBudgetAmount(e.target.value)}
                    placeholder="Total budget"
                    className="flex-1 bg-bg4 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                  <button onClick={handleSaveBudget} className="px-4 py-2 rounded-lg bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-bg3 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Budget</div>
                    <div className="font-[family-name:var(--font-playfair)] text-lg text-gold">{cur} {budget!.totalBudget.toFixed(0)}</div>
                  </div>
                  <div className="bg-bg3 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Spent</div>
                    <div className="font-[family-name:var(--font-playfair)] text-lg">{cur} {totalSpent.toFixed(2)}</div>
                  </div>
                  <div className="bg-bg3 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Remaining</div>
                    <div className={`font-[family-name:var(--font-playfair)] text-lg ${remaining >= 0 ? 'text-teal' : 'text-stamp-red'}`}>
                      {cur} {remaining.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-text-muted mb-1">
                    <span>{pct}% used</span>
                    <span>{cur} {dailyBudget.toFixed(0)}/day target</span>
                  </div>
                  <div className="h-2.5 bg-bg4 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct > 90 ? 'bg-stamp-red' : pct > 70 ? 'bg-gold' : 'bg-teal'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Category breakdown */}
                {Object.keys(byCat).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.filter(c => byCat[c.key]).map(c => (
                      <div key={c.key} className="bg-bg3 rounded-lg px-2.5 py-1.5 text-[11px] flex items-center gap-1.5">
                        <span>{c.label.split(' ')[0]}</span>
                        <span className="font-medium">{cur} {byCat[c.key].toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => setEditBudget(true)} className="text-[11px] text-text-muted cursor-pointer hover:text-gold transition-colors">
                  Edit budget
                </button>
              </>
            )}

            {/* Add expense */}
            {budget && (
              <>
                {showAdd ? (
                  <div className="bg-bg3 rounded-xl p-4 space-y-3">
                    <div className="text-[11px] text-text-muted uppercase tracking-wider">Add Expense</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="Amount"
                        className="flex-1 bg-bg4 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
                      />
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="bg-bg4 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none w-36"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(c => (
                        <button
                          key={c.key}
                          onClick={() => setCategory(c.key)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-all border ${
                            category === c.key ? 'bg-gold/12 border-gold/40 text-gold' : 'border-white/[0.08] text-text-muted hover:border-white/20'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full bg-bg4 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleAddExpense} className="flex-1 py-2 rounded-lg bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85">
                        Add
                      </button>
                      <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-white/[0.08] text-text-muted text-sm cursor-pointer hover:border-white/20">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="w-full py-2.5 rounded-xl border border-dashed border-white/[0.12] text-text-muted text-sm cursor-pointer hover:border-gold/40 hover:text-gold transition-all"
                  >
                    + Add Expense
                  </button>
                )}
              </>
            )}

            {/* Expense list */}
            {expenses.length > 0 && (
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
                  Expenses ({expenses.length})
                </div>
                <div className="space-y-1.5">
                  {expenses.map(e => {
                    const cat = CATEGORIES.find(c => c.key === e.category);
                    return (
                      <div key={e.id} className="flex items-center gap-2.5 bg-bg3 rounded-xl px-3 py-2.5 group">
                        <span className="text-sm">{cat?.label.split(' ')[0] || '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium truncate">{e.description || cat?.label.split(' ')[1] || 'Expense'}</div>
                          <div className="text-[10px] text-text-muted">{e.date}</div>
                        </div>
                        <div className="text-sm font-medium">{cur} {e.amount.toFixed(2)}</div>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-stamp-red text-xs opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
