import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Crown, Lock, Play, Star, Zap, Target, Hand, Users, Palette, Utensils, PawPrint } from 'lucide-react';
import {
  getInitialStudyProgress,
  getStoredStudyProgress,
  loadStudyProgress,
  saveStudyProgress,
  isIslandUnlocked,
  isLevelCompleted,
  isBossUnlocked,
  getIslandProgress,
} from './studyVoyage';
import { useIslands } from '../../contexts/IslandsContext';

const DIFF_META = {
  Easy:   { label: 'Easy',   bg: 'linear-gradient(135deg,#22d3ee,#06b6d4)', text: '#083344', shadow: 'rgba(6,182,212,0.55)' },
  Medium: { label: 'Medium', bg: 'linear-gradient(135deg,#fb923c,#ef4444)', text: '#fff',     shadow: 'rgba(251,146,60,0.55)' },
  Hard:   { label: 'Hard',   bg: 'linear-gradient(135deg,#a855f7,#7c3aed)', text: '#fff',     shadow: 'rgba(168,85,247,0.55)' },
};

const ISLAND_ICONS = {
  greetings: { Icon: Hand,     color: '#0ea5e9' },
  family:    { Icon: Users,    color: '#22c55e' },
  colors:    { Icon: Palette,  color: '#a855f7' },
  food:      { Icon: Utensils, color: '#f97316' },
  animals:   { Icon: PawPrint, color: '#14b8a6' },
};

export default function StudyIsland() {
  const { islandId } = useParams();
  const navigate = useNavigate();
  const { getIslandById } = useIslands();
  const [progress, setProgress] = useState(getInitialStudyProgress());

  useEffect(() => {
    let active = true;
    const cached = getStoredStudyProgress();
    setProgress(cached);

    loadStudyProgress().then((normalized) => {
      if (!active) return;
      setProgress(normalized);
      saveStudyProgress(normalized);
    });

    return () => {
      active = false;
    };
  }, []);

  const island = getIslandById(islandId);
  const islandProgress = useMemo(() => getIslandProgress(progress, islandId), [progress, islandId]);

  /* ── error states ── */
  if (!island) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 18% 0%,#0ea5e9 0%,#0369a1 30%,#082f49 65%,#041421 100%)', color: 'white', padding: 20, fontFamily: "'Nunito',sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 20, fontWeight: 900, margin: '0 0 16px' }}>Island not found.</p>
          <button onClick={() => navigate('/study')}
            style={{ border: 'none', borderRadius: 14, padding: '12px 22px', cursor: 'pointer', fontWeight: 900, fontSize: 15, background: 'linear-gradient(135deg,#34d399,#22d3ee)', color: '#064e3b', fontFamily: "'Nunito',sans-serif" }}>
            Back to World Map
          </button>
        </div>
      </div>
    );
  }

  const unlocked = isIslandUnlocked(progress, island.id);

  if (!unlocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 18% 0%,#0ea5e9 0%,#0369a1 30%,#082f49 65%,#041421 100%)', color: 'white', padding: 20, fontFamily: "'Nunito',sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock size={34} color="rgba(255,255,255,0.8)" />
          </div>
          <p style={{ fontSize: 22, fontWeight: 900, margin: '0 0 10px' }}>{island.title} is Locked</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 22 }}>
            Clear the previous island's boss level first to unlock this island.
          </p>
          <button onClick={() => navigate('/study')}
            style={{ border: 'none', borderRadius: 14, padding: '12px 22px', cursor: 'pointer', fontWeight: 900, fontSize: 15, background: 'linear-gradient(135deg,#34d399,#22d3ee)', color: '#064e3b', fontFamily: "'Nunito',sans-serif" }}>
            Back to World Map
          </button>
        </div>
      </div>
    );
  }

  const hasBossLevel = Boolean(island.bossLevel);
  const bossUnlocked = hasBossLevel ? isBossUnlocked(progress, island.id) : false;
  const phraseCompleteCount = island.levels.filter((level) => isLevelCompleted(progress, island.id, level.id)).length;
  const nextPhraseLevel = island.levels.find((level) => !isLevelCompleted(progress, island.id, level.id));
  const bossCompleted = hasBossLevel ? islandProgress.bossCompleted : false;
  const diff = DIFF_META[island.difficulty] || DIFF_META.Easy;

  const launchLevel = (levelId) => navigate(`/study/${island.id}/level/${levelId}`);

  const progressPct = Math.round((phraseCompleteCount / Math.max(island.levels.length, 1)) * 100);

  return (
    <div style={{
      minHeight: '100vh',
      /* Fixed solid dark ocean — does NOT parse island.theme.sky */
      background: 'radial-gradient(ellipse at 18% 0%,#0ea5e9 0%,#0369a1 30%,#082f49 65%,#041421 100%)',
      color: 'white',
      fontFamily: "'Nunito', sans-serif",
    }}>

      {/* ── header ── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 26px 14px' }}>
        <button
          onClick={() => navigate('/study')}
          style={{
            width: 46, height: 46, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.28)',
            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ArrowLeft size={20} color="white" />
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            {(() => {
              const meta = ISLAND_ICONS[island.id];
              if (!meta) return null;
              const { Icon, color } = meta;
              return (
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                }}>
                  <Icon size={18} color={color} strokeWidth={2.2} />
                </div>
              );
            })()}
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
              {island.title} Island
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
            <span style={{
              background: diff.bg, color: diff.text,
              fontSize: 9.5, fontWeight: 900, letterSpacing: '0.15em',
              textTransform: 'uppercase', padding: '3px 12px', borderRadius: 99,
              boxShadow: `0 2px 8px ${diff.shadow}`,
            }}>
              {island.difficulty}
            </span>
          </div>
        </div>

        {/* progress badge */}
        <div style={{
          borderRadius: 16, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
          border: '1.5px solid rgba(255,255,255,0.25)', padding: '10px 18px',
          textAlign: 'center', boxShadow: '0 4px 18px rgba(0,0,0,0.2)',
        }}>
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800 }}>Progress</p>
          <p style={{ margin: '3px 0 0', fontSize: 19, fontWeight: 900, color: 'white', lineHeight: 1 }}>
            {phraseCompleteCount}<span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>/{island.levels.length}</span>
          </p>
        </div>
      </header>

      <main style={{ padding: '10px 26px 36px', maxWidth: 1160, margin: '0 auto' }}>

        {/* ── progress bar ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Island Progress</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#34d399' }}>{progressPct}%</span>
          </div>
          <div style={{ height: 10, borderRadius: 99, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${progressPct}%`, transition: 'width 0.8s ease',
              background: progressPct === 100 ? 'linear-gradient(90deg,#fbbf24,#f59e0b)' : 'linear-gradient(90deg,#34d399,#22d3ee)',
              boxShadow: '0 0 10px rgba(52,211,153,0.6)',
            }} />
          </div>
        </div>

        {/* ── objective + continue button ── */}
        <div style={{
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(255,255,255,0.22)',
          borderRadius: 20, padding: '16px 20px', marginBottom: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
          boxShadow: '0 8px 28px rgba(0,0,0,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#34d399,#22d3ee)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(52,211,153,0.5)',
            }}>
              <Target size={14} color="white" />
            </div>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', fontWeight: 800, lineHeight: 1.4 }}>
              {island.intro.objective}
            </span>
          </div>
          {nextPhraseLevel && (
            <button
              onClick={() => launchLevel(nextPhraseLevel.id)}
              style={{
                border: 'none', borderRadius: 13, padding: '11px 20px', cursor: 'pointer',
                fontWeight: 900, fontSize: 14, color: '#064e3b',
                background: 'linear-gradient(135deg,#34d399,#22d3ee)',
                boxShadow: '0 6px 20px rgba(52,211,153,0.45)',
                fontFamily: "'Nunito',sans-serif",
                transition: 'transform 0.18s ease',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Play size={14} fill="#064e3b" color="#064e3b" />
              Continue Level {nextPhraseLevel.order}
            </button>
          )}
        </div>

        {/* ── word level cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14, marginBottom: 20 }}>
          {island.levels.map((level, idx) => {
            const completed = isLevelCompleted(progress, island.id, level.id);
            const levelUnlocked = idx === 0 || isLevelCompleted(progress, island.id, island.levels[idx - 1].id);

            return (
              <button
                key={level.id}
                onClick={() => levelUnlocked && launchLevel(level.id)}
                style={{
                  border: completed
                    ? '2px solid rgba(52,211,153,0.65)'
                    : levelUnlocked
                    ? '2px solid rgba(255,255,255,0.22)'
                    : '2px solid rgba(255,255,255,0.08)',
                  borderRadius: 18,
                  background: completed
                    ? 'linear-gradient(135deg,rgba(52,211,153,0.22),rgba(34,211,238,0.2))'
                    : levelUnlocked
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                  textAlign: 'left',
                  padding: '15px 15px 13px',
                  cursor: levelUnlocked ? 'pointer' : 'not-allowed',
                  opacity: levelUnlocked ? 1 : 0.56,
                  fontFamily: "'Nunito',sans-serif",
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: completed ? '0 8px 24px rgba(52,211,153,0.18)' : '0 4px 16px rgba(0,0,0,0.22)',
                }}
                onMouseEnter={e => { if (levelUnlocked) { e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 18px 42px rgba(0,0,0,0.38)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = completed ? '0 8px 24px rgba(52,211,153,0.18)' : '0 4px 16px rgba(0,0,0,0.22)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                  <span style={{
                    fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.65)', fontWeight: 900,
                    background: 'rgba(255,255,255,0.1)', padding: '2px 9px', borderRadius: 99,
                  }}>
                    Level {level.order}
                  </span>
                  <div style={{
                    width: 27, height: 27, borderRadius: '50%',
                    background: completed
                      ? 'linear-gradient(135deg,#34d399,#22d3ee)'
                      : levelUnlocked
                      ? 'rgba(255,255,255,0.16)'
                      : 'rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: completed ? '0 2px 8px rgba(52,211,153,0.5)' : 'none',
                    flexShrink: 0,
                  }}>
                    {completed
                      ? <CheckCircle2 size={15} color="white" />
                      : levelUnlocked
                      ? <Play size={12} color="white" fill="white" />
                      : <Lock size={12} color="rgba(255,255,255,0.6)" />}
                  </div>
                </div>

                <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 5 }}>{level.label}</div>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.74)', lineHeight: 1.5 }}>{level.description}</p>

                {completed && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={11} fill="#fbbf24" color="#fbbf24" />
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#fbbf24' }}>Completed</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ── boss level ── */}
        {hasBossLevel ? (
          <button
            onClick={() => bossUnlocked && launchLevel(island.bossLevel.id)}
            style={{
              width: '100%', borderRadius: 22,
              border: bossCompleted
                ? '2.5px solid rgba(251,191,36,0.75)'
                : bossUnlocked
                ? '2.5px solid rgba(251,191,36,0.45)'
                : '2px solid rgba(255,255,255,0.1)',
              background: bossCompleted
                ? 'linear-gradient(135deg,rgba(251,191,36,0.3),rgba(249,115,22,0.3))'
                : bossUnlocked
                ? 'rgba(251,191,36,0.1)'
                : 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              padding: '18px 20px 16px',
              color: 'white', textAlign: 'left',
              cursor: bossUnlocked ? 'pointer' : 'not-allowed',
              opacity: bossUnlocked ? 1 : 0.62,
              boxShadow: bossUnlocked ? '0 8px 32px rgba(251,191,36,0.2)' : '0 4px 14px rgba(0,0,0,0.2)',
              fontFamily: "'Nunito',sans-serif",
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={e => { if (bossUnlocked) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 18px 48px rgba(251,191,36,0.35)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = bossUnlocked ? '0 8px 32px rgba(251,191,36,0.2)' : '0 4px 14px rgba(0,0,0,0.2)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 16, flexShrink: 0,
                  background: bossUnlocked ? 'linear-gradient(135deg,#fbbf24,#f97316)' : 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: bossUnlocked ? '0 6px 20px rgba(251,191,36,0.55)' : 'none',
                  animation: bossUnlocked && !bossCompleted ? 'boss-glow 2s ease-in-out infinite' : undefined,
                }}>
                  <Crown size={24} color={bossUnlocked ? 'white' : 'rgba(255,255,255,0.45)'} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{island.bossLevel.label}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                    {island.bossLevel.description}
                  </p>
                </div>
              </div>

              {bossCompleted
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <Star size={15} fill="#fbbf24" color="#fbbf24" />
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Defeated</span>
                  </div>
                : bossUnlocked
                ? <span style={{
                    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.13em',
                    fontWeight: 900, color: '#fde68a',
                    background: 'rgba(251,191,36,0.18)', padding: '5px 14px', borderRadius: 99,
                    border: '1px solid rgba(251,191,36,0.4)', flexShrink: 0,
                  }}>
                    Ready
                  </span>
                : <span style={{
                    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em',
                    fontWeight: 800, color: 'rgba(255,255,255,0.5)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <Lock size={13} color="rgba(255,255,255,0.5)" /> Locked
                  </span>
              }
            </div>

            {!bossUnlocked && (
              <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.58)', paddingLeft: 64 }}>
                Complete all word levels above to unlock this boss challenge.
              </p>
            )}
          </button>
        ) : (
          <div
            style={{
              width: '100%', borderRadius: 22,
              border: '2px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              padding: '18px 20px 16px',
              color: 'white', textAlign: 'left',
              fontFamily: "'Nunito',sans-serif",
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 50, height: 50, borderRadius: 16, flexShrink: 0,
                background: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={24} color="rgba(255,255,255,0.85)" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Chapter Completion</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                  This chapter has no boss level. Complete all levels to finish it.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes boss-glow { 0%,100%{box-shadow:0 6px 20px rgba(251,191,36,0.55)} 50%{box-shadow:0 6px 32px rgba(251,191,36,0.9)} }
      `}</style>
    </div>
  );
}
