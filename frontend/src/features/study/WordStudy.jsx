import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Compass, Lock, Play, Star, Target, Hand } from 'lucide-react';
import { fetchJson } from '../../lib/api';
import { groupWordsByChapter, normalizeWordEntry } from '../../lib/vocabulary';

export default function WordStudy() {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedWords, setCompletedWords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('handspeak_completed_words') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let active = true;

    fetchJson('/api/gesture/words')
      .then((data) => {
        if (!active) return;
        const normalized = data.map((entry, index) => normalizeWordEntry(entry, index));
        setWords(normalized);
        setChapters(groupWordsByChapter(normalized));
        setError('');
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message || 'Failed to load study words');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const completedCount = completedWords.length;
  const progressPct = Math.round((completedCount / Math.max(words.length, 1)) * 100);
  const activeWord = useMemo(() => words.find((word) => !completedWords.includes(word.id)) || words[0], [words, completedWords]);

  const openWord = (chapterId, wordId) => {
    navigate(`/study/${chapterId}/${wordId}`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#041421', color: 'white', fontWeight: 900 }}>
        Loading study words...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#041421', color: '#fecaca', fontWeight: 900, textAlign: 'center', padding: 20 }}>
        <div>
          <p style={{ margin: '0 0 12px' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ border: 'none', borderRadius: 14, padding: '12px 18px', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 900 }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Nunito', sans-serif", background: 'radial-gradient(ellipse at 18% 0%, #0ea5e9 0%, #0369a1 30%, #082f49 65%, #041421 100%)', overflowX: 'hidden', position: 'relative' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 28px', flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <button onClick={() => navigate('/dashboard')} style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
          <ArrowLeft size={20} color="white" />
        </button>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0, textShadow: '0 2px 12px rgba(0,0,0,0.5)', letterSpacing: '-0.01em' }}>
            Word Study World
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
            Learn the 100 target words · Verify each gesture
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1.5px solid rgba(255,255,255,0.28)', borderRadius: 50, padding: '10px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <Compass size={17} color="#fde68a" />
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Level</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1.1 }}>{Math.floor(completedCount / 10) + 1}</div>
          </div>
          <div style={{ width: 80, height: 8, borderRadius: 99, background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#34d399,#22d3ee)', width: `${progressPct}%`, transition: 'width 0.8s ease', boxShadow: '0 0 8px rgba(52,211,153,0.7)' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#fde68a', whiteSpace: 'nowrap' }}>{completedCount} / {words.length} words</span>
        </div>
      </header>

      <div style={{ width: '100%', flexShrink: 0, lineHeight: 0, position: 'relative', zIndex: 1 }}>
        <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 48 }}>
          <path d="M0 32 C240 8,480 44,720 24 C960 4,1200 40,1440 20 L1440 48 L0 48Z" fill="rgba(255,255,255,0.05)" />
          <path d="M0 40 C360 16,720 48,1080 28 C1260 18,1380 44,1440 32 L1440 48 L0 48Z" fill="rgba(255,255,255,0.04)" />
        </svg>
      </div>

      <div style={{ flex: 1, overflowX: 'auto', padding: '16px 32px 24px', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 14, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: 20, margin: 0, fontWeight: 900 }}>Chapters</h2>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Choose a target word and open the camera challenge.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fde68a', fontWeight: 900 }}>
              <Target size={16} />
              <span>Next: {activeWord?.label || 'All done'}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {chapters.map((chapter) => {
              const chapterCompleted = chapter.words.every((word) => completedWords.includes(word.id));
              return (
                <div key={chapter.id} style={{ borderRadius: 24, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', padding: 18, boxShadow: '0 12px 34px rgba(0,0,0,0.22)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{chapter.title}</h3>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.68)', fontWeight: 700 }}>{chapter.words.length} words</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: chapterCompleted ? '#86efac' : '#fde68a', fontWeight: 900 }}>
                      {chapterCompleted ? <CheckCircle2 size={16} /> : <Play size={16} />}
                      <span>{chapterCompleted ? 'Completed' : 'In progress'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {chapter.words.map((word) => {
                      const completed = completedWords.includes(word.id);
                      return (
                        <button key={word.id} onClick={() => openWord(chapter.id, word.id)} style={{ minWidth: 150, borderRadius: 18, border: completed ? '2px solid rgba(52,211,153,0.5)' : '2px solid rgba(255,255,255,0.12)', background: completed ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)', color: 'white', padding: '14px 14px 12px', cursor: 'pointer', textAlign: 'left', fontFamily: "'Nunito', sans-serif" }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                            <strong style={{ fontSize: 17 }}>{word.label}</strong>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 900 }}>#{word.order}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>{word.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}