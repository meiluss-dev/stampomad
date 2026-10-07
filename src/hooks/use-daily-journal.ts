'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { loadDailyEntries, saveDailyEntry, deleteDailyEntry } from '@/lib/supabase/data';
import { useStore } from '@/lib/store';
import type { DailyEntry } from '@/types';

export function useDailyJournal() {
  const { user } = useStore();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useRef(createClient());

  useEffect(() => {
    if (!user) return;
    loadDailyEntries(supabase.current, user.id).then(data => {
      setEntries(data);
      setLoading(false);
    });
  }, [user]);

  const addEntry = useCallback(async (entry: Omit<DailyEntry, 'id'>) => {
    if (!user) return;
    const full: DailyEntry = { ...entry, id: Date.now() };
    setEntries(prev => [full, ...prev]);
    await saveDailyEntry(supabase.current, user.id, full);
  }, [user]);

  const updateEntry = useCallback(async (entry: DailyEntry) => {
    if (!user) return;
    setEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
    await saveDailyEntry(supabase.current, user.id, entry);
  }, [user]);

  const removeEntry = useCallback(async (entryId: number) => {
    if (!user) return;
    setEntries(prev => prev.filter(e => e.id !== entryId));
    await deleteDailyEntry(supabase.current, user.id, entryId);
  }, [user]);

  return { entries, loading, addEntry, updateEntry, removeEntry };
}
