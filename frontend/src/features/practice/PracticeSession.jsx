import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Circle, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import Camera from '../../components/Camera';
import { loadPracticeSigns } from './practiceApi';

const ASL_IMG_BASE = 'https://www.lifeprint.com/asl101/fingerspelling/abc-gifs';

export default function PracticeSession() {
  const { type, signId } = useParams();
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const [alphabet, setAlphabet] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    loadPracticeSigns()
      .then(({ alphabet: alphabetSigns, numbers: numberSigns }) => {
        if (!active) return;
        setAlphabet(alphabetSigns);
        setNumbers(numberSigns);
        setError('');
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message || 'Unable to load practice signs');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signs = useMemo(() => {
    if (type === 'alphabet') return alphabet;
    if (type === 'number') return numbers;
    return [];
  }, [type, alphabet, numbers]);
  const currentIndex = signs.findIndex((s) => s.id === signId);
  const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;
  const currentSign = signs[resolvedIndex] || null;

  const goTo = useCallback((idx) => {
    setImgOk(true);
    const s = signs[Math.max(0, Math.min(signs.length - 1, idx))];
    navigate(`/practice/${type}/${s.id}`, { replace: true });
  }, [signs, type, navigate]);

  const handleClose = useCallback(() => navigate('/practice'), [navigate]);

  const imgSrc = type === 'alphabet'
    ? `${ASL_IMG_BASE}/${currentSign.label.toLowerCase()}.gif`
    : null; // numbers use fallback

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#041524', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        Loading practice sign...
      </div>
    );
  }

  if (error || !currentSign) {
    return (
      <div style={{ minHeight: '100vh', background: '#041524', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: 20, fontWeight: 900, margin: '0 0 12px' }}>{error || 'Practice sign not found.'}</p>
          <button onClick={handleClose}
            style={{ border: 'none', borderRadius: 14, padding: '12px 20px', cursor: 'pointer', fontWeight: 900, fontSize: 15, background: 'linear-gradient(135deg,#34d399,#22d3ee)', color: '#064e3b', fontFamily: "'Nunito',sans-serif" }}>
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(2,10,28,0.88)', backdropFilter: 'blur(10px)',
      padding: 20, fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{
        position: 'relative', background: '#0d2240', borderRadius: 28,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
        width: '100%', maxWidth: 960, maxHeight: 'calc(100vh - 40px)',
        overflow: 'hidden', display: 'flex', flexDirection: 'row',
        animation: 'modal-enter 0.3s ease-out',
      }}>

        {/* ── Close ── */}
        <button onClick={handleClose}
          style={{
            position: 'absolute', top: 16, right: 16, zIndex: 10,
            width: 42, height: 42, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.22)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.45)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <X size={18} color="white" />
        </button>

        {/* ── Camera (left) ── */}
        <div style={{
          flex: 1, background: '#050d18', position: 'relative',
          borderRadius: '28px 0 0 28px', overflow: 'hidden', minHeight: 500,
        }}>
          <Camera />

          {/* recording indicator */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            background: recording ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)', borderRadius: 99,
            padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'background 0.3s',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: recording ? 'white' : '#ef4444',
              animation: recording ? 'rec-blink 1s ease-in-out infinite' : undefined,
            }} />
            <span style={{ fontSize: 11, fontWeight: 900, color: 'white', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {recording ? 'Recording' : 'Camera'}
            </span>
          </div>

          {/* prev / next nav on camera */}
          <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => goTo(resolvedIndex - 1)}
              disabled={resolvedIndex <= 0}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: resolvedIndex <= 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.3)',
                cursor: resolvedIndex <= 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: resolvedIndex <= 0 ? 0.45 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (resolvedIndex > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = resolvedIndex <= 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'; }}
            >
              <ChevronLeft size={20} color="white" />
            </button>

            {/* record button */}
            <button onClick={() => setRecording(!recording)}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                border: `5px solid ${recording ? '#ef4444' : 'rgba(255,255,255,0.85)'}`,
                background: recording ? '#ef4444' : 'white',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: recording ? '0 0 0 8px rgba(239,68,68,0.22), 0 6px 28px rgba(0,0,0,0.5)' : '0 6px 28px rgba(0,0,0,0.5)',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
              <Circle size={30} fill={recording ? 'white' : '#e63946'} color={recording ? 'white' : '#e63946'} />
            </button>

            <button
              onClick={() => goTo(resolvedIndex + 1)}
              disabled={resolvedIndex >= signs.length - 1}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: resolvedIndex >= signs.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.3)',
                cursor: resolvedIndex >= signs.length - 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: resolvedIndex >= signs.length - 1 ? 0.45 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (resolvedIndex < signs.length - 1) e.currentTarget.style.background = 'rgba(255,255,255,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = resolvedIndex >= signs.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'; }}
            >
              <ChevronRight size={20} color="white" />
            </button>
          </div>
        </div>

        {/* ── Info panel (right) ── */}
        <div style={{
          width: 340, flexShrink: 0,
          background: 'linear-gradient(180deg,#0f2a54 0%,#091a38 100%)',
          display: 'flex', flexDirection: 'column',
          padding: '28px 22px 20px', gap: 14, overflowY: 'auto',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
        }}>

          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              Practice Target
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>
              {resolvedIndex + 1} / {signs.length}
            </span>
          </div>

          {/* big letter */}
          <div style={{
            fontSize: 88, fontWeight: 900, lineHeight: 1,
            textAlign: 'center', padding: '2px 0',
            background: 'linear-gradient(135deg,#34d399,#22d3ee)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            textShadow: 'none',
          }}>
            {currentSign.label}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

          {/* ── ASL HAND GESTURE IMAGE ── */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
              Hand Gesture Reference
            </p>
            <div style={{
              borderRadius: 18, overflow: 'hidden',
              background: 'rgba(255,255,255,0.95)',
              border: '2px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 170, flexShrink: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              {imgSrc && imgOk ? (
                <img
                  key={currentSign.id}
                  src={imgSrc}
                  alt={`ASL sign for ${currentSign.label}`}
                  style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
                  onError={() => setImgOk(false)}
                />
              ) : (
                /* fallback: large styled character */
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 72, fontWeight: 900, color: '#0ea5e9', lineHeight: 1 }}>
                    {currentSign.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 6 }}>
                    ASL · {type === 'alphabet' ? 'Letter' : 'Number'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* description */}
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, margin: 0 }}>
            {currentSign.description}
          </p>

          {/* tip */}
          <div style={{
            background: 'rgba(59,130,246,0.15)', border: '1.5px solid rgba(96,165,250,0.35)',
            borderRadius: 16, padding: '12px 14px',
            fontSize: 13, color: '#93c5fd', lineHeight: 1.6, flexShrink: 0,
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <Lightbulb size={15} color="#93c5fd" style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Tip:</strong> {currentSign.tip}</span>
          </div>

          {/* sign progress dots */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', flexShrink: 0 }}>
            {signs.map((s, i) => (
              <button key={s.id}
                onClick={() => goTo(i)}
                style={{
                  width: i === currentIndex ? 22 : 8, height: 8, borderRadius: 99,
                  background: i === currentIndex ? 'linear-gradient(90deg,#34d399,#22d3ee)' : 'rgba(255,255,255,0.2)',
                  border: 'none', cursor: 'pointer', padding: 0,
                  boxShadow: i === currentIndex ? '0 0 8px rgba(52,211,153,0.7)' : 'none',
                  transition: 'all 0.25s ease', flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes rec-blink { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes modal-enter { 0%{opacity:0;transform:scale(0.92) translateY(20px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
}
