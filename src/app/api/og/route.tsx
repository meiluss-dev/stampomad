import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || 'Traveler';
  const bio = searchParams.get('bio') || '';
  const countries = searchParams.get('countries') || '0';
  const trips = searchParams.get('trips') || '0';
  const continents = searchParams.get('continents') || '0';
  const avatar = searchParams.get('avatar') || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)',
          padding: '60px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ color: '#c9a96e', fontSize: '32px', fontWeight: 600, letterSpacing: '1px' }}>
            Stampomad
          </div>
          <div style={{ color: '#8899a6', fontSize: '20px', marginLeft: '16px' }}>
            Travel Journal
          </div>
        </div>

        {/* Profile */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {avatar ? (
            <img
              src={avatar}
              width={140}
              height={140}
              style={{ borderRadius: '70px', marginRight: '40px', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '140px',
                height: '140px',
                borderRadius: '70px',
                background: '#c9a96e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '60px',
                color: '#0f1419',
                fontWeight: 700,
                marginRight: '40px',
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#e7e9ea', fontSize: '48px', fontWeight: 600, lineHeight: 1.2 }}>
              {name}
            </div>
            {bio && (
              <div style={{ color: '#8899a6', fontSize: '22px', marginTop: '8px', maxWidth: '700px' }}>
                {bio.substring(0, 100)}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
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
    { width: 1200, height: 630 }
  );
}
