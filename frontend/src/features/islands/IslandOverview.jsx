import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Target, MessageCircle, Lightbulb, Star, Lock } from 'lucide-react';
import {
  getIslandProgress,
  getStoredStudyProgress,
  loadStudyProgress,
  isIslandUnlocked,
} from '../study/studyVoyage';
import { useIslands } from '../../contexts/IslandsContext';
import EmojiIcon from '../../components/EmojiIcon';

export default function IslandOverview() {
  const navigate = useNavigate();
  const { islandId } = useParams();
  const { getIslandById } = useIslands();
  const [progress, setProgress] = useState(() => getStoredStudyProgress());
  const [conversationStats, setConversationStats] = useState(null);

  useEffect(() => {
    let active = true;
    loadStudyProgress().then((normalized) => {
      if (!active) return;
      setProgress(normalized);
      const islandStats = normalized?.conversation?.islands?.[islandId];
      if (islandStats) setConversationStats(islandStats);
    });
    return () => { active = false; };
  }, [islandId]);

  const island = getIslandById(islandId);

  if (!island) {
    return (
      <div style={{ minHeight: '100vh', background: '#041524', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>Island not found.</p>
          <button onClick={() => navigate('/islands')}
            style={{ background: 'white', color: '#0369a1', border: 'none', borderRadius: 14, padding: '10px 18px', fontWeight: 900, cursor: 'pointer' }}>
            Back to Islands
          </button>
        </div>
      </div>
    );
  }

  const islandProgress = getIslandProgress(progress, islandId);
  const unlocked = isIslandUnlocked(progress, islandId);

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'Nunito', sans-serif",
      background: 'radial-gradient(ellipse at 30% -10%, #22d3ee 0%, #0ea5e9 22%, #0369a1 52%, #082f49 80%, #041421 100%)',
      color: 'white',
      padding: '28px 24px 60px',
    }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <button onClick={() => navigate('/islands')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22,
            background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.22)',
            padding: '9px 16px', borderRadius: 50, cursor: 'pointer',
            color: 'white', fontWeight: 800, fontSize: 13,
          }}>
          <ArrowLeft size={15} /> All Islands
        </button>

        {/* Hero */}
        <div style={{
          background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 24,
          padding: '26px 28px', marginBottom: 22,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)'
            }}>
              <EmojiIcon emoji={island.icon} size={30} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                {island.type === 'alphabet' ? 'Foundations' : island.type === 'conversation' ? 'Conversation Island' : 'Vocabulary Island'} · {island.difficulty}
              </div>
              <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 900 }}>{island.intro?.title || island.title}</h1>
            </div>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.82)' }}>
            {island.intro?.story}
          </p>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '10px 14px', borderRadius: 14,
            background: 'rgba(253,224,71,0.12)', border: '1px solid rgba(253,224,71,0.28)',
            fontSize: 13, color: '#fde68a',
          }}>
            <Lightbulb size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <span><strong>Tip:</strong> {island.intro?.hint}</span>
          </div>
        </div>

        {!unlocked && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.35)',
            borderRadius: 18, padding: '14px 18px', marginBottom: 22,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#fecaca',
          }}>
            <Lock size={16} /> Finish the previous island to unlock all modes here.
          </div>
        )}

        {/* Mode cards */}
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <ModeCard
            icon={<BookOpen size={22} color={island.hasLearn ? '#60a5fa' : 'rgba(255,255,255,0.35)'} />}
            accent={island.hasLearn ? '#60a5fa' : 'rgba(255,255,255,0.35)'}
            label="Learn"
            description={
              island.hasLearn
                ? 'Walk through each sign in this island, one at a time, with the camera coach.'
                : 'Learn mode is not available for this island.'
            }
            progress={
              island.hasLearn
                ? `${islandProgress.completedLevelIds.length}/${island.levels.length} levels`
                : 'Not available'
            }
            disabled={!unlocked || !island.hasLearn}
            onClick={() => island.hasLearn && navigate(`/study/${islandId}`)}
          />

          <ModeCard
            icon={<Target size={22} color={island.hasDrill ? '#fbbf24' : 'rgba(255,255,255,0.35)'} />}
            accent={island.hasDrill ? '#fbbf24' : 'rgba(255,255,255,0.35)'}
            label="Drill"
            description={
              island.hasDrill
                ? 'Rapid recall across the full 100-word set. Keeps your signs sharp.'
                : 'Drill mode is not available for this island.'
            }
            progress={island.hasDrill ? 'Open practice' : 'Not available'}
            disabled={!unlocked || !island.hasDrill}
            onClick={() => island.hasDrill && navigate('/practice')}
          />

          <ModeCard
            icon={<MessageCircle size={22} color={island.hasConverse ? '#34d399' : 'rgba(255,255,255,0.45)'} />}
            accent={island.hasConverse ? '#34d399' : 'rgba(255,255,255,0.35)'}
            label="Converse"
            description={
              island.hasConverse
                ? 'Reply to NPC prompts in real conversations. This is where signing becomes a skill.'
                : 'Reply Quest unlocks on this island in a future phase.'
            }
            progress={
              island.hasConverse
                ? conversationStats
                  ? `${conversationStats.prompts_correct || 0} prompts correct · ${conversationStats.sessions_completed || 0} sessions`
                  : 'Ready to start'
                : 'Coming soon'
            }
            disabled={!unlocked || !island.hasConverse}
            highlight={island.hasConverse && unlocked}
            onClick={() => island.hasConverse && navigate(`/islands/${islandId}/converse`)}
          />
        </div>
      </div>
    </div>
  );
}

function ModeCard({ icon, label, description, progress, accent, onClick, disabled, highlight }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: 'left',
        background: highlight
          ? 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(34,211,238,0.12))'
          : 'rgba(255,255,255,0.08)',
        border: `1.5px solid ${highlight ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.18)'}`,
        borderRadius: 22,
        padding: '18px 20px',
        color: 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(0,0,0,0.35)'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: 'rgba(255,255,255,0.12)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Mode</div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{label}</div>
        </div>
        {highlight && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: 'rgba(52,211,153,0.22)', color: '#6ee7b7', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            <Star size={10} /> Active
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}>{description}</p>
      <div style={{ fontSize: 12, fontWeight: 800, color: accent }}>{progress}</div>
    </button>
  );
}
