import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Star, BookOpen, RotateCcw, LogOut } from 'lucide-react';

export default function Settings({ onLogout }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({});
  const [progress, setProgress] = useState({});

  useEffect(() => {
    const p = localStorage.getItem('handspeak_profile');
    if (p) setProfile(JSON.parse(p));
    const pr = localStorage.getItem('handspeak_study_progress');
    if (pr) setProgress(JSON.parse(pr));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('handspeak_user');
    localStorage.removeItem('handspeak_profile');
    if (onLogout) onLogout();
    navigate('/');
  };

  const handleResetProgress = () => {
    if (window.confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      localStorage.removeItem('handspeak_study_progress');
      setProgress({});
    }
  };

  const profileName = [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ') || '—';

  return (
    <div style={{ minHeight: '100vh', background: '#e8f4fd', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '20px 36px', background: '#fff',
        borderBottom: '1px solid #bbdefb',
        boxShadow: '0 2px 12px rgba(21,101,192,0.08)'
      }}>
        <button onClick={() => navigate('/dashboard')} style={{
          width: 48, height: 48, borderRadius: '50%',
          background: '#e3f2fd', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'background 0.2s'
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#bbdefb'}
          onMouseLeave={e => e.currentTarget.style.background = '#e3f2fd'}
        >
          <ArrowLeft size={22} color="#1565c0" />
        </button>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1a2a3a', margin: 0 }}>Settings</h1>
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, padding: '36px 36px 48px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* ── Row 1: Profile + Progress ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>

            {/* Profile Card */}
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 28px 16px', borderBottom: '1px solid #f0f4f8' }}>
                <User size={18} color="#1565c0" />
                <span style={{ fontSize: 11, fontWeight: 900, color: '#78909c', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Profile</span>
              </div>
              {[
                { label: 'Name', value: profileName },
                { label: 'Nickname', value: profile.nickname || '—' },
              ].map(({ label, value }, i) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '20px 28px',
                  borderBottom: i === 0 ? '1px solid #f0f4f8' : 'none'
                }}>
                  <span style={{ fontSize: 15, color: '#78909c', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#1a2a3a', marginLeft: 16, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Progress Card */}
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 28px 16px', borderBottom: '1px solid #f0f4f8' }}>
                <Star size={18} color="#1565c0" />
                <span style={{ fontSize: 11, fontWeight: 900, color: '#78909c', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Progress</span>
              </div>
              {[
                { label: 'Level', value: progress.level || 1 },
                { label: 'XP', value: `${progress.xp || 0} pts` },
                { label: 'Topics Completed', value: `${progress.completed_topics?.length || 0} / 5` },
                { label: 'Phrases Learned', value: progress.completed_phrases?.length || 0 },
              ].map(({ label, value }, i, arr) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '18px 28px',
                  borderBottom: i < arr.length - 1 ? '1px solid #f0f4f8' : 'none'
                }}>
                  <span style={{ fontSize: 15, color: '#78909c', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#1565c0' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Row 2: Actions + About ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>

            {/* Actions Card */}
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f0f4f8' }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#78909c', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Actions</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={handleResetProgress} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '18px 20px', borderRadius: 14,
                  border: '1.5px solid #ffe082', background: '#fffbf0',
                  cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#e65100',
                  textAlign: 'left', transition: 'all 0.2s'
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fff3e0'; e.currentTarget.style.borderColor = '#ffb300'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fffbf0'; e.currentTarget.style.borderColor = '#ffe082'; }}
                >
                  <RotateCcw size={20} />
                  Reset Progress
                </button>
                <button onClick={handleLogout} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '18px 20px', borderRadius: 14,
                  border: '1.5px solid #ffcdd2', background: '#fff5f5',
                  cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#d32f2f',
                  textAlign: 'left', transition: 'all 0.2s'
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ffebee'; e.currentTarget.style.borderColor = '#ef9a9a'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.borderColor = '#ffcdd2'; }}
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </div>
            </div>

            {/* About Card */}
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 28px 16px', borderBottom: '1px solid #f0f4f8' }}>
                <BookOpen size={18} color="#1565c0" />
                <span style={{ fontSize: 11, fontWeight: 900, color: '#78909c', textTransform: 'uppercase', letterSpacing: '0.18em' }}>About</span>
              </div>
              <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#1a2a3a', margin: 0 }}>HandSpeak — ASL Learning Platform</p>
                <p style={{ fontSize: 13, color: '#90a4ae', margin: 0 }}>Version 1.0.0</p>
                <p style={{ fontSize: 14, color: '#78909c', lineHeight: 1.6, margin: 0 }}>A gamified ocean-themed app for learning American Sign Language.</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
