'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function JournalEntryModal({ open, onOpenChange, tripId }: { open: boolean; onOpenChange: (open: boolean) => void; tripId: number }) {
  const { addJournalEntry } = useStore();
  const { toast } = useToast();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) {
      const now = new Date();
      setDate(now.toISOString().split('T')[0]);
      setTime(now.toTimeString().slice(0, 5));
      setTitle('');
      setText('');
    }
  }, [open]);

  async function save() {
    if (!date || !text.trim()) {
      alert('Please add a date and some text.');
      return;
    }
    await addJournalEntry(tripId, { date, time, title: title.trim(), text: text.trim() });
    toast('Journal entry saved!');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg2 border-white/[0.12] text-text max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">New Journal Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-bg3 border-white/[0.08] text-text" />
            </div>
            <div>
              <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Time (optional)</label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-bg3 border-white/[0.08] text-text" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Title (optional)</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="A memorable moment..." className="bg-bg3 border-white/[0.08] text-text" />
          </div>
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Entry</label>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Write about your experience..."
              className="bg-bg3 border-white/[0.08] text-text min-h-[160px]"
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={() => onOpenChange(false)} className="px-5 py-2.5 rounded-[10px] border border-white/[0.08] text-text-muted text-sm cursor-pointer">Cancel</button>
          <button onClick={save} className="px-6 py-2.5 rounded-[10px] bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85">Save Entry</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
