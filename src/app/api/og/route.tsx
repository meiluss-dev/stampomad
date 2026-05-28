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

/* ── Home / Landing ── */
function renderHome() {
  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: '28px', color: '#8899a6', marginBottom: '12px', letterSpacing: '4px', textTransform: 'uppercase' as const }}>✈️ Travel Journal</div>
        <div style={{ color: '#c9a96e', fontSize: '72px', fontWeight: 700, letterSpacing: '2px' }}>Stampomad</div>
        <div style={{ color: '#8899a6', fontSize: '26px', marginTop: '16px', maxWidth: '700px', textAlign: 'center' as const, lineHeight: 1.5 }}>
          Track every country, map every trip, journal your adventures
        </div>
        <div style={{ display: 'flex', gap: '48px', marginTop: '48px' }}>
          {[
            { emoji: '🗺️', label: 'Interactive Maps' },
            { emoji: '📔', label: 'Trip Journal' },
            { emoji: '📊', label: 'Travel Stats' },
            { emoji: '🌍', label: 'Community' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '36px' }}>{f.emoji}</div>
              <div style={{ color: '#e7e9ea', fontSize: '16px' }}>{f.label}</div>
            </div>
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
      <div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)', padding: '60px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ color: '#c9a96e', fontSize: '32px', fontWeight: 600, letterSpacing: '1px' }}>Stampomad</div>
          <div style={{ color: '#8899a6', fontSize: '20px', marginLeft: '16px' }}>Explore</div>
        </div>
        <div style={{ color: '#e7e9ea', fontSize: '52px', fontWeight: 700, lineHeight: 1.2 }}>
          Discover adventures from
        </div>
        <div style={{ color: '#e7e9ea', fontSize: '52px', fontWeight: 700, lineHeight: 1.2 }}>
          travelers worldwide
        </div>
        <div style={{ color: '#8899a6', fontSize: '22px', marginTop: '12px' }}>
          Browse trips, routes, and travel stories from the community
        </div>
        <div style={{ display: 'flex', gap: '60px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#c9a96e', fontSize: '56px', fontWeight: 700 }}>{countries}</div>
            <div style={{ color: '#8899a6', fontSize: '18px' }}>Countries explored</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#5bbfb5', fontSize: '56px', fontWeight: 700 }}>{trips}</div>
            <div style={{ color: '#8899a6', fontSize: '18px' }}>Trips shared</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#e4756e', fontSize: '56px', fontWeight: 700 }}>{travelers}</div>
            <div style={{ color: '#8899a6', fontSize: '18px' }}>Travelers</div>
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

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)', padding: '60px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ color: '#c9a96e', fontSize: '32px', fontWeight: 600, letterSpacing: '1px' }}>Stampomad</div>
          {author && <div style={{ color: '#8899a6', fontSize: '20px', marginLeft: '16px' }}>by {author}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{ fontSize: '100px', marginRight: '40px' }}>{emoji}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#e7e9ea', fontSize: '52px', fontWeight: 700, lineHeight: 1.2 }}>{name}</div>
            {country && <div style={{ color: '#c9a96e', fontSize: '24px', marginTop: '8px' }}>{country}</div>}
            {cities && <div style={{ color: '#8899a6', fontSize: '22px', marginTop: '4px' }}>📍 {cities}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '60px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#c9a96e', fontSize: '48px', fontWeight: 700 }}>{days}</div>
            <div style={{ color: '#8899a6', fontSize: '18px' }}>Days</div>
          </div>
          {Number(waypoints) > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#5bbfb5', fontSize: '48px', fontWeight: 700 }}>{waypoints}</div>
              <div style={{ color: '#8899a6', fontSize: '18px' }}>Waypoints</div>
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

/* ── Profile (original) ── */
function renderProfile(params: URLSearchParams) {
  const name = params.get('name') || 'Traveler';
  const bio = params.get('bio') || '';
  const countries = params.get('countries') || '0';
  const trips = params.get('trips') || '0';
  const continents = params.get('continents') || '0';
  const avatar = params.get('avatar') || '';

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)', padding: '60px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ color: '#c9a96e', fontSize: '32px', fontWeight: 600, letterSpacing: '1px' }}>Stampomad</div>
          <div style={{ color: '#8899a6', fontSize: '20px', marginLeft: '16px' }}>Travel Journal</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {avatar ? (
            <img src={avatar} width={140} height={140} style={{ borderRadius: '70px', marginRight: '40px', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '140px', height: '140px', borderRadius: '70px', background: '#c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px', color: '#0f1419', fontWeight: 700, marginRight: '40px' }}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#e7e9ea', fontSize: '48px', fontWeight: 600, lineHeight: 1.2 }}>{name}</div>
            {bio && <div style={{ color: '#8899a6', fontSize: '22px', marginTop: '8px', maxWidth: '700px' }}>{bio.substring(0, 100)}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '60px', marginTop: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#c9a96e', fontSize: '48px', fontWeight: 700 }}>{countries}</div>
            <div style={{ color: '#8899a6', fontSize: '18px' }}>Countries</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#5bbfb5', fontSize: '48px', fontWeight: 700 }}>{trips}</div>
            <div style={{ color: '#8899a6', fontSize: '18px' }}>Trips</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#e4756e', fontSize: '48px', fontWeight: 700 }}>{continents}</div>
            <div style={{ color: '#8899a6', fontSize: '18px' }}>Continents</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
