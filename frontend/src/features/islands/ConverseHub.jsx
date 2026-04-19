import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Repeat2, Layers } from 'lucide-react';
import { useIslands } from '../../contexts/IslandsContext';

export default function ConverseHub() {
  const navigate = useNavigate();
  const { islandId } = useParams();
  const { getIslandById } = useIslands();
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

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'Nunito', sans-serif",
      background: 'radial-gradient(ellipse at 30% -10%, #22d3ee 0%, #0ea5e9 22%, #0369a1 52%, #082f49 80%, #041421 100%)',
      color: 'white',
      padding: '28px 24px 60px',
    }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <button onClick={() => navigate(`/islands/${islandId}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22,
            background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.22)',
            padding: '9px 16px', borderRadius: 50, cursor: 'pointer',
            color: 'white', fontWeight: 800, fontSize: 13,
          }}>
          <ArrowLeft size={15} /> Island Overview
        </button>

        <div style={{
          background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 24,
          padding: '24px 26px', marginBottom: 22,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 16,
              background: 'rgba(255,255,255,0.12)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>
              <MessageCircle size={26} color="#34d399" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                Converse Mode
              </div>
              <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 900 }}>{island.title}</h1>
            </div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 14.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>
            Choose a conversation format. Reply Quest is a focused single-prompt loop. Chains are multi-turn exchanges with coherence scoring.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <button
            onClick={() => navigate(`/islands/${islandId}/converse/reply-quest`)}
            style={{
              textAlign: 'left', background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)',
              borderRadius: 22, padding: '18px 20px', cursor: 'pointer', color: 'white',
              display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(0,0,0,0.35)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'rgba(52,211,153,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Repeat2 size={20} color="#34d399" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Reply Quest</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>Single-prompt loop</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}>
              Focus on one prompt at a time with immediate feedback and response-type coaching.
            </p>
          </button>

          <button
            onClick={() => navigate(`/islands/${islandId}/converse/chains`)}
            style={{
              textAlign: 'left', background: 'linear-gradient(135deg, rgba(52,211,153,0.22), rgba(34,211,238,0.12))',
              border: '1.5px solid rgba(52,211,153,0.55)', borderRadius: 22, padding: '18px 20px', cursor: 'pointer',
              color: 'white', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(0,0,0,0.35)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Layers size={20} color="#22d3ee" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Conversation Chains</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>Multi-turn sessions</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}>
              Practice 3-6 turn exchanges with coherence scoring and a full-session summary.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
