import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Hand, RefreshCw } from 'lucide-react';
import { fetchJson } from '../../lib/api';
import { normalizeWordEntry } from '../../lib/vocabulary';

function WordCard({ word, onClick, accent }) {
  return (
    <button
      onClick={() => onClick(word)}
      style={{
        width: 180,
        borderRadius: 20,
        border: '2px solid rgba(255,255,255,0.22)',
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
        padding: '14px 12px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
        transition: 'transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s ease, border-color 0.18s ease',
        fontFamily: "'Nunito',sans-serif",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px) scale(1.04)';
        e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.38)';
        e.currentTarget.style.borderColor = accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.22)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
      }}
    >
      <div style={{
        width: 94,
        height: 94,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: accent,
        fontSize: 19,
        fontWeight: 900,
        textAlign: 'center',
        lineHeight: 1.1,
        padding: '0 8px',
      }}>
        {word.label}
      </div>
      <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.18em' }}>
        {word.chapter_id}
      </span>
      <span style={{ fontSize: 15, fontWeight: 900, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
        {word.label}
      </span>
    </button>
  );
}

export default function WordPractice() {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    fetchJson('/api/gesture/words')
      .then((data) => {
        if (!active) return;
        setWords(data.map((entry, index) => normalizeWordEntry(entry, index)));
        setError('');
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message || 'Failed to load vocabulary');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const accentColor = useMemo(() => '#6ee7b7', []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Nunito', sans-serif",
      background: 'radial-gradient(ellipse at 18% 0%,#fb923c 0%,#ea580c 20%,#9a3412 50%,#431407 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '20px 32px',
        background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.12)', position: 'relative', zIndex: 2,
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ width: 46, height: 46, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.25)', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ArrowLeft size={20} color="white" />
        </button>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
            Word Practice
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>
            Tap a word to open the camera challenge
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 99, padding: '7px 16px' }}>
          <Hand size={14} color="rgba(255,255,255,0.8)" />
          <span style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.9)' }}>{words.length || '--'} words</span>
        </div>
      </header>

      <main style={{ flex: 1, padding: '32px 36px 48px', position: 'relative', zIndex: 2 }}>
        {loading ? (
          <div style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900 }}>
            Loading vocabulary...
          </div>
        ) : error ? (
          <div style={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fecaca', fontWeight: 900, textAlign: 'center' }}>
            <div>
              <p style={{ margin: '0 0 12px' }}>{error}</p>
              <button onClick={() => window.location.reload()} style={{ border: 'none', borderRadius: 14, padding: '12px 18px', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: 'white', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          </div>
        ) : (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
              <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25))' }} />
              <h2 style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.24em', margin: 0, whiteSpace: 'nowrap' }}>
                100 Words
              </h2>
              <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.25), transparent)' }} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
              {words.map((word) => (
                <WordCard key={word.id} word={word} onClick={(target) => navigate(`/practice/${target.id}`)} accent={accentColor} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}