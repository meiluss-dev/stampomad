import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tripId, message } = await req.json();
  if (!tripId || !message?.trim()) {
    return NextResponse.json({ error: 'Missing tripId or message' }, { status: 400 });
  }

  const msg = message.trim().slice(0, 2000);

  // Insert message (uses user's auth — RLS allows members to insert)
  const { error: msgErr } = await supabase.from('trip_messages').insert({
    trip_id: Number(tripId),
    user_id: user.id,
    message: msg,
  });
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

  // Send notifications via admin client (bypasses RLS)
  const admin = createAdminClient();

  // Get all members + trip owner
  const [{ data: members }, { data: trip }, { data: senderProfile }] = await Promise.all([
    admin.from('trip_members').select('user_id').eq('trip_id', Number(tripId)).eq('status', 'accepted'),
    admin.from('trips').select('user_id, name').eq('id', Number(tripId)).single(),
    admin.from('user_profiles').select('display_name').eq('user_id', user.id).single(),
  ]);

  const recipientIds = new Set<string>();
  (members || []).forEach(m => recipientIds.add(m.user_id));
  if (trip) recipientIds.add(trip.user_id);
  recipientIds.delete(user.id); // Don't notify the sender

  if (recipientIds.size > 0) {
    const tripName = trip?.name || 'Trip';
    const senderName = senderProfile?.display_name || 'Someone';
    const preview = msg.length > 60 ? msg.slice(0, 60) + '…' : msg;

    const rows = [...recipientIds].map(uid => ({
      user_id: uid,
      type: 'chat_message',
      trip_id: Number(tripId),
      actor_id: user.id,
      message: `sent a message in ${tripName}: "${preview}"`,
      metadata: { tripName, message: preview, senderName },
    }));

    await admin.from('notifications').insert(rows);
  }

  return NextResponse.json({ ok: true });
}
