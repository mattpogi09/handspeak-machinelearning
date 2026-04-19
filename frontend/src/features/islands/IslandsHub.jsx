import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Star, MessageCircle, BookOpen, CheckCircle2 } from 'lucide-react';
import {
  getStoredStudyProgress,
  loadStudyProgress,
  isIslandUnlocked,
  isIslandCompleted,
  getIslandProgress,
} from '../study/studyVoyage';
import { useIslands } from '../../contexts/IslandsContext';

export default function IslandsHub() {
  const navigate = useNavigate();
  const { islands: rawIslands, islandsLoading } = useIslands();
  const [progress, setProgress] = useState(() => getStoredStudyProgress());

  useEffect(() => {
    let active = true;
    loadStudyProgress().then((normalized) => {
      if (active) setProgress(normalized);
    });
    return () => { active = false; };
  }, []);

  const islands = useMemo(() => rawIslands.map((island) => {
    const unlocked = isIslandUnlocked(progress, island.id);
    const completed = isIslandCompleted(progress, island.id);
    const islandProgress = getIslandProgress(progress, island.id);
    return {
      ...island,
      unlocked,
      completed,
      doneLevels: islandProgress.completedLevelIds.length,
      totalLevels: island.levels.length,
    };
  }), [rawIslands, progress]);

  const typeLabel = (type) => {
    if (type === 'alphabet') return 'Alphabet';
    if (type === 'conversation') return 'Conversation';
    return 'Vocabulary';
  };

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'Nunito', sans-serif",
      background: 'radial-gradient(ellipse at 20% -10%, #38bdf8 0%, #0ea5e9 22%, #0369a1 52%, #082f49 80%, #041421 100%)',
      color: 'white',
      padding: '28px 24px 60px',
    }}>
      <header style={{
        maxWidth: 1100, margin: '0 auto', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', marginBottom: 28,
      }}>
        <button onClick={() => navigate('/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.22)',
            padding: '9px 16px', borderRadius: 50, cursor: 'pointer',
            color: 'white', fontWeight: 800, fontSize: 13,
          }}>
          <ArrowLeft size={15} /> Dashboard
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>Your Voyage</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Islands of HandSpeak</div>
        </div>
      </header>

      <section style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 22,
          padding: '20px 24px', marginBottom: 28,
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'rgba(56,189,248,0.18)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <MessageCircle size={22} color="#60a5fa" />
          </div>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900 }}>One journey, three ways to practice</h2>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
              Each island gives you three modes: <strong>Learn</strong> the signs, <strong>Drill</strong> them for recall,
              and <strong>Converse</strong> by replying to real prompts. Start with Greetings — it's where your first conversation lives.
            </p>
          </div>
        </div>

        {islandsLoading && islands.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 700 }}>
            Loading islands…
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 18,
        }}>
          {islands.map((island) => {
            const locked = !island.unlocked;
            return (
              <button
                key={island.id}
                onClick={() => !locked && navigate(`/islands/${island.id}`)}
                disabled={locked}
                style={{
                  textAlign: 'left',
                  background: locked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(12px)',
                  border: `1.5px solid ${island.completed ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.18)'}`,
                  borderRadius: 22, padding: '18px 20px', cursor: locked ? 'not-allowed' : 'pointer',
                  color: 'white', opacity: locked ? 0.55 : 1,
                  display: 'flex', flexDirection: 'column', gap: 12,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => { if (!locked) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(0,0,0,0.35)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{island.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                        {typeLabel(island.type)}
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 900 }}>{island.title}</div>
                    </div>
                  </div>
                  {locked ? (
                    <Lock size={16} color="rgba(255,255,255,0.55)" />
                  ) : island.completed ? (
                    <CheckCircle2 size={18} color="#34d399" />
                  ) : (
                    <Star size={16} color="#fbbf24" />
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {island.hasLearn && (
                    <span style={{
                      fontSize: 11, fontWeight: 900, padding: '3px 8px', borderRadius: 99,
                      background: 'rgba(96,165,250,0.18)', color: '#93c5fd', letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>
                      <BookOpen size={10} style={{ display: 'inline', marginRight: 4 }} />
                      Learn
                    </span>
                  )}
                  {island.hasDrill && (
                    <span style={{
                      fontSize: 11, fontWeight: 900, padding: '3px 8px', borderRadius: 99,
                      background: 'rgba(251,191,36,0.18)', color: '#fde68a', letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>
                      Drill
                    </span>
                  )}
                  {island.hasConverse && (
                    <span style={{
                      fontSize: 11, fontWeight: 900, padding: '3px 8px', borderRadius: 99,
                      background: 'rgba(52,211,153,0.22)', color: '#6ee7b7', letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>
                      <MessageCircle size={10} style={{ display: 'inline', marginRight: 4 }} />
                      Converse
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
                  {island.intro?.description || 'Master this island step by step.'}
                </div>

                <div>
                  <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      width: `${island.totalLevels ? Math.round((island.doneLevels / island.totalLevels) * 100) : 0}%`,
                      background: 'linear-gradient(90deg,#34d399,#22d3ee)',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
                    {island.doneLevels}/{island.totalLevels} levels
                    {locked ? ' · Locked' : island.completed ? ' · Completed' : ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
