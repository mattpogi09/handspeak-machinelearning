import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Play, CheckCircle2 } from 'lucide-react';
import { STUDY_TOPICS } from '../../data/aslData';

/* ── Cute Whale SVG ── */
function WhaleSvg() {
  return (
    <svg viewBox="0 0 110 80" width="80" height="58" fill="none">
      {/* Tail flukes — horizontal, left side */}
      <path d="M20,36 C8,24 0,14 0,8 C6,16 14,26 22,34Z" fill="#3A7BC8"/>
      <path d="M20,44 C8,56 0,66 0,72 C6,64 14,54 22,46Z" fill="#3A7BC8"/>
      <ellipse cx="18" cy="40" rx="8" ry="5" fill="#4A8BC2"/>
      {/* Body */}
      <ellipse cx="60" cy="46" rx="44" ry="26" fill="#5B9BD5"/>
      {/* Belly */}
      <ellipse cx="57" cy="58" rx="31" ry="13" fill="#A8D4F0"/>
      {/* Head — round, right */}
      <circle cx="90" cy="44" r="21" fill="#5B9BD5"/>
      {/* Eye */}
      <circle cx="97" cy="37" r="6" fill="white"/>
      <circle cx="98" cy="36" r="3.2" fill="#111827"/>
      <circle cx="100" cy="34" r="1.4" fill="white"/>
      {/* Smile */}
      <path d="M82,54 Q90,62 103,57" stroke="#3A7BC8" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Blowhole */}
      <ellipse cx="77" cy="25" rx="5" ry="3" fill="#3A7BC8"/>
      {/* Spout — fan/cloud shape (single closed path, NOT separate lines) */}
      <path d="M72,24 Q60,8 67,2 Q72,8 77,15 Q82,8 87,2 Q94,8 82,24Z"
        fill="#B3E5FC" opacity="0.9"/>
      {/* Water droplets at top of fan */}
      <circle cx="66" cy="4" r="2.8" fill="#87CEEB" opacity="0.9"/>
      <circle cx="77" cy="1" r="2.2" fill="#B3E5FC" opacity="0.9"/>
      <circle cx="88" cy="4" r="2.5" fill="#87CEEB" opacity="0.9"/>
      {/* Flipper */}
      <path d="M58,66 Q68,78 78,72 Q74,62 62,60Z" fill="#4A8BC2"/>
    </svg>
  );
}

export default function Study() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState({ completed_topics: [], level: 1 });

  useEffect(() => {
    const stored = localStorage.getItem('handspeak_study_progress');
    if (stored) setProgress(JSON.parse(stored));
  }, []);

  const isUnlocked = (topic, idx) => {
    if (idx === 0) return true;
    const prev = STUDY_TOPICS[idx - 1];
    return progress.completed_topics.includes(prev.id);
  };

  const openTopic = (topic) => navigate(`/study/${topic.id}`);
  const progressPercent = Math.min(100, (progress.completed_topics.length / STUDY_TOPICS.length) * 100);

  // Whale sits above: the last-completed node, or above node 0 if nothing completed yet
  const whaleNodeIdx = progress.completed_topics.length > 0
    ? Math.min(progress.completed_topics.length - 1, STUDY_TOPICS.length - 1)
    : 0;

  return (
    <div className="min-h-screen flex flex-col text-white"
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d2b52 25%, #134477 50%, #1565c0 80%, #1976d2 100%)' }}>

      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 28px', flexShrink: 0 }}>
        <button onClick={() => navigate('/dashboard')}
          style={{
            width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >
          <ArrowLeft size={22} color="white" />
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'white', flex: 1, margin: 0, whiteSpace: 'nowrap' }}>Deep Dive Study</h1>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          background: 'rgba(255,255,255,0.12)', borderRadius: 50, padding: '10px 18px'
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap' }}>Level {progress.level}</span>
          <div style={{ width: 90, height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.2)', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ height: '100%', borderRadius: 99, background: '#00bfa5', width: `${progressPercent}%`, transition: 'width 0.7s' }} />
          </div>
        </div>
      </header>

      {/* ── Island / Lighthouse Illustration ── */}
      <div className="relative flex justify-center items-end overflow-hidden flex-shrink-0" style={{ height: 190 }}>
        {[[8,12],[18,8],[32,18],[52,6],[68,14],[82,10],[90,22],[45,25]].map(([x,y],i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{ left:`${x}%`, top:`${y}%`, width: i%3===0?3:2, height: i%3===0?3:2, opacity: 0.3+i*0.05 }} />
        ))}
        <svg viewBox="0 0 320 170" width="300" height="160" fill="none" className="relative z-10">
          <ellipse cx="160" cy="162" rx="155" ry="12" fill="#0d47a1" opacity="0.3"/>
          <ellipse cx="160" cy="148" rx="90" ry="20" fill="#37474f"/>
          <ellipse cx="160" cy="152" rx="100" ry="15" fill="#455a64" opacity="0.7"/>
          <rect x="145" y="55" width="30" height="92" rx="3" fill="#eceff1"/>
          <rect x="145" y="68" width="30" height="10" fill="#e53935"/>
          <rect x="145" y="90" width="30" height="10" fill="#e53935"/>
          <rect x="145" y="112" width="30" height="10" fill="#e53935"/>
          <rect x="141" y="48" width="38" height="10" rx="2" fill="#78909c"/>
          <rect x="149" y="37" width="22" height="13" rx="3" fill="#263238"/>
          <polygon points="160,43 100,12 220,12" fill="#fff176" opacity="0.15"/>
          <circle cx="160" cy="43" r="6" fill="#fff176" opacity="0.8"/>
          <rect x="88" y="133" width="24" height="17" rx="2" fill="#607d8b"/>
          <rect x="96" y="138" width="7" height="12" fill="#37474f"/>
          <polygon points="85,133 115,133 100,120" fill="#546e7a"/>
          <rect x="195" y="142" width="40" height="4" fill="#8d6e63"/>
          <rect x="200" y="142" width="4" height="10" fill="#6d4c41"/>
          <rect x="225" y="142" width="4" height="10" fill="#6d4c41"/>
          <circle cx="80" cy="128" r="10" fill="#2e7d32" opacity="0.7"/>
          <circle cx="72" cy="131" r="8" fill="#388e3c" opacity="0.6"/>
          <rect x="78" y="128" width="3" height="11" fill="#5d4037"/>
          <line x1="160" y1="37" x2="160" y2="26" stroke="#5d4037" strokeWidth="2"/>
          <polygon points="160,26 174,31 160,36" fill="#ff7043"/>
        </svg>
      </div>

      {/* ── Topic Path ── */}
      <div className="flex-1 flex items-center justify-center overflow-x-auto" style={{ padding: '8px 24px 24px' }}>
        <div className="flex items-end" style={{ gap: 0 }}>
          {STUDY_TOPICS.map((topic, idx) => {
            const unlocked = isUnlocked(topic, idx);
            const completed = progress.completed_topics.includes(topic.id);
            const isCurrent = unlocked && !completed;
            const showWhale = idx === whaleNodeIdx;

            return (
              <div key={topic.id} className="flex items-end">
                {/* Connector line */}
                {idx > 0 && (
                  <div style={{
                    width: 48, height: 3, marginBottom: 34, borderRadius: 99,
                    background: completed ? '#00bfa5' : 'rgba(255,255,255,0.18)'
                  }} />
                )}

                {/* Node column */}
                <div className="flex flex-col items-center" style={{ minWidth: 88 }}>
                  {/* Whale above its node */}
                  {showWhale ? (
                    <div style={{ animation: 'whale-bob 3s ease-in-out infinite', marginBottom: 4 }}>
                      <WhaleSvg />
                    </div>
                  ) : (
                    <div style={{ height: 62 }} />
                  )}

                  {/* START badge */}
                  {isCurrent && (
                    <span style={{
                      background: '#00bfa5', color: 'white', fontSize: 10, fontWeight: 900,
                      padding: '3px 12px', borderRadius: 99, letterSpacing: '0.15em',
                      textTransform: 'uppercase', marginBottom: 6, display: 'block'
                    }}>
                      Start
                    </span>
                  )}
                  {!isCurrent && <div style={{ height: 20 }} />}

                  {/* Topic button */}
                  <button
                    onClick={() => unlocked && openTopic(topic)}
                    disabled={!unlocked}
                    style={{
                      width: isCurrent ? 70 : 64, height: isCurrent ? 70 : 64,
                      borderRadius: '50%', border: 'none', cursor: unlocked ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 6px 24px rgba(0,0,0,0.22)', transition: 'all 0.15s',
                      background: completed ? '#00bfa5' : isCurrent ? '#ffffff' : 'rgba(255,255,255,0.12)',
                      opacity: !unlocked ? 0.4 : 1,
                      outline: isCurrent ? '4px solid rgba(255,255,255,0.4)' : 'none',
                    }}
                  >
                    {completed && <CheckCircle2 size={26} color="white" />}
                    {isCurrent && <Play size={24} fill="#1a73e8" color="#1a73e8" style={{ marginLeft: 3 }} />}
                    {!unlocked && <Lock size={20} color="rgba(255,255,255,0.5)" />}
                  </button>

                  {/* Label */}
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
                    textAlign: 'center', marginTop: 10, lineHeight: 1.3,
                    maxWidth: 84, display: 'block'
                  }}>
                    {topic.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes whale-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }`}</style>
    </div>
  );
}
