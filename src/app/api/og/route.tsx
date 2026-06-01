import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'profile';

  if (type === 'home') return renderHome();
  if (type === 'explore') return renderExplore(searchParams);
  if (type === 'trip') return renderTrip(searchParams);
  return renderProfile(searchParams);
}

const GOLD = '#c9a96e';
const TEAL = '#5bbfb5';
const BG = '#0f1419';
const BG2 = '#1a2332';
const TEXT = '#e7e9ea';
const MUTED = '#8899a6';

/* ── Home / Landing ── */
function renderHome() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(145deg, ${BG} 0%, ${BG2} 40%, #1e2d3d 70%, ${BG} 100%)`, fontFamily: 'system-ui, sans-serif', position: 'relative' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: 200, border: `2px solid ${GOLD}33`, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -120, left: -60, width: 500, height: 500, borderRadius: 250, border: `2px dashed ${TEAL}22`, display: 'flex' }} />

        {/* Stamp border */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 80px', border: `3px solid ${GOLD}`, borderRadius: 20, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 6, border: `1px solid ${GOLD}55`, borderRadius: 16, display: 'flex' }} />
          <div style={{ fontSize: 56, marginBottom: 8 }}>✈️</div>
          <div style={{ color: GOLD, fontSize: 68, fontWeight: 800, letterSpacing: 6, textTransform: 'uppercase' as const }}>STAMPOMAD</div>
          <div style={{ color: MUTED, fontSize: 22, marginTop: 8, letterSpacing: 8, textTransform: 'uppercase' as const }}>Travel Tracker</div>
        </div>

        <div style={{ color: TEXT, fontSize: 24, marginTop: 40, textAlign: 'center' as const, maxWidth: 600 }}>
          Track every country · Map every trip · Journal your adventures
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
          {['🗺️ Maps', '📔 Journal', '📊 Stats', '👥 Groups', '📷 Photos'].map(f => (
            <div key={f} style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}33`, borderRadius: 20, padding: '8px 20px', color: GOLD, fontSize: 16 }}>{f}</div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

/* ── Explore ── */
function renderExplore(params: URLSearchParams) {
  const countries = params.get('countries') || '0';
  const trips = params.get('trips') || '0';
  const travelers = params.get('travelers') || '0';

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', background: `linear-gradient(145deg, ${BG} 0%, ${BG2} 50%, ${BG} 100%)`, padding: 60, fontFamily: 'system-ui, sans-serif', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -60, right: 60, width: 300, height: 300, borderRadius: 150, border: `2px solid ${GOLD}22`, display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ color: GOLD, fontSize: 28, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, border: `2px solid ${GOLD}`, borderRadius: 8, padding: '6px 16px' }}>Stampomad</div>
            <div style={{ color: MUTED, fontSize: 20 }}>·</div>
            <div style={{ color: MUTED, fontSize: 20 }}>Explore</div>
          </div>

          <div style={{ color: TEXT, fontSize: 52, fontWeight: 700, lineHeight: 1.2 }}>
            Discover travel stories
          </div>
          <div style={{ color: TEXT, fontSize: 52, fontWeight: 700, lineHeight: 1.2 }}>
            from around the <span style={{ color: GOLD }}>world</span>
          </div>
          <div style={{ color: MUTED, fontSize: 22, marginTop: 16 }}>
            Browse trips, routes, journals, and photos from the community
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 40, marginTop: 'auto' }}>
            {[
              { value: countries, label: 'Countries', color: GOLD, icon: '🌍' },
              { value: trips, label: 'Trips shared', color: TEAL, icon: '✈️' },
              { value: travelers, label: 'Travelers', color: '#e4756e', icon: '👥' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: `${s.color}11`, border: `1px solid ${s.color}33`, borderRadius: 16, padding: '16px 24px' }}>
                <div style={{ fontSize: 28 }}>{s.icon}</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: s.color, fontSize: 36, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ color: MUTED, fontSize: 14 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

/* ── Trip detail ── */
function renderTrip(params: URLSearchParams) {
  const name = params.get('name') || 'Trip';
  const emoji = params.get('emoji') || '✈️';
  const country = params.get('country') || '';
  const days = params.get('days') || '0';
  const cities = params.get('cities') || '';
  const author = params.get('author') || '';
  const waypoints = params.get('waypoints') || '0';
  const photo = params.get('photo') || '';
  const avatar = params.get('avatar') || '';
  const rating = parseInt(params.get('rating') || '0');
  const journals = params.get('journals') || '0';
  const dates = params.get('dates') || '';

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', background: BG, fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
        {/* Background photo with gradient overlay */}
        {photo && (
          <img
            src={photo}
            width={1200}
            height={630}
            style={{ position: 'absolute', inset: 0, objectFit: 'cover', opacity: 0.25 }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: photo ? 'linear-gradient(180deg, rgba(15,20,25,0.6) 0%, rgba(15,20,25,0.85) 50%, rgba(15,20,25,0.95) 100%)' : `linear-gradient(145deg, ${BG} 0%, ${BG2} 50%, ${BG} 100%)`, display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column', padding: 60, position: 'relative', flex: 1 }}>
          {/* Top: brand + author */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ color: GOLD, fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, border: `2px solid ${GOLD}88`, borderRadius: 6, padding: '4px 14px' }}>Stampomad</div>
            {author && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {avatar ? (
                  <img src={avatar} width={32} height={32} style={{ borderRadius: 16, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: BG, fontWeight: 700 }}>
                    {author.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ color: MUTED, fontSize: 18 }}>{author}</div>
              </div>
            )}
          </div>

          {/* Main: emoji + title + country */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flex: 1 }}>
            <div style={{ fontSize: 80, lineHeight: 1 }}>{emoji}</div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ color: TEXT, fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>{name}</div>
              {country && <div style={{ color: GOLD, fontSize: 24, marginTop: 8, fontWeight: 500 }}>{country}</div>}
              {dates && <div style={{ color: MUTED, fontSize: 18, marginTop: 4 }}>📅 {dates}</div>}
              {cities && <div style={{ color: MUTED, fontSize: 18, marginTop: 4 }}>📍 {cities.length > 60 ? cities.slice(0, 60) + '…' : cities}</div>}
              {rating > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} style={{ fontSize: 20, opacity: s <= rating ? 1 : 0.2 }}>⭐</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom: stats row */}
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { value: days, label: 'Days', icon: '📅', color: GOLD, show: true },
              { value: waypoints, label: 'Waypoints', icon: '📍', color: TEAL, show: Number(waypoints) > 0 },
              { value: journals, label: 'Journal', icon: '📝', color: '#a78bfa', show: Number(journals) > 0 },
            ].filter(s => s.show).map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: `${s.color}15`, border: `1px solid ${s.color}33`, borderRadius: 14, padding: '12px 24px' }}>
                <div style={{ fontSize: 22 }}>{s.icon}</div>
                <div style={{ color: s.color, fontSize: 32, fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: MUTED, fontSize: 14 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

/* ── Profile ── */
function renderProfile(params: URLSearchParams) {
  const name = params.get('name') || 'Traveler';
  const bio = params.get('bio') || '';
  const countries = params.get('countries') || '0';
  const trips = params.get('trips') || '0';
  const continents = params.get('continents') || '0';
  const avatar = params.get('avatar') || '';

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', background: `linear-gradient(145deg, ${BG} 0%, ${BG2} 50%, ${BG} 100%)`, fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative stamp circle */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: 250, border: `3px solid ${GOLD}15`, display: 'flex' }} />
        <div style={{ position: 'absolute', top: -80, right: -80, width: 460, height: 460, borderRadius: 230, border: `1px dashed ${GOLD}10`, display: 'flex' }} />

        <div style={{ display: 'flex', padding: 60, flex: 1, position: 'relative' }}>
          {/* Left: avatar + info */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Brand */}
            <div style={{ color: GOLD, fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, border: `2px solid ${GOLD}88`, borderRadius: 6, padding: '4px 14px', alignSelf: 'flex-start', marginBottom: 32 }}>Stampomad</div>

            {/* Avatar + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
              {avatar ? (
                <div style={{ position: 'relative', display: 'flex' }}>
                  <img src={avatar} width={120} height={120} style={{ borderRadius: 60, objectFit: 'cover', border: `3px solid ${GOLD}` }} />
                </div>
              ) : (
                <div style={{ width: 120, height: 120, borderRadius: 60, background: `linear-gradient(135deg, ${GOLD}, #d4b878)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, color: BG, fontWeight: 700, border: `3px solid ${GOLD}` }}>
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: TEXT, fontSize: 48, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
                {bio && <div style={{ color: MUTED, fontSize: 20, marginTop: 8, maxWidth: 500 }}>{bio.substring(0, 80)}{bio.length > 80 ? '…' : ''}</div>}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 16, marginTop: 'auto' }}>
              {[
                { value: countries, label: 'Countries', icon: '🌍', color: GOLD },
                { value: trips, label: 'Trips', icon: '✈️', color: TEAL },
                { value: continents, label: 'Continents', icon: '🗺️', color: '#e4756e' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: `${s.color}12`, border: `1px solid ${s.color}33`, borderRadius: 16, padding: '16px 28px' }}>
                  <div style={{ fontSize: 26 }}>{s.icon}</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ color: s.color, fontSize: 40, fontWeight: 700 }}>{s.value}</div>
                    <div style={{ color: MUTED, fontSize: 14 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
