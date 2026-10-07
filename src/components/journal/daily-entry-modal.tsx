'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { DailyEntry } from '@/types';

const MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '🤔', label: 'Thoughtful' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🔥', label: 'Motivated' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '🥳', label: 'Excited' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: DailyEntry | null;
  onSave: (entry: Omit<DailyEntry, 'id'> | DailyEntry) => Promise<void>;
}

export function DailyEntryModal({ open, onOpenChange, entry, onSave }: Props) {
  const { toast } = useToast();
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [mood, setMood] = useState('');

  const isEditing = !!entry;

  useEffect(() => {
    if (open) {
      if (entry) {
        setDate(entry.date);
        setTitle(entry.title || '');
        setText(entry.text || '');
        setMood(entry.mood || '');
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setTitle('');
        setText('');
        setMood('');
      }
    }
  }, [open, entry]);

  async function save() {
    if (!date || !text.trim()) {
      toast('Please add a date and some text.', 'error');
      return;
    }
    const data = {
      ...(isEditing && entry ? { id: entry.id } : {}),
      date,
      title: title.trim(),
      text: text.trim(),
      mood: mood || undefined,
    };
    await onSave(data as DailyEntry);
    toast(isEditing ? 'Entry updated!' : 'Entry saved!');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg2 border-white/[0.12] text-text max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{isEditing ? 'Edit Entry' : 'New Daily Entry'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-bg3 border-white/[0.08] text-text" />
          </div>
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Mood (optional)</label>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map(m => (
                <button
                  key={m.emoji}
                  type="button"
                  onClick={() => setMood(mood === m.emoji ? '' : m.emoji)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${
                    mood === m.emoji
                      ? 'border-gold bg-gold/15 text-gold'
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                  title={m.label}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Title (optional)</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What's on your mind..." className="bg-bg3 border-white/[0.08] text-text" />
          </div>
          <div>
            <label className="text-[11px] text-text-muted uppercase tracking-wider mb-1.5 block">Thoughts</label>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Write freely..."
              className="bg-bg3 border-white/[0.08] text-text min-h-[180px]"
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={() => onOpenChange(false)} className="px-5 py-2.5 rounded-[10px] border border-white/[0.08] text-text-muted text-sm cursor-pointer">Cancel</button>
          <button onClick={save} className="px-6 py-2.5 rounded-[10px] bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85">
            {isEditing ? 'Update' : 'Save Entry'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
