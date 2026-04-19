import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Star, Trophy, Zap, RotateCcw, LogOut,
  BookOpen, Shield, TrendingUp, Award, Info, ChevronRight,
} from 'lucide-react';
import { getStoredStudyProgress, getVoyageStats, STUDY_ISLANDS } from '../study/studyVoyage';

const ISLAND_COLORS = {
  greetings: '#22d3ee',
  family:    '#22c55e',
  colors:    '#a855f7',
  food:      '#f97316',
  animals:   '#14b8a6',
};

function Card({ children, style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.07)',
      backdropFilter: 'blur(12px)',
      border: '1.5px solid rgba(255,255,255,0.14)',
      borderRadius: 24,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ icon, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '18px 24px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.09)',
    }}>
      {icon}
      <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
        {label}
      </span>
    </div>
  );
}

function Row({ label, value, accent, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 24px',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.07)',
    }}>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 900, color: accent || 'white' }}>{value}</span>
    </div>
  );
}

export default function Settings({ onLogout }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({});
  const [progress, setProgress] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const p = localStorage.getItem('handspeak_profile');
    if (p) setProfile(JSON.parse(p));
    setProgress(getStoredStudyProgress());
  }, []);

  const stats = progress ? getVoyageStats(progress) : { xp: 0, playerLevel: 1, completedIslands: 0, totalIslands: 5, completedPhraseLevels: 0, totalPhraseLevels: 25 };

  const handleLogout = () => {
    localStorage.removeItem('handspeak_user');
    localStorage.removeItem('handspeak_profile');
    if (onLogout) onLogout();
    navigate('/');
  };

  const handleResetProgress = () => {
    if (confirmReset) {
      localStorage.removeItem('handspeak_study_progress');
      setProgress(null);
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
    }
  };

  const profileName = [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ') || '—';
  const initials = [profile.firstName?.[0], profile.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const xpPct = Math.min(100, stats.progressPercent ?? 0);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Nunito', sans-serif",
      background: 'radial-gradient(ellipse at 18% 0%,#0ea5e9 0%,#0369a1 30%,#082f49 65%,#041421 100%)',
      color: 'white',
    }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '18px 30px',
        background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            width: 46, height: 46, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.28)',
            background: 'rgba(255,255,255,0.11)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.11)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ArrowLeft size={20} color="white" />
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>Settings</h1>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>Account &amp; progress</p>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '32px 28px 56px' }}>
        <div style={{ maxWidth: 1020, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ── PROFILE HERO ── */}
          <Card style={{ padding: '28px 28px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {/* avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#34d399,#0ea5e9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, fontWeight: 900, color: 'white',
                boxShadow: '0 6px 24px rgba(52,211,153,0.45)',
                border: '2.5px solid rgba(255,255,255,0.3)',
              }}>
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Student</p>
                <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900 }}>{profileName}</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {profile.nickname && (
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.1)', padding: '3px 12px', borderRadius: 99 }}>
                      "{profile.nickname}"
                    </span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#34d399', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', padding: '3px 12px', borderRadius: 99 }}>
                    Level {stats.playerLevel}
                  </span>
                </div>
              </div>
              {/* XP pill */}
              <div style={{ background: 'rgba(251,191,36,0.15)', border: '1.5px solid rgba(251,191,36,0.4)', borderRadius: 18, padding: '14px 20px', textAlign: 'center', flexShrink: 0 }}>
                <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total XP</p>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fde68a', lineHeight: 1 }}>{stats.xp}</p>
              </div>
            </div>

            {/* XP bar */}
            <div style={{ marginTop: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Voyage Progress</span>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#34d399' }}>{stats.completedIslands}/{stats.totalIslands} islands</span>
              </div>
              <div style={{ height: 10, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${Math.round((stats.completedIslands / Math.max(stats.totalIslands, 1)) * 100)}%`,
                  background: 'linear-gradient(90deg,#34d399,#22d3ee)',
                  boxShadow: '0 0 8px rgba(52,211,153,0.6)',
                  transition: 'width 0.8s ease',
                }} />
              </div>
            </div>
          </Card>

          {/* ── Row: Stats + Islands ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>

            {/* Quick Stats */}
            <Card>
              <CardHeader icon={<TrendingUp size={16} color="#34d399" />} label="Progress Stats" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.06)' }}>
                {[
                  { label: 'Player Level',     value: `Lv. ${stats.playerLevel}`,                             accent: '#22d3ee' },
                  { label: 'Total XP',         value: `${stats.xp} pts`,                                       accent: '#fbbf24' },
                  { label: 'Islands Cleared',  value: `${stats.completedIslands} / ${stats.totalIslands}`,     accent: '#34d399' },
                  { label: 'Phrases Learned',  value: `${stats.completedPhraseLevels} / ${stats.totalPhraseLevels}`, accent: '#a78bfa' },
                ].map(({ label, value, accent }) => (
                  <div key={label} style={{ padding: '18px 20px', background: 'rgba(0,0,0,0.15)' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: accent }}>{value}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Island Status */}
            <Card>
              <CardHeader icon={<Trophy size={16} color="#fbbf24" />} label="Island Status" />
              <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STUDY_ISLANDS.map((island) => {
                  const ip = progress?.islands?.[island.id];
                  const done = ip?.bossCompleted;
                  const pct = ip ? Math.round((ip.completedLevelIds.length / Math.max(island.levels.length, 1)) * 100) : 0;
                  const color = ISLAND_COLORS[island.id] || '#60a5fa';
                  return (
                    <div key={island.id} style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{island.title}</span>
                        <span style={{
                          fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em',
                          color: done ? '#064e3b' : 'rgba(255,255,255,0.6)',
                          background: done ? color : 'rgba(255,255,255,0.1)',
                          padding: '2px 9px', borderRadius: 99,
                        }}>
                          {done ? 'Cleared' : `${pct}%`}
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, width: `${done ? 100 : pct}%`, background: `linear-gradient(90deg,${color},${color}aa)`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* ── Row: Actions + About ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>

            {/* Actions */}
            <Card>
              <CardHeader icon={<Shield size={16} color="#fb923c" />} label="Actions" />
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={handleResetProgress}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 18px', borderRadius: 16,
                    border: `1.5px solid ${confirmReset ? 'rgba(251,146,60,0.8)' : 'rgba(251,146,60,0.35)'}`,
                    background: confirmReset ? 'rgba(251,146,60,0.22)' : 'rgba(251,146,60,0.1)',
                    cursor: 'pointer', color: '#fb923c',
                    fontFamily: "'Nunito',sans-serif", transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,146,60,0.22)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = confirmReset ? 'rgba(251,146,60,0.22)' : 'rgba(251,146,60,0.1)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <RotateCcw size={18} color="#fb923c" />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{confirmReset ? 'Tap again to confirm reset' : 'Reset Progress'}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(251,146,60,0.7)', fontWeight: 700 }}>Clears all XP, islands &amp; phrase data</p>
                    </div>
                  </div>
                  <ChevronRight size={16} color="rgba(251,146,60,0.6)" />
                </button>

                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 18px', borderRadius: 16,
                    border: '1.5px solid rgba(239,68,68,0.35)',
                    background: 'rgba(239,68,68,0.1)',
                    cursor: 'pointer', color: '#f87171',
                    fontFamily: "'Nunito',sans-serif", transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.7)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <LogOut size={18} color="#f87171" />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Sign Out</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(248,113,113,0.7)', fontWeight: 700 }}>Return to login screen</p>
                    </div>
                  </div>
                  <ChevronRight size={16} color="rgba(248,113,113,0.6)" />
                </button>
              </div>
            </Card>

            {/* About */}
            <Card>
              <CardHeader icon={<Info size={16} color="#60a5fa" />} label="About" />
              <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#0ea5e9,#34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(14,165,233,0.4)', flexShrink: 0 }}>
                    <BookOpen size={22} color="white" />
                  </div>
                  <div>
                    <p style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 900 }}>HandSpeak</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>ASL Learning Platform · v1.0.0</p>
                  </div>
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
                <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65 }}>
                  A gamified, ocean-themed app for learning American Sign Language. Explore islands, master phrases, defeat bosses, and embark on your Study Voyage!
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Word Chapters', '100 Words', 'Model Verification', 'Real-time Camera'].map(t => (
                    <span key={t} style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', background: 'rgba(96,165,250,0.13)', border: '1px solid rgba(96,165,250,0.3)', padding: '3px 10px', borderRadius: 99 }}>{t}</span>
                  ))}
                </div>
              </div>
            </Card>
          </div>

        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');
      `}</style>
    </div>
  );
}
