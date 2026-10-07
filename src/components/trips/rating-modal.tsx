'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RATING_CATEGORIES, averageRating, type TripRatings } from '@/types';
import type { Trip } from '@/types';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
}

export function RatingModal({ open, onOpenChange, trip }: Props) {
  const { updateTrip } = useStore();
  const { toast } = useToast();
  const [ratings, setRatings] = useState<TripRatings>({});

  useEffect(() => {
    if (open) setRatings(trip.ratings || {});
  }, [open, trip.ratings]);

  const avg = averageRating(ratings);
  const ratedCount = Object.values(ratings).filter(v => v != null && v > 0).length;

  async function handleSave() {
    await updateTrip({ ...trip, ratings, rating: averageRating(ratings) });
    toast('Ratings saved!');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {trip.name}</DialogTitle>
        </DialogHeader>

        <div className="text-[12px] text-text-muted mb-3">
          Rate what applies — leave the rest blank.
          {ratedCount > 0 && (
            <span className="text-gold ml-1.5 font-medium">
              avg {avg}★ ({ratedCount}/{RATING_CATEGORIES.length})
            </span>
          )}
        </div>

        <div className="space-y-2">
          {RATING_CATEGORIES.map(cat => {
            const val = ratings[cat.key] || 0;
            return (
              <div key={cat.key} className="flex items-center gap-3">
                <span className="text-[13px] w-[140px] shrink-0" title={cat.label}>
                  {cat.icon} {cat.label}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatings(prev => ({
                        ...prev,
                        [cat.key]: prev[cat.key] === star ? undefined : star,
                      }))}
                      className={`text-base cursor-pointer transition-transform hover:scale-125 ${
                        star <= val ? 'opacity-100' : 'opacity-20'
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                {val > 0 && (
                  <span className="text-[11px] text-text-muted">{val}/5</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setRatings({})}
            className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            Clear all
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm bg-gold text-bg font-medium cursor-pointer hover:bg-gold/90 transition-colors"
          >
            Save Ratings
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
