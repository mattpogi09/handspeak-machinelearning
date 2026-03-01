import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ALPHABET, NUMBERS } from '../../data/aslData';

export default function Practice() {
  const navigate = useNavigate();
  const openSign = (sign) => navigate(`/practice/${sign.type}/${sign.id}`);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #fce4b8 0%, #f5d6a0 30%, #e8c88a 60%, #dbb978 100%)' }}>

      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '24px 32px 20px' }}>
        <button onClick={() => navigate('/dashboard')} style={{
          width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
          boxShadow: '0 2px 12px rgba(0,0,0,0.14)', transition: 'background 0.2s'
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#fff'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.85)'}
        >
          <ArrowLeft size={22} color="#5d4037" />
        </button>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#3e2723', margin: 0 }}>Sandy Shores</h1>
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 0 48px' }}>

        {/* Alphabet Section */}
        <section style={{ marginBottom: 48, padding: '0 32px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, color: '#bf360c', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 24, textAlign: 'center' }}>Alphabet</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
            {ALPHABET.map((sign) => (
              <button key={sign.id} onClick={() => openSign(sign)} style={{
                width: 76, height: 76, borderRadius: 18, border: 'none', cursor: 'pointer',
                background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 900, color: '#e65100',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', transition: 'all 0.15s'
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; }}
              >
                {sign.label}
              </button>
            ))}
          </div>
        </section>

        {/* Numbers Section */}
        <section style={{ padding: '0 32px' }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, color: '#bf360c', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 24, textAlign: 'center' }}>Numbers</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
            {NUMBERS.map((sign) => (
              <button key={sign.id} onClick={() => openSign(sign)} style={{
                width: 76, height: 76, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 900, color: '#1565c0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', transition: 'all 0.15s'
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; }}
              >
                {sign.label}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* ── Sandy wave bottom decoration ── */}
      <div style={{ pointerEvents: 'none' }}>
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ width: '100%', height: 80, display: 'block' }}>
          <path fill="#c9a96e" opacity="0.4" d="M0,40 C200,80 400,10 600,50 C800,90 1000,20 1200,60 C1350,80 1420,40 1440,50 L1440,120 L0,120Z" />
          <path fill="#1565c0" opacity="0.3" d="M0,70 C240,50 480,100 720,60 C960,30 1200,80 1440,55 L1440,120 L0,120Z" />
          <path fill="#0d47a1" opacity="0.2" d="M0,90 C300,80 600,110 900,85 C1100,70 1300,100 1440,80 L1440,120 L0,120Z" />
        </svg>
      </div>
    </div>
  );
}
