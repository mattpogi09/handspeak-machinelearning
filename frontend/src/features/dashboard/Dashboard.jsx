import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const profile = JSON.parse(localStorage.getItem('handspeak_profile') || '{}');
  const displayName = profile.nickname || profile.firstName || user?.email || 'Captain';
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || displayName;
  const initials = [profile.firstName?.[0], profile.lastName?.[0]].filter(Boolean).join('').toUpperCase() || displayName[0]?.toUpperCase() || 'C';

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #e3f2fd 0%, #bbdefb 40%, #90caf9 100%)' }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 36px',
        background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.6)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1565c0, #0d47a1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 20, flexShrink: 0,
            boxShadow: '0 4px 16px rgba(21,101,192,0.35)'
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#1565c0', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 2 }}>Student</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#1a2a3a' }}>{fullName}</div>
          </div>
        </div>
        <button onClick={() => navigate('/settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 50,
            background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(21,101,192,0.18)',
            cursor: 'pointer', fontSize: 14, fontWeight: 800, color: '#546e7a',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#1565c0'; e.currentTarget.style.background = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#546e7a'; e.currentTarget.style.background = 'rgba(255,255,255,0.85)'; }}
        >
          <Settings size={17} /> Settings
        </button>
      </header>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 24px 32px' }}>
        {/* Greeting */}
        <h1 style={{ fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 900, fontStyle: 'italic', color: '#1a2a3a', textAlign: 'center', lineHeight: 1.2, margin: '0 0 24px' }}>
          Where to next, Captain?
        </h1>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28, width: '100%', maxWidth: 1020 }}>

          {/* Practice Island Card */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col">
            {/* Illustration */}
            <div style={{ height: 210, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'linear-gradient(180deg, #87ceeb 0%, #4fc3f7 40%, #29b6f6 70%, #0288d1 100%)' }}>
              {/* Sun */}
              <div className="absolute top-5 right-8 w-14 h-14 rounded-full bg-[#fdd835] shadow-[0_0_40px_rgba(253,216,53,0.7)]" />
              {/* Clouds */}
              <div className="absolute top-5 left-6">
                <div className="w-16 h-5 bg-white/60 rounded-full" />
                <div className="w-10 h-4 bg-white/40 rounded-full -mt-2 ml-3" />
              </div>
              <div className="absolute top-10 left-[40%]">
                <div className="w-12 h-4 bg-white/50 rounded-full" />
              </div>
              {/* Island SVG */}
              <svg viewBox="0 0 240 140" width="220" height="130" fill="none" className="relative z-10">
                {/* Water */}
                <ellipse cx="120" cy="128" rx="110" ry="12" fill="#0277bd" opacity="0.3"/>
                {/* Sand base */}
                <ellipse cx="120" cy="115" rx="80" ry="20" fill="#f9a825"/>
                <ellipse cx="120" cy="118" rx="90" ry="16" fill="#fdd835" opacity="0.7"/>
                {/* Sand details */}
                <circle cx="90" cy="115" r="2" fill="#f57f17" opacity="0.4"/>
                <circle cx="140" cy="112" r="1.5" fill="#f57f17" opacity="0.3"/>
                {/* Palm tree trunk */}
                <path d="M115 108 Q112 80 118 50" stroke="#5d4037" strokeWidth="5" strokeLinecap="round" fill="none"/>
                {/* Palm leaves */}
                <path d="M118 52 Q90 35 75 45" stroke="#2e7d32" strokeWidth="3" fill="#43a047" opacity="0.9"/>
                <path d="M118 52 Q130 30 150 38" stroke="#2e7d32" strokeWidth="3" fill="#43a047" opacity="0.9"/>
                <path d="M118 52 Q105 28 88 32" stroke="#388e3c" strokeWidth="2.5" fill="#66bb6a" opacity="0.8"/>
                <path d="M118 52 Q140 38 155 50" stroke="#388e3c" strokeWidth="2.5" fill="#66bb6a" opacity="0.8"/>
                <path d="M118 52 Q118 25 122 18" stroke="#2e7d32" strokeWidth="2" fill="none"/>
                {/* Coconuts */}
                <circle cx="116" cy="54" r="3" fill="#795548"/>
                <circle cx="121" cy="56" r="2.5" fill="#6d4c41"/>
                {/* Small hut */}
                <rect x="135" y="96" width="22" height="18" rx="2" fill="#8d6e63"/>
                <polygon points="133,96 158,96 146,82" fill="#d32f2f"/>
                <rect x="143" y="102" width="6" height="12" fill="#5d4037"/>
                {/* Flag */}
                <line x1="146" y1="82" x2="146" y2="72" stroke="#5d4037" strokeWidth="1.5"/>
                <polygon points="146,72 158,76 146,80" fill="#ff7043"/>
              </svg>
            </div>

            {/* Info */}
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a2a3a', marginBottom: 8 }}>Practice Island</h2>
              <p style={{ fontSize: 14, color: '#78909c', lineHeight: 1.6, marginBottom: 18, flex: 1 }}>
                Practice A–Z letters and 0–9 numbers on the sandy shore.
              </p>
              <button onClick={() => navigate('/practice')}
                style={{
                  width: '100%', padding: '16px 0', borderRadius: 16, border: 'none',
                  background: 'linear-gradient(135deg, #ff8f00, #f57c00)',
                  color: 'white', fontSize: 16, fontWeight: 900, cursor: 'pointer',
                  letterSpacing: '0.04em', boxShadow: '0 4px 16px rgba(245,124,0,0.35)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(245,124,0,0.5)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,124,0,0.35)'}
              >
                Go to Shore
              </button>
            </div>
          </div>

          {/* Study Voyage Card */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col">
            {/* Illustration */}
            <div style={{ height: 210, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'linear-gradient(180deg, #0d1b3e 0%, #1a237e 30%, #1565c0 70%, #1976d2 100%)' }}>
              {/* Stars */}
              {[[12,8],[28,5],[55,12],[72,6],[88,14],[40,18],[65,22],[20,25]].map(([x,y],i) => (
                <div key={i} className="absolute rounded-full bg-white"
                  style={{ left: `${x}%`, top: `${y}%`, width: i%3===0 ? 3 : 2, height: i%3===0 ? 3 : 2, opacity: 0.4 + i*0.06 }} />
              ))}
              {/* Moon */}
              <div className="absolute top-4 left-6">
                <div className="w-10 h-10 rounded-full bg-[#fff9c4] shadow-[0_0_20px_rgba(255,249,196,0.6)]" />
                <div className="w-8 h-8 rounded-full bg-[#1a237e] absolute top-0.5 left-2" />
              </div>
              {/* Lighthouse island */}
              <svg viewBox="0 0 240 140" width="220" height="130" fill="none" className="relative z-10">
                {/* Water */}
                <ellipse cx="120" cy="132" rx="115" ry="10" fill="#0d47a1" opacity="0.4"/>
                {/* Rocky island */}
                <ellipse cx="120" cy="120" rx="70" ry="16" fill="#37474f"/>
                <ellipse cx="120" cy="122" rx="75" ry="12" fill="#455a64" opacity="0.8"/>
                {/* Lighthouse base */}
                <rect x="108" y="55" width="24" height="65" rx="3" fill="#eceff1"/>
                {/* Lighthouse stripes */}
                <rect x="108" y="65" width="24" height="8" fill="#e53935"/>
                <rect x="108" y="85" width="24" height="8" fill="#e53935"/>
                <rect x="108" y="105" width="24" height="8" fill="#e53935"/>
                {/* Lighthouse top */}
                <rect x="105" y="50" width="30" height="8" rx="2" fill="#78909c"/>
                <rect x="112" y="42" width="16" height="10" rx="2" fill="#263238"/>
                {/* Light beam */}
                <polygon points="120,46 80,20 160,20" fill="#fff176" opacity="0.2"/>
                <circle cx="120" cy="46" r="5" fill="#fff176" opacity="0.9"/>
                {/* Small building */}
                <rect x="70" y="108" width="18" height="14" rx="1" fill="#607d8b"/>
                <rect x="76" y="112" width="5" height="10" fill="#37474f"/>
                <polygon points="68,108 89,108 79,98" fill="#455a64"/>
                {/* Dock */}
                <rect x="150" y="116" width="30" height="3" fill="#8d6e63"/>
                <rect x="153" y="116" width="3" height="8" fill="#6d4c41"/>
                <rect x="170" y="116" width="3" height="8" fill="#6d4c41"/>
              </svg>
            </div>

            {/* Info */}
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a2a3a', marginBottom: 8 }}>Study Voyage</h2>
              <p style={{ fontSize: 14, color: '#78909c', lineHeight: 1.6, marginBottom: 18, flex: 1 }}>
                Follow the whale and learn new signs on your deep-sea journey.
              </p>
              <button onClick={() => navigate('/study')}
                style={{
                  width: '100%', padding: '16px 0', borderRadius: 16, border: 'none',
                  background: 'linear-gradient(135deg, #1976d2, #0d47a1)',
                  color: 'white', fontSize: 16, fontWeight: 900, cursor: 'pointer',
                  letterSpacing: '0.04em', boxShadow: '0 4px 16px rgba(21,101,192,0.35)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(21,101,192,0.5)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(21,101,192,0.35)'}
              >
                Start Voyage
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
