import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, BookOpen, Hand, Trophy, Zap, Star, TrendingUp, Award } from 'lucide-react';
import { getStoredStudyProgress, getVoyageStats, STUDY_ISLANDS } from '../study/studyVoyage';

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
  const profile = JSON.parse(localStorage.getItem('handspeak_profile') || '{}');
  const displayName = profile.nickname || profile.firstName || user?.email?.split('@')[0] || 'Captain';
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || displayName;
  const initials = [profile.firstName?.[0], profile.lastName?.[0]].filter(Boolean).join('').toUpperCase() || displayName[0]?.toUpperCase() || 'C';

  const [progress] = useState(() => getStoredStudyProgress());
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

        {/* ── mode cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 28, width: '100%', maxWidth: 1060,
        }}>

          {/* ── Practice Island Card ── */}
          <div style={{
            borderRadius: 28, overflow: 'hidden',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
            border: '2px solid rgba(255,255,255,0.18)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'default',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 28px 72px rgba(0,0,0,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.35)'; }}
          >
            {/* illustration */}
            <div style={{ height: 220, position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg,#87ceeb 0%,#4fc3f7 45%,#29b6f6 75%,#0288d1 100%)' }}>
              {/* sun */}
              <div style={{ position: 'absolute', top: 22, right: 34, width: 54, height: 54, borderRadius: '50%', background: 'radial-gradient(circle,#ffe082,#fdd835)', boxShadow: '0 0 40px rgba(253,216,53,0.8)' }} />
              {/* rays */}
              {[0,45,90,135,180,225,270,315].map((deg, i) => (
                <div key={i} style={{
                  position: 'absolute', top: 46, right: 58,
                  width: 26, height: 2, borderRadius: 1, background: 'rgba(253,216,53,0.4)',
                  transformOrigin: 'left center', transform: `rotate(${deg}deg)`,
                }} />
              ))}
              {/* clouds */}
              {[{l:'8%',t:'16%',w:70},{l:'35%',t:'10%',w:50}].map((c,i) => (
                <div key={i} style={{ position:'absolute', left:c.l, top:c.t, width:c.w, height:22, background:'rgba(255,255,255,0.65)', borderRadius:99, filter:'blur(1px)' }} />
              ))}
              {/* island SVG */}
              <svg viewBox="0 0 280 150" width="100%" height="150" style={{ position:'absolute', bottom:0, left:0 }} fill="none">
                <ellipse cx="140" cy="138" rx="120" ry="13" fill="#0277bd" opacity="0.3"/>
                <ellipse cx="140" cy="125" rx="96" ry="22" fill="#f9a825"/>
                <ellipse cx="140" cy="128" rx="105" ry="17" fill="#fdd835" opacity="0.65"/>
                {/* palm trunk */}
                <path d="M132 118 Q128 90 136 55" stroke="#5d4037" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
                {/* leaves */}
                <path d="M136 57 Q108 38 90 50" stroke="#2e7d32" strokeWidth="3.5" fill="#43a047" opacity="0.95"/>
                <path d="M136 57 Q150 32 172 42" stroke="#2e7d32" strokeWidth="3.5" fill="#43a047" opacity="0.95"/>
                <path d="M136 57 Q120 30 100 35" stroke="#388e3c" strokeWidth="3" fill="#66bb6a" opacity="0.85"/>
                <path d="M136 57 Q156 42 168 55" stroke="#388e3c" strokeWidth="3" fill="#66bb6a" opacity="0.85"/>
                {/* coconuts */}
                <circle cx="134" cy="60" r="3.5" fill="#795548"/>
                <circle cx="139" cy="62" r="3" fill="#6d4c41"/>
                {/* hut */}
                <rect x="162" y="105" width="26" height="20" rx="2" fill="#8d6e63"/>
                <polygon points="158,105 190,105 174,88" fill="#c62828"/>
                <rect x="170" y="112" width="8" height="13" fill="#4e342e"/>
                <line x1="174" y1="88" x2="174" y2="76" stroke="#5d4037" strokeWidth="2"/>
                <polygon points="174,76 188,81 174,86" fill="#ff7043"/>
                {/* wave bottom */}
                <path d="M0 138 C70 128,140 148,210 135 C245 128,265 142,280 136 L280 150 L0 150Z" fill="#0288d1" opacity="0.5"/>
              </svg>
              {/* overlay label */}
              <div style={{ position:'absolute', top:14, left:16, background:'rgba(255,140,0,0.9)', backdropFilter:'blur(4px)', borderRadius:99, padding:'5px 14px', display:'flex', alignItems:'center', gap:6 }}>
                <Hand size={13} color="white" />
                <span style={{ fontSize:11, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:'0.12em' }}>100 Words</span>
              </div>
            </div>

            {/* info */}
            <div style={{ padding:'22px 26px 26px', flex:1, display:'flex', flexDirection:'column' }}>
              <h2 style={{ fontSize:22, fontWeight:900, color:'white', margin:'0 0 8px', textShadow:'0 1px 6px rgba(0,0,0,0.3)' }}>Word Practice</h2>
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.7)', lineHeight:1.6, margin:'0 0 20px', flex:1 }}>
                Practice the 100 target words with real-time camera feedback and model-based verification.
              </p>
              <button onClick={() => navigate('/practice')}
                style={{
                  width:'100%', padding:'15px 0', borderRadius:16, border:'none',
                  background:'linear-gradient(135deg,#fb923c,#ea580c)',
                  color:'white', fontSize:16, fontWeight:900, cursor:'pointer',
                  letterSpacing:'0.04em', boxShadow:'0 6px 22px rgba(234,88,12,0.5)',
                  fontFamily:"'Nunito',sans-serif", transition:'all 0.2s',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 30px rgba(234,88,12,0.65)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 6px 22px rgba(234,88,12,0.5)'; }}
              >
                <Hand size={17} /> Go to Shore
              </button>
            </div>
          </div>

          {/* ── Study Voyage Card ── */}
          <div style={{
            borderRadius: 28, overflow: 'hidden',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
            border: '2px solid rgba(255,255,255,0.18)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 28px 72px rgba(0,0,0,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.35)'; }}
          >
            {/* illustration */}
            <div style={{ height:220, position:'relative', overflow:'hidden', background:'linear-gradient(180deg,#0d1b3e 0%,#1a237e 30%,#1565c0 70%,#1976d2 100%)' }}>
              {/* stars */}
              {[[12,8],[28,5],[55,12],[72,6],[88,14],[40,18],[65,22],[20,25],[50,9],[80,20]].map(([x,y],i) => (
                <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:i%3===0?3:2, height:i%3===0?3:2, borderRadius:'50%', background:'white', opacity:0.35+i*0.06, animation:`star-twinkle ${2+i*0.3}s ease-in-out infinite`, animationDelay:`${i*0.4}s` }} />
              ))}
              {/* moon */}
              <div style={{ position:'absolute', top:18, left:22, width:42, height:42, borderRadius:'50%', background:'radial-gradient(circle,#fff9c4,#fff176)', boxShadow:'0 0 24px rgba(255,249,196,0.6)' }} />
              <div style={{ position:'absolute', top:20, left:30, width:34, height:34, borderRadius:'50%', background:'#1a237e' }} />
              {/* lighthouse scene */}
              <svg viewBox="0 0 280 150" width="100%" height="150" style={{ position:'absolute', bottom:0, left:0 }} fill="none">
                <ellipse cx="140" cy="142" rx="130" ry="10" fill="#0d47a1" opacity="0.5"/>
                <ellipse cx="140" cy="130" rx="82" ry="18" fill="#37474f"/>
                <ellipse cx="140" cy="132" rx="88" ry="13" fill="#455a64" opacity="0.8"/>
                {/* lighthouse */}
                <rect x="124" y="55" width="26" height="72" rx="3" fill="#eceff1"/>
                <rect x="124" y="67" width="26" height="9" fill="#e53935"/>
                <rect x="124" y="89" width="26" height="9" fill="#e53935"/>
                <rect x="124" y="111" width="26" height="9" fill="#e53935"/>
                <rect x="121" y="50" width="32" height="8" rx="2" fill="#78909c"/>
                <rect x="128" y="40" width="18" height="12" rx="2" fill="#263238"/>
                {/* light beam */}
                <polygon points="137,45 88,18 186,18" fill="#fff176" opacity="0.18"/>
                <circle cx="137" cy="45" r="5.5" fill="#fff176" opacity="0.95"/>
                {/* small building */}
                <rect x="80" y="116" width="20" height="16" rx="1" fill="#607d8b"/>
                <rect x="87" y="120" width="6" height="12" fill="#37474f"/>
                <polygon points="78,116 101,116 89,104" fill="#455a64"/>
                {/* dock */}
                <rect x="168" y="124" width="36" height="4" fill="#8d6e63" rx="2"/>
                <rect x="171" y="124" width="4" height="10" fill="#6d4c41"/>
                <rect x="191" y="124" width="4" height="10" fill="#6d4c41"/>
                {/* waves */}
                <path d="M0 138 C60 128,120 148,200 134 C240 127,268 142,280 136 L280 150 L0 150Z" fill="#1565c0" opacity="0.55"/>
              </svg>
              {/* overlay label */}
              <div style={{ position:'absolute', top:14, left:16, background:'rgba(14,165,233,0.9)', backdropFilter:'blur(4px)', borderRadius:99, padding:'5px 14px', display:'flex', alignItems:'center', gap:6 }}>
                <BookOpen size={13} color="white" />
                <span style={{ fontSize:11, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:'0.12em' }}>Word Chapters</span>
              </div>
              {/* progress bar on card */}
              {stats.totalIslands > 0 && (
                <div style={{ position:'absolute', bottom:12, left:16, right:16 }}>
                  <div style={{ height:5, borderRadius:99, background:'rgba(255,255,255,0.15)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#34d399,#22d3ee)', width:`${Math.round((stats.completedIslands/stats.totalIslands)*100)}%`, transition:'width 0.8s ease' }} />
                  </div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.65)', fontWeight:800, marginTop:4 }}>{stats.completedIslands}/{stats.totalIslands} islands cleared</div>
                </div>
              )}
            </div>

            {/* info */}
            <div style={{ padding:'22px 26px 26px', flex:1, display:'flex', flexDirection:'column' }}>
              <h2 style={{ fontSize:22, fontWeight:900, color:'white', margin:'0 0 8px', textShadow:'0 1px 6px rgba(0,0,0,0.3)' }}>Study Voyage</h2>
              <p style={{ fontSize:14, color:'rgba(255,255,255,0.7)', lineHeight:1.6, margin:'0 0 20px', flex:1 }}>
                Follow the whale across word chapters — master target words, verify each gesture, and earn XP on your deep-sea journey.
              </p>
              <button onClick={() => navigate('/study')}
                style={{
                  width:'100%', padding:'15px 0', borderRadius:16, border:'none',
                  background:'linear-gradient(135deg,#34d399,#0ea5e9)',
                  color:'#064e3b', fontSize:16, fontWeight:900, cursor:'pointer',
                  letterSpacing:'0.04em', boxShadow:'0 6px 22px rgba(14,165,233,0.45)',
                  fontFamily:"'Nunito',sans-serif", transition:'all 0.2s',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 30px rgba(14,165,233,0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 6px 22px rgba(14,165,233,0.45)'; }}
              >
                <Zap size={17} fill="#064e3b" color="#064e3b" /> Start Voyage
              </button>
            </div>
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
            {STUDY_ISLANDS.slice(0,stats.completedIslands).map(island => (
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
