import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Hand } from 'lucide-react';
import { ALPHABET, NUMBERS } from '../../data/aslData';

/*
  ASL fingerspelling images from a reliable public CDN.
  We use the Lifeprint / asl.ms image set which is publicly accessible.
  Pattern: https://www.lifeprint.com/asl101/gifs-animated/{letter}.gif
  For numbers we use hand gesture images from the same source.
*/
const ASL_IMG_BASE = 'https://www.lifeprint.com/asl101/fingerspelling/abc-gifs';

/*
  Build image URL for a sign label.
  Letters: /a.gif, /b.gif … /z.gif
  Numbers: we use a separate small SVG or fallback to text since lifeprint
  doesn't have a clean number CDN path — we'll show a styled number card.
*/
const getLetterImg = (label) =>
  `${ASL_IMG_BASE}/${label.toLowerCase()}.gif`;

/* Individual sign button card */
function SignCard({ sign, onClick, accent }) {
  const [imgOk, setImgOk] = useState(true);
  const isLetter = sign.type === 'alphabet';

  return (
    <button
      onClick={() => onClick(sign)}
      style={{
        width: isLetter ? 102 : 96,
        borderRadius: 20,
        border: '2px solid rgba(255,255,255,0.22)',
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
        padding: '10px 8px 12px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
        transition: 'transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s ease, border-color 0.18s ease',
        fontFamily: "'Nunito',sans-serif",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-6px) scale(1.04)';
        e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.38)';
        e.currentTarget.style.borderColor = accent;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.22)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
      }}
    >
      {/* ASL hand image or fallback */}
      <div style={{
        width: isLetter ? 68 : 60, height: isLetter ? 68 : 60,
        borderRadius: 14, overflow: 'hidden',
        background: 'rgba(255,255,255,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isLetter && imgOk ? (
          <img
            src={getLetterImg(sign.label)}
            alt={`ASL ${sign.label}`}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={() => setImgOk(false)}
          />
        ) : (
          /* fallback — big styled character */
          <span style={{ fontSize: 28, fontWeight: 900, color: accent, lineHeight: 1 }}>
            {sign.label}
          </span>
        )}
      </div>

      {/* label */}
      <span style={{
        fontSize: 16, fontWeight: 900, color: 'white',
        textShadow: '0 1px 4px rgba(0,0,0,0.4)', letterSpacing: '0.02em',
      }}>
        {sign.label}
      </span>
    </button>
  );
}

export default function Practice() {
  const navigate = useNavigate();
  const openSign = (sign) => navigate(`/practice/${sign.type}/${sign.id}`);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      fontFamily: "'Nunito', sans-serif",
      background: 'radial-gradient(ellipse at 18% 0%,#fb923c 0%,#ea580c 20%,#9a3412 50%,#431407 100%)',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* subtle dot overlay */}
      {[10,25,40,55,70,85,92,18,60,78].map((x,i) => (
        <div key={i} style={{
          position:'absolute', left:`${x}%`, top:`${5+(i*9)%30}%`,
          width: i%3===0?4:2.5, height: i%3===0?4:2.5, borderRadius:'50%',
          background:'rgba(255,255,255,0.2)', pointerEvents:'none',
        }} />
      ))}

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '20px 32px',
        background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        position: 'relative', zIndex: 2,
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            width: 46, height: 46, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ArrowLeft size={20} color="white" />
        </button>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
            Sandy Shores
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>
            Tap any sign to practise with your camera
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 99, padding: '7px 16px' }}>
          <Hand size={14} color="rgba(255,255,255,0.8)" />
          <span style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.9)' }}>{ALPHABET.length + NUMBERS.length} signs</span>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, padding: '32px 36px 48px', position: 'relative', zIndex: 2 }}>

        {/* ── Alphabet Section ── */}
        <section style={{ marginBottom: 44 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <div style={{
              height: 1, flex: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25))',
            }} />
            <h2 style={{
              fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase', letterSpacing: '0.24em', margin: 0,
              whiteSpace: 'nowrap',
            }}>
              Alphabet  ·  A – Z
            </h2>
            <div style={{
              height: 1, flex: 1,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.25), transparent)',
            }} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
            {ALPHABET.map((sign) => (
              <SignCard key={sign.id} sign={sign} onClick={openSign} accent="#fb923c" />
            ))}
          </div>
        </section>

        {/* ── Numbers Section ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25))' }} />
            <h2 style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.24em', margin: 0, whiteSpace: 'nowrap' }}>
              Numbers  ·  0 – 9
            </h2>
            <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.25), transparent)' }} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
            {NUMBERS.map((sign) => (
              <SignCard key={sign.id} sign={sign} onClick={openSign} accent="#60a5fa" />
            ))}
          </div>
        </section>
      </main>

      {/* ── bottom wave ── */}
      <div style={{ pointerEvents: 'none', flexShrink: 0 }}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width: '100%', height: 60, display: 'block' }}>
          <path fill="rgba(255,255,255,0.07)" d="M0,40 C200,10 400,65 720,30 C1000,0 1240,55 1440,25 L1440,80 L0,80Z"/>
          <path fill="rgba(255,255,255,0.04)" d="M0,55 C300,35 600,70 900,45 C1100,28 1300,62 1440,45 L1440,80 L0,80Z"/>
        </svg>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');
      `}</style>
    </div>
  );
}
