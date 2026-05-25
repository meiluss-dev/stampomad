'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';
import type { PackingItem, PackingList } from '@/types';

const TEMPLATES: Record<string, string[]> = {
  'Essentials': ['Passport', 'Visa / travel documents', 'Travel insurance', 'Wallet / cash / cards', 'Phone + charger', 'Headphones', 'Travel adapter', 'House keys'],
  'Clothing': ['T-shirts', 'Pants / shorts', 'Underwear', 'Socks', 'Jacket / hoodie', 'Sleepwear', 'Swimwear', 'Comfortable shoes', 'Sandals / flip-flops'],
  'Toiletries': ['Toothbrush + toothpaste', 'Deodorant', 'Shampoo / conditioner', 'Sunscreen', 'Razor', 'Medications', 'First aid kit', 'Hand sanitiser'],
  'Electronics': ['Laptop + charger', 'Camera', 'Power bank', 'SD cards', 'E-reader / Kindle'],
  'Travel gear': ['Backpack / daypack', 'Neck pillow', 'Eye mask + earplugs', 'Water bottle', 'Luggage lock', 'Packing cubes', 'Laundry bag'],
};

interface PackingListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: number;
  tripName: string;
}

export function PackingListModal({ open, onOpenChange, tripId, tripName }: PackingListModalProps) {
  const { packingLists, savePackingList } = useStore();
  const { toast } = useToast();
  const [items, setItems] = useState<PackingItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [newCategory, setNewCategory] = useState('Essentials');
  const [showTemplates, setShowTemplates] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing list on open
  useEffect(() => {
    if (open) {
      const existing = packingLists[tripId];
      setItems(existing?.items || []);
    }
  }, [open, tripId, packingLists]);

  if (!open) return null;

  const categories = [...new Set(items.map(i => i.category))];
  const totalItems = items.length;
  const checkedItems = items.filter(i => i.checked).length;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  function addItem() {
    if (!newItem.trim()) return;
    const item: PackingItem = {
      id: Date.now(),
      text: newItem.trim(),
      checked: false,
      category: newCategory,
    };
    setItems(prev => [...prev, item]);
    setNewItem('');
    inputRef.current?.focus();
  }

  function toggleItem(id: number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  }

  function removeItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function addTemplate(category: string) {
    const existing = new Set(items.map(i => i.text.toLowerCase()));
    const templateItems = TEMPLATES[category] || [];
    const newItems: PackingItem[] = templateItems
      .filter(t => !existing.has(t.toLowerCase()))
      .map(text => ({
        id: Date.now() + Math.random() * 10000,
        text,
        checked: false,
        category,
      }));
    setItems(prev => [...prev, ...newItems]);
    toast(`Added ${newItems.length} items from ${category}`);
  }

  function addAllTemplates() {
    const existing = new Set(items.map(i => i.text.toLowerCase()));
    const newItems: PackingItem[] = [];
    Object.entries(TEMPLATES).forEach(([category, templateItems]) => {
      templateItems.forEach(text => {
        if (!existing.has(text.toLowerCase())) {
          newItems.push({
            id: Date.now() + Math.random() * 100000,
            text,
            checked: false,
            category,
          });
        }
      });
    });
    setItems(prev => [...prev, ...newItems]);
    toast(`Added ${newItems.length} items`);
    setShowTemplates(false);
  }

  async function handleSave() {
    const list: PackingList = { tripId, items };
    await savePackingList(tripId, list);
    toast('Packing list saved!');
    onOpenChange(false);
  }

  function uncheckAll() {
    setItems(prev => prev.map(i => ({ ...i, checked: false })));
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="bg-bg2 border border-white/[0.08] rounded-2xl w-full max-w-[600px] mx-4 max-h-[85vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 pb-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl">Packing List</h2>
            <button onClick={() => onOpenChange(false)} className="text-text-muted hover:text-text text-xl cursor-pointer bg-transparent border-none">×</button>
          </div>
          <div className="text-[12px] text-text-muted mb-4">{tripName}</div>

          {/* Progress bar */}
          {totalItems > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-[11px] text-text-muted mb-1.5">
                <span>{checkedItems} of {totalItems} packed</span>
                <span className={progress === 100 ? 'text-stamp-green font-medium' : ''}>{progress}%{progress === 100 ? ' — Ready to go!' : ''}</span>
              </div>
              <div className="h-2 bg-bg4 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-stamp-green' : 'bg-gold'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Add item row */}
          <div className="flex gap-2 mb-3">
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="bg-bg3 border border-white/[0.08] rounded-lg px-2.5 py-2 text-[12px] text-text-muted outline-none cursor-pointer shrink-0"
            >
              {Object.keys(TEMPLATES).map(c => <option key={c} value={c}>{c}</option>)}
              {categories.filter(c => !Object.keys(TEMPLATES).includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              ref={inputRef}
              type="text"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Add item..."
              className="flex-1 bg-bg3 border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-text outline-none placeholder:text-text-muted focus:border-gold transition-colors min-w-0"
            />
            <button onClick={addItem} className="bg-gold text-bg px-3 py-2 rounded-lg text-[13px] font-medium cursor-pointer hover:opacity-85 transition-all shrink-0">
              Add
            </button>
          </div>

          {/* Template buttons */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-[11px] text-gold hover:underline cursor-pointer bg-transparent border-none"
            >
              {showTemplates ? 'Hide templates' : '+ Add from templates'}
            </button>
            {items.length > 0 && (
              <button
                onClick={uncheckAll}
                className="text-[11px] text-text-muted hover:text-text cursor-pointer bg-transparent border-none ml-auto"
              >
                Uncheck all
              </button>
            )}
          </div>

          {showTemplates && (
            <div className="flex flex-wrap gap-1.5 mb-4 bg-bg3 rounded-xl p-3">
              {Object.keys(TEMPLATES).map(cat => (
                <button
                  key={cat}
                  onClick={() => addTemplate(cat)}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-[12px] text-text-muted hover:text-gold hover:border-gold/40 cursor-pointer transition-all bg-transparent"
                >
                  + {cat}
                </button>
              ))}
              <button
                onClick={addAllTemplates}
                className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-[12px] text-gold cursor-pointer transition-all"
              >
                + Add all
              </button>
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 min-h-0">
          {totalItems === 0 ? (
            <div className="text-center py-10 text-text-muted">
              <div className="text-4xl mb-3">🧳</div>
              <div className="text-sm">No items yet. Add items or use templates above.</div>
            </div>
          ) : (
            categories.map(cat => {
              const catItems = items.filter(i => i.category === cat);
              const catChecked = catItems.filter(i => i.checked).length;
              return (
                <div key={cat} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-[11px] text-text-muted uppercase tracking-wider font-medium">{cat}</div>
                    <span className="text-[10px] text-text-muted">({catChecked}/{catItems.length})</span>
                  </div>
                  <div className="space-y-1">
                    {catItems.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all group ${
                          item.checked ? 'bg-stamp-green/5' : 'bg-bg3 hover:bg-bg4'
                        }`}
                      >
                        <button
                          onClick={() => toggleItem(item.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                            item.checked
                              ? 'bg-stamp-green border-stamp-green text-white'
                              : 'border-white/20 hover:border-gold bg-transparent'
                          }`}
                        >
                          {item.checked && <span className="text-[11px]">✓</span>}
                        </button>
                        <span className={`text-[13px] flex-1 transition-all ${
                          item.checked ? 'line-through text-text-muted' : 'text-text'
                        }`}>
                          {item.text}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-text-muted hover:text-stamp-red text-sm opacity-0 group-hover:opacity-100 cursor-pointer bg-transparent border-none transition-all"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 pt-3 border-t border-white/[0.08] flex justify-end gap-2">
          <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg border border-white/[0.08] text-text-muted text-sm cursor-pointer hover:border-white/20 transition-colors bg-transparent">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-gold text-bg text-sm font-medium cursor-pointer hover:opacity-85 transition-all">
            Save List
          </button>
        </div>
      </div>
    </div>
  );
}
