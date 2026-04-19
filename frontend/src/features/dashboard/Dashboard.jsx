import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, BookOpen, Trophy, Star, TrendingUp, Award, MessageCircle, ArrowRight, Target } from 'lucide-react';
import { getStoredStudyProgress, getVoyageStats, loadStudyProgress, getCurrentIslandId } from '../study/studyVoyage';
import { useIslands } from '../../contexts/IslandsContext';
import EmojiIcon from '../../components/EmojiIcon';

/* ── floating particle ── */
const Particle = ({ x, y, size, delay, opacity }) => (
  <div style={{
    position: 'absolute', left: `${x}%`, top: `${y}%`,
    width: size, height: size, borderRadius: '50%',
    background: 'rgba(255,255,255,0.55)',
    animation: `particle-float ${4 + delay}s ease-in-out infinite`,
    animationDelay: `${delay}s`, pointerEvents: 'none', opacity,
  }} />
);

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const { islands, getIslandById } = useIslands();
  const profile = user || JSON.parse(localStorage.getItem('handspeak_user') || '{}');
  const displayName = profile.nickname || profile.first_name || profile.email?.split('@')[0] || 'Captain';
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || displayName;
  const initials = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join('').toUpperCase() || displayName[0]?.toUpperCase() || 'C';

  const [progress, setProgress] = useState(() => getStoredStudyProgress());

  useEffect(() => {
    let active = true;
    loadStudyProgress().then((normalized) => {
      if (active) setProgress(normalized);
    });

    return () => {
      active = false;
    };
  }, []);

  const stats = getVoyageStats(progress);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Nunito', sans-serif",
      background: 'radial-gradient(ellipse at 20% -10%, #38bdf8 0%, #0ea5e9 22%, #0369a1 52%, #082f49 80%, #041421 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* background particles */}
      {[
        [8,12,4,0,0.3],[22,5,3,0.8,0.2],[40,18,5,1.5,0.25],[60,8,3,0.4,0.2],
        [75,15,4,1.1,0.3],[88,6,3,0.6,0.18],[15,30,2,2,0.15],[50,35,3,1.8,0.2],
      ].map(([x,y,s,d,o], i) => <Particle key={i} x={x} y={y} size={s} delay={d} opacity={o} />)}

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 36px',
        background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        position: 'relative', zIndex: 10,
      }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg,#34d399,#0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 19, flexShrink: 0,
            boxShadow: '0 4px 18px rgba(52,211,153,0.45)',
            border: '2px solid rgba(255,255,255,0.3)',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 2 }}>Student</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'white', textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>{fullName}</div>
          </div>
        </div>

        {/* XP pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(251,191,36,0.18)', border: '1.5px solid rgba(251,191,36,0.4)',
          borderRadius: 99, padding: '7px 16px',
          boxShadow: '0 4px 14px rgba(251,191,36,0.2)',
        }}>
          <Star size={14} fill="#fbbf24" color="#fbbf24" />
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fde68a' }}>{stats.xp} XP</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>· Lv.{stats.playerLevel}</span>
        </div>

        {/* Settings */}
        <button onClick={() => navigate('/settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 50,
            background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)',
            backdropFilter: 'blur(8px)',
            cursor: 'pointer', fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.85)',
            transition: 'all 0.2s', fontFamily: "'Nunito',sans-serif",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
        >
          <Settings size={15} /> Settings
        </button>
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 48px', position: 'relative', zIndex: 2 }}>

        {/* greeting */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em' }}>
            {greeting()}, {displayName}
          </p>
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 900,
            color: 'white', margin: '6px 0 0',
            textShadow: '0 2px 20px rgba(0,0,0,0.4)',
            letterSpacing: '-0.02em', lineHeight: 1.15,
          }}>
            Where to next, Captain?
          </h1>
        </div>

        {/* ── stats row ── */}
        <div style={{
          display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
          marginBottom: 44,
        }}>
          {[
            { icon: <Trophy size={16} color="#fbbf24" />, label: 'Islands Cleared', value: `${stats.completedIslands}/${stats.totalIslands}`, accent: '#fbbf24' },
            { icon: <BookOpen size={16} color="#34d399" />, label: 'Phrase Levels', value: `${stats.completedPhraseLevels}/${stats.totalPhraseLevels}`, accent: '#34d399' },
            { icon: <TrendingUp size={16} color="#60a5fa" />, label: 'Player Level', value: `Lv. ${stats.playerLevel}`, accent: '#60a5fa' },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
              border: '1.5px solid rgba(255,255,255,0.18)',
              borderRadius: 50, padding: '8px 18px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            }}>
              {s.icon}
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: s.accent, lineHeight: 1.1 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Unified Islands CTA ── */}
        <div style={{
          width: '100%', maxWidth: 760,
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)',
          border: '2px solid rgba(255,255,255,0.2)', borderRadius: 28,
          padding: '26px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(52,211,153,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={24} color="#34d399" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>Your Journey</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>Continue to the Islands</div>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 14.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.6 }}>
            Every island has three modes — <strong>Learn</strong> the signs, <strong>Drill</strong> them for recall,
            and <strong>Converse</strong> with NPC prompts. New to HandSpeak? Start at Island 1.
          </p>

          {(() => {
            const currentIslandId = getCurrentIslandId(progress);
            const currentIsland = getIslandById(currentIslandId);
            if (!currentIsland) return null;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ color: 'rgba(255,255,255,0.9)' }}>
                  <EmojiIcon emoji={currentIsland.icon} size={28} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Next up</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: 'white' }}>{currentIsland.title}</div>
                </div>
                {currentIslandId === 'greetings' && (
                  <span style={{ fontSize: 10, fontWeight: 900, color: '#6ee7b7', background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.4)', padding: '3px 8px', borderRadius: 99, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    <MessageCircle size={9} style={{ display: 'inline', marginRight: 4 }} />
                    Reply Quest ready
                  </span>
                )}
              </div>
            );
          })()}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/islands')}
              style={{
                flex: '1 1 260px', padding: '16px 22px', borderRadius: 18, border: 'none',
                background: 'linear-gradient(135deg,#34d399,#22d3ee)', color: '#064e3b',
                fontSize: 16, fontWeight: 900, cursor: 'pointer',
                letterSpacing: '0.04em', boxShadow: '0 10px 30px rgba(52,211,153,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontFamily: "'Nunito',sans-serif", transition: 'transform 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Enter the Islands <ArrowRight size={17} />
            </button>
            <button onClick={() => navigate('/practice')}
              style={{
                flex: '0 0 auto', padding: '16px 20px', borderRadius: 18, border: '1.5px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.1)', color: 'white',
                fontSize: 14, fontWeight: 900, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: "'Nunito',sans-serif",
              }}
            >
              <Target size={15} /> Free Drill
            </button>
          </div>
        </div>

        {/* ── achievement strip ── */}
        {stats.xp > 0 && (
          <div style={{
            marginTop:36, width:'100%', maxWidth:1060,
            background:'rgba(255,255,255,0.07)', backdropFilter:'blur(10px)',
            border:'1.5px solid rgba(255,255,255,0.15)',
            borderRadius:22, padding:'16px 24px',
            display:'flex', alignItems:'center', gap:16, flexWrap:'wrap',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Award size={18} color="#fbbf24" />
              <span style={{ fontSize:14, fontWeight:800, color:'white' }}>Your Journey</span>
            </div>
            <div style={{ height:32, width:1, background:'rgba(255,255,255,0.15)' }} />
            {islands.slice(0,stats.completedIslands).map(island => (
              <div key={island.id} style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.4)', borderRadius:99, padding:'4px 12px' }}>
                <Star size={11} fill="#34d399" color="#34d399" />
                <span style={{ fontSize:12, fontWeight:800, color:'#34d399' }}>{island.title}</span>
              </div>
            ))}
            {stats.completedIslands === 0 && (
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.5)', fontWeight:700 }}>Start exploring to earn badges!</span>
            )}
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');
        @keyframes particle-float { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-18px) scale(1.2)} }
        @keyframes star-twinkle { 0%,100%{opacity:0.35} 50%{opacity:0.9} }
      `}</style>
    </div>
  );
}
