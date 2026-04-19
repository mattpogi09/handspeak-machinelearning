import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Circle, ChevronLeft, ChevronRight, Lightbulb, CheckCircle2, RotateCcw } from 'lucide-react';
import Camera from '../../components/Camera';
import { fetchJson, postJson } from '../../lib/api';
import { findWordIndex, getNextWord, getPreviousWord, normalizeWordEntry } from '../../lib/vocabulary';

const CAPTURE_INTERVAL_MS = 250;
const REQUIRED_STREAK = 2;
const MIN_FRAMES_FOR_VERIFY = 8;
const FRAME_BUFFER_SIZE = 20;
const DEFAULT_THRESHOLD = 0.48;

export default function WordPracticeSession() {
  const { wordId } = useParams();
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [status, setStatus] = useState('Ready to verify');
  const [matchStreak, setMatchStreak] = useState(0);
  const [latestResult, setLatestResult] = useState(null);
  const webcamRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const frameBufferRef = useRef([]);

  const takeFrame = useCallback(() => {
    if (!webcamRef.current) return null;
    return webcamRef.current.captureFrame?.() || webcamRef.current.getScreenshot?.() || null;
  }, []);

  useEffect(() => {
    let active = true;

    fetchJson('/api/gesture/words')
      .then((data) => {
        if (!active) return;
        setWords(data.map((entry, index) => normalizeWordEntry(entry, index)));
      })
      .catch((fetchError) => {
        if (active) setStatus(fetchError.message || 'Unable to load vocabulary');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!words.length) return;
    const index = findWordIndex(words, wordId);
    setCurrentWord(index >= 0 ? words[index] : words[0]);
  }, [words, wordId]);

  const currentIndex = useMemo(() => findWordIndex(words, currentWord?.id || wordId), [words, currentWord, wordId]);
  const nextWord = useMemo(() => getNextWord(words, currentWord?.id || wordId), [words, currentWord, wordId]);
  const previousWord = useMemo(() => getPreviousWord(words, currentWord?.id || wordId), [words, currentWord, wordId]);

  const advanceToNextWord = useCallback(() => {
    setTimeout(() => {
      if (nextWord) {
        navigate(`/practice/${nextWord.id}`, { replace: true });
      }
      setMatchStreak(0);
      setLatestResult(null);
    }, 450);
  }, [nextWord, navigate]);

  const verifyCurrentFrames = useCallback(async (triggeredByStop = false) => {
    if (isSubmittingRef.current || !currentWord) return;
    if (frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
      setStatus(`Need ${MIN_FRAMES_FOR_VERIFY - frameBufferRef.current.length} more frame(s) before checking`);
      return;
    }

    isSubmittingRef.current = true;
    setStatus(`Checking ${currentWord.label}...`);

    try {
      const response = await postJson('/api/gesture/verify/dynamic', {
        target_word: currentWord.word,
        frames: frameBufferRef.current.length ? frameBufferRef.current : ["data:image/jpeg;base64,mock"],
        top_k: 5,
        threshold: DEFAULT_THRESHOLD,
        ...(typeof triggeredByStop === 'string' ? { debug_override_word: triggeredByStop } : {})
      });


      setLatestResult(response);

      if (response.is_match) {
        if (triggeredByStop) {
          setStatus('Correct sign captured. Advancing...');
          setMatchStreak(0);
          advanceToNextWord();
          return;
        }

        setMatchStreak((value) => {
          const nextValue = value + 1;
          setStatus(`Match ${nextValue}/${REQUIRED_STREAK}`);
          if (nextValue >= REQUIRED_STREAK) {
            advanceToNextWord();
            return 0;
          }
          return nextValue;
        });
      } else {
        setMatchStreak(0);
        setStatus(triggeredByStop
          ? `Not matched. Closest: ${response.best_match}. Try again.`
          : `Closest: ${response.best_match}`);
      }
    } catch (error) {
      setStatus(error.message || 'Verification failed');
      setMatchStreak(0);
    } finally {
      isSubmittingRef.current = false;
    }
  }, [currentWord, advanceToNextWord]);

  const handleRecordToggle = useCallback(async () => {
    if (!recording) {
      setStatus('Recording... hold the sign steady');
      setRecording(true);
      return;
    }

    setRecording(false);

    const stopFrame = takeFrame();
    if (stopFrame) {
      frameBufferRef.current = [...frameBufferRef.current, stopFrame].slice(-FRAME_BUFFER_SIZE);
    }

    if (frameBufferRef.current.length > 0 && frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
      const padFrame = frameBufferRef.current[frameBufferRef.current.length - 1];
      while (frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
        frameBufferRef.current.push(padFrame);
      }
    }

    if (frameBufferRef.current.length === 0) {
      setStatus('No frames captured. The guide circle is only a helper, try centering your hand and hold for 1 second.');
      return;
    }

    await verifyCurrentFrames(true);
  }, [recording, verifyCurrentFrames, takeFrame]);

  const goTo = useCallback((idx) => {
    if (!words.length) return;
    const target = words[Math.max(0, Math.min(words.length - 1, idx))];
    navigate(`/practice/${target.id}`, { replace: true });
    setRecording(false);
    setMatchStreak(0);
    setLatestResult(null);
    setStatus('Ready to verify');
  }, [words, navigate]);

  useEffect(() => {
    if (!recording || !currentWord || !words.length) return undefined;

    const intervalId = window.setInterval(async () => {
      if (isSubmittingRef.current || !webcamRef.current) return;

      const screenshot = takeFrame();
      if (!screenshot) return;

      frameBufferRef.current = [...frameBufferRef.current, screenshot].slice(-FRAME_BUFFER_SIZE);
      if (frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
        setStatus(`Collecting frames ${frameBufferRef.current.length}/${MIN_FRAMES_FOR_VERIFY}...`);
        return;
      }

      await verifyCurrentFrames(false);
    }, CAPTURE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [recording, currentWord, words.length, verifyCurrentFrames, takeFrame]);

  useEffect(() => {
    frameBufferRef.current = [];
    setMatchStreak(0);
    setLatestResult(null);
    setStatus('Ready to verify');
  }, [currentWord?.id]);

  if (!currentWord) {
    return (
      <div style={{ minHeight: '100vh', background: '#041524', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        Loading practice word...
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(2,10,28,0.88)', backdropFilter: 'blur(10px)',
      padding: 20, fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{
        position: 'relative', background: '#0d2240', borderRadius: 28,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
        width: '100%', maxWidth: 960, maxHeight: 'calc(100vh - 40px)',
        overflow: 'hidden', display: 'flex', flexDirection: 'row',
        animation: 'modal-enter 0.3s ease-out',
      }}>
        <button onClick={() => navigate('/practice')}
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
          <X size={18} color="white" />
        </button>

        <div style={{ flex: 1, background: '#050d18', position: 'relative', borderRadius: '28px 0 0 28px', overflow: 'hidden', minHeight: 500 }}>
          <Camera ref={webcamRef} />

          {/* DEBUG CONTROLS */}
          <div style={{ position: 'absolute', top: 50, right: 16, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => verifyCurrentFrames(currentWord.word)}
              style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}>
              Test: Correct
            </button>
            <button onClick={() => verifyCurrentFrames('wrongword')}
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}>
              Test: Wrong Word
            </button>
          </div>

          <div style={{ position: 'absolute', top: 16, left: 16, background: recording ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', borderRadius: 99, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.3s' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: recording ? 'white' : '#ef4444', animation: recording ? 'rec-blink 1s ease-in-out infinite' : undefined }} />
            <span style={{ fontSize: 11, fontWeight: 900, color: 'white', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{recording ? 'Recording' : 'Camera'}</span>
          </div>

          <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <button onClick={() => previousWord && goTo(currentIndex - 1)} disabled={!previousWord}
              style={{ width: 44, height: 44, borderRadius: '50%', background: !previousWord ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', cursor: !previousWord ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !previousWord ? 0.45 : 1, transition: 'all 0.2s' }}>
              <ChevronLeft size={20} color="white" />
            </button>

            <button onClick={handleRecordToggle}
              style={{ width: 80, height: 80, borderRadius: '50%', border: `5px solid ${recording ? '#ef4444' : 'rgba(255,255,255,0.85)'}`, background: recording ? '#ef4444' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: recording ? '0 0 0 8px rgba(239,68,68,0.22), 0 6px 28px rgba(0,0,0,0.5)' : '0 6px 28px rgba(0,0,0,0.5)', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <Circle size={30} fill={recording ? 'white' : '#e63946'} color={recording ? 'white' : '#e63946'} />
            </button>

            <button onClick={() => nextWord && goTo(currentIndex + 1)} disabled={!nextWord}
              style={{ width: 44, height: 44, borderRadius: '50%', background: !nextWord ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', cursor: !nextWord ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !nextWord ? 0.45 : 1, transition: 'all 0.2s' }}>
              <ChevronRight size={20} color="white" />
            </button>
          </div>
        </div>

        <div style={{ width: 340, flexShrink: 0, background: 'linear-gradient(180deg,#0f2a54 0%,#091a38 100%)', display: 'flex', flexDirection: 'column', padding: '28px 22px 20px', gap: 14, overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Practice Target</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>{currentIndex + 1} / {words.length}</span>
          </div>

          <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, textAlign: 'center', padding: '2px 0', background: 'linear-gradient(135deg,#34d399,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {currentWord.label}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

          <div>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>Word Details</p>
            <div style={{ borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.95)', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 170, flexShrink: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 72, fontWeight: 900, color: '#0ea5e9', lineHeight: 1 }}>{currentWord.label}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 6 }}>ASL · Word</div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, margin: 0 }}>{currentWord.description}</p>

          <div style={{ background: 'rgba(59,130,246,0.15)', border: '1.5px solid rgba(96,165,250,0.35)', borderRadius: 16, padding: '12px 14px', fontSize: 13, color: '#93c5fd', lineHeight: 1.6, flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Lightbulb size={15} color="#93c5fd" style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Tip:</strong> {currentWord.tip}</span>
          </div>

          <div style={{ borderRadius: 16, background: latestResult?.is_match ? 'rgba(34,197,94,0.16)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 900, color: 'rgba(255,255,255,0.56)' }}>Model Status</span>
              {latestResult?.is_match ? <CheckCircle2 size={16} color="#4ade80" /> : null}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'white', fontWeight: 800 }}>{status}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{latestResult ? `Best match: ${latestResult.best_match} · Similarity: ${latestResult.similarity.toFixed(3)}` : 'Start recording to send frames to the model.'}</p>
            {matchStreak > 0 && (
              <p style={{ margin: 0, fontSize: 12, color: '#86efac', fontWeight: 800 }}>Progress streak: {matchStreak}/{REQUIRED_STREAK}</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', flexShrink: 0 }}>
            {words.map((word, index) => (
              <button key={word.id} onClick={() => goTo(index)} style={{ width: index === currentIndex ? 22 : 8, height: 8, borderRadius: 99, background: index === currentIndex ? 'linear-gradient(90deg,#34d399,#22d3ee)' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: 0, boxShadow: index === currentIndex ? '0 0 8px rgba(52,211,153,0.7)' : 'none', transition: 'all 0.25s ease', flexShrink: 0 }} />
            ))}
          </div>

          <button onClick={() => { setRecording(false); frameBufferRef.current = []; setMatchStreak(0); setLatestResult(null); setStatus('Ready to verify'); }} style={{ marginTop: 6, border: 'none', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <RotateCcw size={14} /> Reset Session
          </button>
        </div>
      </div>

      <style>{`
        @keyframes rec-blink { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes modal-enter { 0%{opacity:0;transform:scale(0.92) translateY(20px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
}