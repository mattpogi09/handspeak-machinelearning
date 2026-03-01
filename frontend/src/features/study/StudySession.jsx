import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Circle, ArrowRight, CheckCircle } from 'lucide-react';
import { STUDY_TOPICS } from '../../data/aslData';
import Camera from '../../components/Camera';

export default function StudySession() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState({ completed_topics: [], completed_phrases: [], level: 1, xp: 0 });

  const topic = STUDY_TOPICS.find((t) => t.id === topicId) || STUDY_TOPICS[0];
  const currentPhrase = topic.phrases[phraseIndex];
  const isLast = phraseIndex === topic.phrases.length - 1;

  useEffect(() => {
    const stored = localStorage.getItem('handspeak_study_progress');
    if (stored) setProgress(JSON.parse(stored));
  }, []);

  const handleClose = useCallback(() => navigate('/study'), [navigate]);

  const markComplete = () => {
    const newProgress = { ...progress };
    if (!newProgress.completed_phrases.includes(currentPhrase.id)) {
      newProgress.completed_phrases.push(currentPhrase.id);
      newProgress.xp += 10;
      newProgress.level = 1 + Math.floor(newProgress.xp / 50);
    }
    const allDone = topic.phrases.every((p) => newProgress.completed_phrases.includes(p.id));
    if (allDone && !newProgress.completed_topics.includes(topicId)) {
      newProgress.completed_topics.push(topicId);
    }
    setProgress(newProgress);
    localStorage.setItem('handspeak_study_progress', JSON.stringify(newProgress));
    if (!isLast) {
      setPhraseIndex(phraseIndex + 1);
    } else {
      navigate('/study');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div style={{ position: 'relative', background: '#1a2a3a', borderRadius: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.65)', width: '100%', maxWidth: 920, maxHeight: 'calc(100vh - 40px)', overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>

        {/* Close */}
        <button onClick={handleClose}
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        >
          <X size={20} color="white" />
        </button>

        {/* Camera panel */}
        <div style={{ flex: 1, background: '#0a0a0a', position: 'relative', borderRadius: '24px 0 0 24px', overflow: 'hidden', minHeight: 500 }}>
          <Camera />
          <button onClick={() => setRecording(!recording)}
            style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', width: 76, height: 76, borderRadius: '50%', border: `4px solid ${recording ? '#ef4444' : 'rgba(255,255,255,0.9)'}`, background: recording ? '#ef4444' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.45)', transition: 'all 0.2s' }}>
            <Circle size={30} fill={recording ? 'white' : '#e63946'} color={recording ? 'white' : '#e63946'} />
          </button>
        </div>

        {/* Info panel */}
        <div style={{ width: 340, flexShrink: 0, background: '#1e3246', display: 'flex', flexDirection: 'column', padding: '32px 24px 20px', gap: 14, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: '#90caf9', textTransform: 'uppercase', letterSpacing: '0.22em' }}>Practice Target</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>{phraseIndex + 1} / {topic.phrases.length}</span>
          </div>

          <div style={{ fontSize: 34, fontWeight: 900, color: 'white', lineHeight: 1.25, textAlign: 'center' }}>{currentPhrase.label}</div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 110, fontSize: 14, color: '#90a4ae', flexShrink: 0 }}>
            [Sign Diagram Placeholder]
          </div>

          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, margin: 0 }}>{currentPhrase.description}</p>

          <div style={{ background: 'rgba(26,115,232,0.14)', border: '1px solid rgba(26,115,232,0.3)', borderRadius: 16, padding: '12px 16px', fontSize: 13, color: '#90caf9', lineHeight: 1.6, flexShrink: 0 }}>
            <strong>Tip:</strong> {currentPhrase.tip}
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
            {topic.phrases.map((_, i) => (
              <div key={i} style={{ height: 8, borderRadius: 4, transition: 'all 0.3s', width: i <= phraseIndex ? 24 : 10, background: i < phraseIndex ? '#00bfa5' : i === phraseIndex ? '#42a5f5' : 'rgba(255,255,255,0.2)' }} />
            ))}
          </div>

          {/* Next / Finish button */}
          <button onClick={markComplete}
            style={{ width: '100%', padding: '16px 0', borderRadius: 16, border: 'none', background: isLast ? '#00bfa5' : '#42a5f5', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 18px rgba(0,0,0,0.3)', flexShrink: 0, transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {isLast ? <><CheckCircle size={18} /> Finish Topic</> : <>Next Sign <ArrowRight size={18} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
