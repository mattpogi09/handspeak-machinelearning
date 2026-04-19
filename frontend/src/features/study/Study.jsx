import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Compass, Lock, Star, Zap, Target, Lightbulb, Hand, Users, Palette, Utensils, PawPrint } from 'lucide-react';
import {
  STUDY_ISLANDS,
  getInitialStudyProgress,
  getStoredStudyProgress,
  saveStudyProgress,
  isIslandUnlocked,
  isIslandCompleted,
  getCurrentIslandId,
  getVoyageStats,
  setIslandIntroSeen,
} from './studyVoyage';

const DIFF_META = {
  Easy:   { label: 'Easy',   bg: 'linear-gradient(135deg,#22d3ee,#06b6d4)', text: '#083344', shadow: 'rgba(6,182,212,0.5)' },
  Medium: { label: 'Medium', bg: 'linear-gradient(135deg,#fb923c,#ef4444)', text: '#fff7f0', shadow: 'rgba(251,146,60,0.5)' },
  Hard:   { label: 'Hard',   bg: 'linear-gradient(135deg,#a855f7,#7c3aed)', text: '#faf0ff', shadow: 'rgba(168,85,247,0.5)' },
};

/* Map each island id → Lucide icon component + display color */
const ISLAND_ICONS = {
  greetings: { Icon: Hand,     color: '#0ea5e9' },
  family:    { Icon: Users,    color: '#22c55e' },
  colors:    { Icon: Palette,  color: '#a855f7' },
  food:      { Icon: Utensils, color: '#f97316' },
  animals:   { Icon: PawPrint, color: '#14b8a6' },
};

export default function Study() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(getInitialStudyProgress());
  const [selectedIslandId, setSelectedIslandId] = useState(null);
  const [lockedHint, setLockedHint] = useState('');

  useEffect(() => {
    const normalized = getStoredStudyProgress();
    setProgress(normalized);
    saveStudyProgress(normalized);
  }, []);

  const stats = useMemo(() => getVoyageStats(progress), [progress]);
  const activeIslandId = useMemo(() => getCurrentIslandId(progress), [progress]);
  const selectedIsland = useMemo(
    () => STUDY_ISLANDS.find((island) => island.id === selectedIslandId) || null,
    [selectedIslandId]
  );

  const openIslandIntro = (island, index) => {
    if (!isIslandUnlocked(progress, island.id)) {
      const prev = STUDY_ISLANDS[index - 1];
      setLockedHint(prev
        ? `Finish "${prev.title}" island first to unlock this one!`
        : 'This island is still locked.');
      setTimeout(() => setLockedHint(''), 3000);
      return;
    }
    setLockedHint('');
    setSelectedIslandId(island.id);
  };

  const startIsland = () => {
    if (!selectedIsland) return;
    const updated = setIslandIntroSeen(progress, selectedIsland.id);
    setProgress(updated);
    saveStudyProgress(updated);
    setSelectedIslandId(null);
    navigate(`/study/${selectedIsland.id}`);
  };

  const closeModal = () => setSelectedIslandId(null);
  const xpPct = Math.min(100, stats.progressPercent ?? 0);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Nunito', sans-serif",
      background: 'radial-gradient(ellipse at 18% 0%, #0ea5e9 0%, #0369a1 30%, #082f49 65%, #041421 100%)',
      overflowX: 'hidden',
      position: 'relative',
    }}>

      {/* ── subtle star field ── */}
      {[8,18,32,47,56,71,85,90,22,63].map((x, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${x}%`, top: `${3 + (i * 7) % 22}%`,
          width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2,
          borderRadius: '50%', background: 'white',
          opacity: 0.2 + (i * 0.05), pointerEvents: 'none',
        }} />
      ))}

      {/* ── header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '18px 28px', flexShrink: 0, position: 'relative', zIndex: 2,
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            cursor: 'pointer', background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.2s',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ArrowLeft size={20} color="white" />
        </button>

        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 900, color: 'white', margin: 0,
            textShadow: '0 2px 12px rgba(0,0,0,0.5)', letterSpacing: '-0.01em',
          }}>
            Study Voyage World
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
            Explore islands · Learn signs · Defeat bosses
          </p>
        </div>

        {/* Level + XP pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(255,255,255,0.28)',
          borderRadius: 50, padding: '10px 18px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>
          <Compass size={17} color="#fde68a" />
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Level</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1.1 }}>{stats.playerLevel}</div>
          </div>
          <div style={{ width: 80, height: 8, borderRadius: 99, background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: 'linear-gradient(90deg,#34d399,#22d3ee)',
              width: `${xpPct}%`, transition: 'width 0.8s ease',
              boxShadow: '0 0 8px rgba(52,211,153,0.7)',
            }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#fde68a', whiteSpace: 'nowrap' }}>{stats.xp} XP</span>
        </div>
      </header>

      {/* ── wave divider ── */}
      <div style={{ width: '100%', flexShrink: 0, lineHeight: 0, position: 'relative', zIndex: 1 }}>
        <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 48 }}>
          <path d="M0 32 C240 8,480 44,720 24 C960 4,1200 40,1440 20 L1440 48 L0 48Z" fill="rgba(255,255,255,0.05)" />
          <path d="M0 40 C360 16,720 48,1080 28 C1260 18,1380 44,1440 32 L1440 48 L0 48Z" fill="rgba(255,255,255,0.04)" />
        </svg>
      </div>

      {/* ── island scroll area ── */}
      <div style={{ flex: 1, overflowX: 'auto', padding: '16px 32px 24px', position: 'relative', zIndex: 2 }}>
        <div style={{ minWidth: Math.max(1000, STUDY_ISLANDS.length * 210), maxWidth: 1400, margin: '0 auto', position: 'relative' }}>

          {/* dashed connecting path */}
          <div style={{
            position: 'absolute', top: 152, left: 90, right: 90, height: 4,
            borderRadius: 99, pointerEvents: 'none',
            background: 'none',
            borderTop: '4px dashed rgba(186,230,255,0.45)',
          }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${STUDY_ISLANDS.length}, minmax(170px, 1fr))`,
            gap: 20,
            alignItems: 'end',
            position: 'relative',
          }}>
            {STUDY_ISLANDS.map((island, index) => {
              const unlocked = isIslandUnlocked(progress, island.id);
              const completed = isIslandCompleted(progress, island.id);
              const isCurrent = activeIslandId === island.id;
              const offsetY = index % 2 === 0 ? 0 : 44;
              const diff = DIFF_META[island.difficulty] || DIFF_META.Easy;

              return (
                <div key={island.id} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  transform: `translateY(${offsetY}px)`,
                }}>
                  {/* whale marker */}
                  {isCurrent ? (
                    <div style={{ animation: 'whale-bob 2.8s ease-in-out infinite', marginBottom: 6 }}>
                      <img
                        src="/whale.svg"
                        alt="Current island"
                        style={{ width: 76, height: 57, display: 'block', filter: 'drop-shadow(0 4px 14px rgba(0,200,255,0.6))' }}
                      />
                    </div>
                  ) : (
                    <div style={{ height: 63 }} />
                  )}

                  {/* Active badge */}
                  {isCurrent ? (
                    <span style={{
                      background: 'linear-gradient(135deg,#34d399,#22d3ee)',
                      color: '#083344', fontSize: 10, fontWeight: 900,
                      padding: '3px 14px', borderRadius: 99, letterSpacing: '0.15em',
                      textTransform: 'uppercase', marginBottom: 8, display: 'flex',
                      alignItems: 'center', gap: 4,
                      boxShadow: '0 4px 16px rgba(52,211,153,0.55)',
                      animation: 'badge-pulse 2s ease-in-out infinite',
                    }}>
                      <Zap size={9} fill="#083344" color="#083344" strokeWidth={3} />
                      Active
                    </span>
                  ) : (
                    <div style={{ height: 24 }} />
                  )}

                  {/* island card */}
                  <button
                    onClick={() => openIslandIntro(island, index)}
                    style={{
                      width: 140,
                      borderRadius: 22,
                      border: isCurrent
                        ? '2.5px solid rgba(52,211,153,0.9)'
                        : completed
                        ? '2px solid rgba(34,211,238,0.6)'
                        : '2px solid rgba(255,255,255,0.18)',
                      cursor: unlocked ? 'pointer' : 'not-allowed',
                      transition: 'transform 0.22s cubic-bezier(.4,0,.2,1), box-shadow 0.22s ease',
                      background: unlocked
                        ? 'rgba(8,26,60,0.75)'
                        : 'rgba(255,255,255,0.06)',
                      opacity: unlocked ? 1 : 0.52,
                      padding: '10px 10px 14px',
                      backdropFilter: 'blur(8px)',
                      boxShadow: isCurrent
                        ? '0 0 0 4px rgba(52,211,153,0.2), 0 16px 40px rgba(0,0,0,0.4)'
                        : completed
                        ? '0 12px 32px rgba(34,211,238,0.2)'
                        : '0 8px 28px rgba(0,0,0,0.35)',
                    }}
                    onMouseEnter={e => {
                      if (unlocked) {
                        e.currentTarget.style.transform = 'translateY(-8px) scale(1.04)';
                        e.currentTarget.style.boxShadow = '0 22px 52px rgba(0,0,0,0.5)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = isCurrent
                        ? '0 0 0 4px rgba(52,211,153,0.2), 0 16px 40px rgba(0,0,0,0.4)'
                        : '0 8px 28px rgba(0,0,0,0.35)';
                    }}
                  >
                    {/* island scene */}
                    <div style={{
                      height: 88, borderRadius: 16,
                      background: island.theme.sky,
                      position: 'relative', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {/* island mound */}
                      <div style={{
                        position: 'absolute', bottom: -10,
                        width: '86%', height: 32, borderRadius: '50%',
                        background: island.theme.island,
                        boxShadow: `0 -3px 12px rgba(0,0,0,0.2)`,
                      }} />

                      {/* island icon */}
                      {(() => {
                        const meta = ISLAND_ICONS[island.id];
                        if (!meta) return null;
                        const { Icon, color } = meta;
                        return (
                          <div style={{
                            position: 'relative', zIndex: 1,
                            width: 44, height: 44, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.22)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 4px 14px rgba(0,0,0,0.25)`,
                          }}>
                            <Icon size={22} color={color} strokeWidth={2.2} />
                          </div>
                        );
                      })()}

                      {/* completed star badge */}
                      {completed && (
                        <div style={{
                          position: 'absolute', top: 6, right: 6,
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(251,191,36,0.7)',
                        }}>
                          <Star size={12} fill="white" color="white" />
                        </div>
                      )}

                      {/* lock overlay */}
                      {!unlocked && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'rgba(4,16,38,0.55)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 16,
                        }}>
                          <Lock size={24} color="rgba(255,255,255,0.8)" />
                        </div>
                      )}
                    </div>

                    {/* difficulty chip */}
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                      <span style={{
                        background: unlocked ? diff.bg : 'rgba(255,255,255,0.14)',
                        color: unlocked ? diff.text : 'rgba(255,255,255,0.55)',
                        fontSize: 9, fontWeight: 900, letterSpacing: '0.15em',
                        textTransform: 'uppercase', padding: '3px 10px', borderRadius: 99,
                        boxShadow: unlocked ? `0 2px 8px ${diff.shadow}` : 'none',
                      }}>
                        {island.difficulty}
                      </span>
                    </div>

                    {/* title */}
                    <div style={{
                      marginTop: 7, fontSize: 14, fontWeight: 900,
                      color: 'white', textShadow: '0 1px 6px rgba(0,0,0,0.55)',
                      letterSpacing: '0.01em',
                    }}>
                      {island.title}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── stats bar ── */}
      <div style={{
        margin: '0 24px 20px',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
        border: '1.5px solid rgba(255,255,255,0.2)',
        padding: '14px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
        position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg,#34d399,#22d3ee)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(52,211,153,0.5)', flexShrink: 0,
          }}>
            <Zap size={15} fill="white" color="white" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>
            {stats.completedIslands}/{stats.totalIslands} islands cleared
          </span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 13 }}>·</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>
            {stats.completedPhraseLevels}/{stats.totalPhraseLevels} phrase levels done
          </span>
        </div>
        <div style={{
          background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
          color: '#451a03', fontSize: 13, fontWeight: 900,
          padding: '6px 16px', borderRadius: 99,
          boxShadow: '0 4px 14px rgba(251,191,36,0.5)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Star size={13} fill="#451a03" color="#451a03" />
          {stats.xp} XP
        </div>
      </div>

      {/* ── locked toast ── */}
      {lockedHint && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'rgba(239,68,68,0.95)', backdropFilter: 'blur(8px)',
          border: '1.5px solid rgba(255,180,180,0.5)',
          color: 'white', borderRadius: 14,
          padding: '12px 22px', fontSize: 14, fontWeight: 800,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          animation: 'slide-up 0.3s ease-out',
          display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
        }}>
          <Lock size={15} color="white" />
          {lockedHint}
        </div>
      )}

      {/* ── island intro modal ── */}
      {selectedIsland && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(2,8,26,0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{
            width: 'min(520px, 100%)',
            borderRadius: 26,
            background: 'linear-gradient(165deg,#0c2a5c 0%,#071830 100%)',
            border: '1.5px solid rgba(186,230,255,0.28)',
            boxShadow: '0 28px 80px rgba(0,0,0,0.65)',
            padding: 26, color: 'white',
            animation: 'modal-enter 0.3s ease-out',
          }}>
            {/* modal header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 17, flexShrink: 0,
                background: selectedIsland.theme.sky,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(0,0,0,0.35)', overflow: 'hidden',
              }}>
                <span style={{ fontSize: 28, lineHeight: 1, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.3))' }}>
                  {(() => {
                    const meta = ISLAND_ICONS[selectedIsland.id];
                    if (!meta) return selectedIsland.icon;
                    const { Icon, color } = meta;
                    return <Icon size={26} color={color} strokeWidth={2.2} />;
                  })()}
                </span>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.01em' }}>
                  {selectedIsland.intro.title}
                </h2>
                <div style={{ marginTop: 5 }}>
                  <span style={{
                    display: 'inline-block',
                    background: DIFF_META[selectedIsland.difficulty]?.bg || 'rgba(255,255,255,0.2)',
                    color: DIFF_META[selectedIsland.difficulty]?.text || 'white',
                    fontSize: 9.5, fontWeight: 900, letterSpacing: '0.15em',
                    textTransform: 'uppercase', padding: '3px 12px', borderRadius: 99,
                  }}>
                    {selectedIsland.difficulty}
                  </span>
                </div>
              </div>
            </div>

            {/* story intro */}
            <div style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14, padding: '12px 16px', marginBottom: 12,
              fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, fontStyle: 'italic',
            }}>
              {selectedIsland.intro.story || selectedIsland.intro.description}
            </div>

            <p style={{ margin: '0 0 14px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, fontSize: 13 }}>
              {selectedIsland.intro.description}
            </p>

            <div style={{
              background: 'rgba(52,211,153,0.1)', border: '1.5px solid rgba(52,211,153,0.3)',
              borderRadius: 15, padding: '12px 16px', marginBottom: 12,
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <Target size={15} color="#34d399" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#a7f3d0', lineHeight: 1.6 }}>
                <strong>Objective:</strong> {selectedIsland.intro.objective}
              </p>
            </div>

            <div style={{
              background: 'rgba(251,191,36,0.08)', border: '1.5px solid rgba(251,191,36,0.3)',
              borderRadius: 15, padding: '12px 16px', marginBottom: 22,
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <Lightbulb size={15} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#fde68a', lineHeight: 1.6 }}>
                <strong>Tip:</strong> {selectedIsland.intro.hint}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={closeModal}
                style={{
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.08)', color: 'white', borderRadius: 13,
                  padding: '11px 20px', fontWeight: 800, cursor: 'pointer',
                  fontSize: 14, fontFamily: "'Nunito',sans-serif",
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >
                Not yet
              </button>
              <button
                onClick={startIsland}
                style={{
                  border: 'none',
                  background: 'linear-gradient(135deg,#34d399,#22d3ee)',
                  color: '#064e3b', borderRadius: 13,
                  padding: '11px 22px', fontWeight: 900, cursor: 'pointer',
                  fontSize: 14, fontFamily: "'Nunito',sans-serif",
                  boxShadow: '0 6px 22px rgba(52,211,153,0.5)',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(52,211,153,0.65)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(52,211,153,0.5)'; }}
              >
                Start Island
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes whale-bob { 0%,100%{transform:translateY(0) rotate(-1.5deg)} 50%{transform:translateY(-11px) rotate(1.5deg)} }
        @keyframes badge-pulse { 0%,100%{box-shadow:0 4px 16px rgba(52,211,153,0.55)} 50%{box-shadow:0 4px 26px rgba(52,211,153,0.9)} }
        @keyframes slide-up { 0%{opacity:0;transform:translateX(-50%) translateY(14px)} 100%{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes modal-enter { 0%{opacity:0;transform:scale(0.92) translateY(16px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
}
