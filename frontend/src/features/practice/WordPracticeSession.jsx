import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import YouTubeTutorial from '../../components/YouTubeTutorial';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Circle, ChevronLeft, ChevronRight, Lightbulb, CheckCircle2, RotateCcw } from 'lucide-react';
import Camera from '../../components/Camera';
import GestureProcessingModal from '../../components/GestureProcessingModal';
import { fetchJson, postJson } from '../../lib/api';
import { findWordIndex, getNextWord, getPreviousWord, normalizeWordEntry } from '../../lib/vocabulary';

const CAPTURE_INTERVAL_MS = 250;
const REQUIRED_STREAK = 2;
const MIN_FRAMES_FOR_VERIFY = 8;
const FRAME_BUFFER_SIZE = 20;
const DEFAULT_THRESHOLD = 0.48;
const COUNTDOWN_SECONDS = 3;

export default function WordPracticeSession() {
  const { wordId } = useParams();
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingPhase, setProcessingPhase] = useState('waiting');
  const [processingMessage, setProcessingMessage] = useState('');
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [status, setStatus] = useState('Ready to verify');
  const [matchStreak, setMatchStreak] = useState(0);
  const [latestResult, setLatestResult] = useState(null);
  const webcamRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const frameBufferRef = useRef([]);
  const processingTimersRef = useRef([]);

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
      setReadyToSubmit(false);
      setIsCountingDown(false);
      setCountdown(0);
    }, 450);
  }, [nextWord, navigate]);

  const clearProcessingTimers = useCallback(() => {
    processingTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    processingTimersRef.current = [];
  }, []);

  const startProcessingFeedback = useCallback(() => {
    clearProcessingTimers();
    setShowProcessingModal(true);
    setProcessingPhase('waiting');
    setProcessingMessage('Waiting for your recording package...');

    const readingTimer = window.setTimeout(() => {
      setProcessingPhase('reading');
      setProcessingMessage('Reading captured frames...');
    }, 320);
    const checkingTimer = window.setTimeout(() => {
      setProcessingPhase('checking');
      setProcessingMessage('Checking your gesture...');
    }, 760);

    processingTimersRef.current.push(readingTimer, checkingTimer);
  }, [clearProcessingTimers]);

  const finishProcessingFeedback = useCallback((isSuccess, message) => {
    clearProcessingTimers();
    setProcessingPhase(isSuccess ? 'success' : 'error');
    setProcessingMessage(message);

    const closeTimer = window.setTimeout(() => {
      setShowProcessingModal(false);
    }, isSuccess ? 900 : 1500);
    processingTimersRef.current.push(closeTimer);
  }, [clearProcessingTimers]);

  useEffect(() => () => {
    clearProcessingTimers();
  }, [clearProcessingTimers]);

  const verifyCurrentFrames = useCallback(async (debugOverrideWord = null) => {
    if (isSubmittingRef.current || !currentWord) return;
    if (frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
      setStatus(`Need ${MIN_FRAMES_FOR_VERIFY - frameBufferRef.current.length} more frame(s) before checking`);
      return;
    }

    isSubmittingRef.current = true;
    setReadyToSubmit(false);
    startProcessingFeedback();
    setStatus(`Checking ${currentWord.label}...`);

    try {
      const response = await postJson('/api/gesture/verify/dynamic', {
        target_word: currentWord.word,
        frames: frameBufferRef.current.length ? frameBufferRef.current : ["data:image/jpeg;base64,mock"],
        top_k: 5,
        threshold: DEFAULT_THRESHOLD,
        ...(debugOverrideWord ? { debug_override_word: debugOverrideWord } : {}),
      });


      setLatestResult(response);

      if (response.is_match) {
        const nextStreak = matchStreak + 1;
        if (nextStreak >= REQUIRED_STREAK) {
          setMatchStreak(0);
          setStatus(`Match ${REQUIRED_STREAK}/${REQUIRED_STREAK}. Advancing...`);
          finishProcessingFeedback(true, `Correct! Streak ${REQUIRED_STREAK}/${REQUIRED_STREAK}.`);
          advanceToNextWord();
        } else {
          setMatchStreak(nextStreak);
          setStatus(`Match ${nextStreak}/${REQUIRED_STREAK}. Record again then submit.`);
          finishProcessingFeedback(true, `Correct! Streak ${nextStreak}/${REQUIRED_STREAK}.`);
        }
      } else {
        const similarity = Number(response.similarity ?? 0).toFixed(3);
        const bestMatch = String(response.best_match || 'unknown').toUpperCase();
        setMatchStreak(0);
        setStatus(`Wrong gesture. Closest: ${bestMatch} · Similarity ${similarity}`);
        finishProcessingFeedback(false, `Wrong gesture. Closest: ${bestMatch} · Similarity ${similarity}`);
      }
    } catch (error) {
      setStatus(error.message || 'Verification failed');
      setMatchStreak(0);
      setReadyToSubmit(true);
      finishProcessingFeedback(false, error.message || 'Could not submit this recording.');
    } finally {
      isSubmittingRef.current = false;
    }
  }, [advanceToNextWord, currentWord, finishProcessingFeedback, matchStreak, startProcessingFeedback]);

  const handleRecordToggle = useCallback(() => {
    if (isSubmittingRef.current || isCountingDown) return;

    if (!recording) {
      frameBufferRef.current = [];
      setLatestResult(null);
      setReadyToSubmit(false);
      setCountdown(COUNTDOWN_SECONDS);
      setIsCountingDown(true);
      setStatus(`Get ready... ${COUNTDOWN_SECONDS}`);
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
      setReadyToSubmit(false);
      setStatus('No frames captured. The guide circle is only a helper, try centering your hand and hold for 1 second.');
      return;
    }

    setReadyToSubmit(true);
    setStatus('Recording stopped. Press submit to verify.');
  }, [isCountingDown, recording, takeFrame]);

  useEffect(() => {
    if (!isCountingDown) return undefined;
    if (countdown <= 0) {
      setIsCountingDown(false);
      setRecording(true);
      setStatus('Recording... hold the sign steady');
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setCountdown((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [countdown, isCountingDown]);

  const goTo = useCallback((idx) => {
    if (!words.length) return;
    const target = words[Math.max(0, Math.min(words.length - 1, idx))];
    navigate(`/practice/${target.id}`, { replace: true });
    setRecording(false);
    setReadyToSubmit(false);
    setIsCountingDown(false);
    setCountdown(0);
    setMatchStreak(0);
    setLatestResult(null);
    setStatus('Ready to verify');
  }, [words, navigate]);

  useEffect(() => {
    if (!recording || !currentWord || !words.length) return undefined;

    const intervalId = window.setInterval(() => {
      if (isSubmittingRef.current || !webcamRef.current) return;

      const screenshot = takeFrame();
      if (!screenshot) return;

      frameBufferRef.current = [...frameBufferRef.current, screenshot].slice(-FRAME_BUFFER_SIZE);
      if (frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
        setStatus(`Collecting frames ${frameBufferRef.current.length}/${MIN_FRAMES_FOR_VERIFY}...`);
      } else {
        setStatus(`Frames ready ${frameBufferRef.current.length}/${MIN_FRAMES_FOR_VERIFY}. Tap stop when done.`);
      }
    }, CAPTURE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [recording, currentWord, words.length, takeFrame]);

  useEffect(() => {
    frameBufferRef.current = [];
    setMatchStreak(0);
    setLatestResult(null);
    setStatus('Ready to verify');
    setReadyToSubmit(false);
    setIsCountingDown(false);
    setCountdown(0);
    clearProcessingTimers();
    setShowProcessingModal(false);
  }, [clearProcessingTimers, currentWord?.id]);

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
      <div
        className="flex flex-col md:flex-row w-full max-w-[960px] max-h-[calc(100vh-40px)] overflow-y-auto md:overflow-hidden"
        style={{
        position: 'relative', background: '#0d2240', borderRadius: 28,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
        animation: 'modal-enter 0.3s ease-out',
      }}>
        <button onClick={() => navigate('/practice')}
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
          <X size={18} color="white" />
        </button>

        <div
          className="flex-1 relative overflow-hidden min-h-[400px] md:min-h-[500px]"
          style={{
            background: '#050d18',
            borderRadius: '28px 28px 0 0',
          }}>
          <style>{`
            @media (min-width: 768px) {
              .flex-1.relative {
                border-radius: 28px 0 0 28px !important;
              }
            }
          `}</style>
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
            <span style={{ fontSize: 11, fontWeight: 900, color: 'white', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {isCountingDown ? `Starting ${countdown}` : recording ? 'Recording' : readyToSubmit ? 'Ready to submit' : 'Camera'}
            </span>
          </div>

          {isCountingDown && (
            <div style={{
              position: 'absolute',
              inset: 0,
              zIndex: 9,
              background: 'rgba(2,10,28,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: 110,
                height: 110,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)',
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 46,
                fontWeight: 900,
              }}>
                {countdown}
              </div>
            </div>
          )}

          <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <button onClick={() => previousWord && goTo(currentIndex - 1)} disabled={!previousWord}
              style={{ width: 44, height: 44, borderRadius: '50%', background: !previousWord ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', cursor: !previousWord ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !previousWord ? 0.45 : 1, transition: 'all 0.2s' }}>
              <ChevronLeft size={20} color="white" />
            </button>

            <button onClick={handleRecordToggle}
              disabled={isCountingDown}
              style={{ width: 80, height: 80, borderRadius: '50%', border: `5px solid ${recording ? '#ef4444' : 'rgba(255,255,255,0.85)'}`, background: recording ? '#ef4444' : 'white', cursor: isCountingDown ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: recording ? '0 0 0 8px rgba(239,68,68,0.22), 0 6px 28px rgba(0,0,0,0.5)' : '0 6px 28px rgba(0,0,0,0.5)', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)', opacity: isCountingDown ? 0.55 : 1 }}>
              <Circle size={30} fill={recording ? 'white' : '#e63946'} color={recording ? 'white' : '#e63946'} />
            </button>

            {readyToSubmit && (
              <button
                onClick={() => verifyCurrentFrames()}
                disabled={isSubmittingRef.current || isCountingDown}
                style={{
                  border: 'none',
                  borderRadius: 12,
                  padding: '11px 14px',
                  minWidth: 86,
                  cursor: isSubmittingRef.current || isCountingDown ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg,#34d399,#22d3ee)',
                  color: '#064e3b',
                  fontWeight: 900,
                  fontSize: 12.5,
                  opacity: isSubmittingRef.current || isCountingDown ? 0.6 : 1,
                }}
              >
                Submit
              </button>
            )}

            <button onClick={() => nextWord && goTo(currentIndex + 1)} disabled={!nextWord}
              style={{ width: 44, height: 44, borderRadius: '50%', background: !nextWord ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', cursor: !nextWord ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !nextWord ? 0.45 : 1, transition: 'all 0.2s' }}>
              <ChevronRight size={20} color="white" />
            </button>
          </div>
        </div>

        <div 
          className="w-full md:w-[340px]"
          style={{ flexShrink: 0, background: 'linear-gradient(180deg,#0f2a54 0%,#091a38 100%)', display: 'flex', flexDirection: 'column', padding: '28px 22px 20px', gap: 14, overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Practice Target</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>{currentIndex + 1} / {words.length}</span>
          </div>

          <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, textAlign: 'center', padding: '2px 0', background: 'linear-gradient(135deg,#34d399,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {currentWord.label}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

          <YouTubeTutorial word={currentWord.label} isLetter={false} />

          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, margin: 0 }}>{currentWord.description}</p>

          <div style={{ background: 'rgba(59,130,246,0.15)', border: '1.5px solid rgba(96,165,250,0.35)', borderRadius: 16, padding: '12px 14px', fontSize: 13, color: '#93c5fd', lineHeight: 1.6, flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Lightbulb size={15} color="#93c5fd" style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Tip:</strong> {currentWord.tip}</span>
          </div>

          <div style={{
            borderRadius: 16,
            background: latestResult
              ? latestResult.is_match
                ? 'rgba(34,197,94,0.16)'
                : 'rgba(239,68,68,0.16)'
              : 'rgba(255,255,255,0.08)',
            border: latestResult
              ? latestResult.is_match
                ? '1px solid rgba(74,222,128,0.35)'
                : '1px solid rgba(248,113,113,0.4)'
              : '1px solid rgba(255,255,255,0.12)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 900, color: 'rgba(255,255,255,0.56)' }}>Model Status</span>
              {latestResult?.is_match ? <CheckCircle2 size={16} color="#4ade80" /> : null}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: latestResult ? (latestResult.is_match ? '#bbf7d0' : '#fecaca') : 'white', fontWeight: 800 }}>{status}</p>
            <p style={{ margin: 0, fontSize: 12, color: latestResult ? (latestResult.is_match ? 'rgba(187,247,208,0.9)' : 'rgba(254,202,202,0.9)') : 'rgba(255,255,255,0.65)' }}>
              {latestResult
                ? `Best match: ${String(latestResult.best_match || 'unknown').toUpperCase()} · Similarity: ${Number(latestResult.similarity ?? 0).toFixed(3)}`
                : 'Start recording to send frames to the model.'}
            </p>
            {latestResult && (
              <p style={{ margin: 0, fontSize: 12, color: latestResult.is_match ? '#86efac' : '#fca5a5', fontWeight: 800 }}>
                Progress streak: {matchStreak}/{REQUIRED_STREAK}{latestResult.is_match ? '' : ' (reset on miss)'}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', flexShrink: 0 }}>
            {words.map((word, index) => (
              <button key={word.id} onClick={() => goTo(index)} style={{ width: index === currentIndex ? 22 : 8, height: 8, borderRadius: 99, background: index === currentIndex ? 'linear-gradient(90deg,#34d399,#22d3ee)' : 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: 0, boxShadow: index === currentIndex ? '0 0 8px rgba(52,211,153,0.7)' : 'none', transition: 'all 0.25s ease', flexShrink: 0 }} />
            ))}
          </div>

          <button onClick={() => { setRecording(false); setReadyToSubmit(false); setIsCountingDown(false); setCountdown(0); frameBufferRef.current = []; setMatchStreak(0); setLatestResult(null); setStatus('Ready to verify'); }} style={{ marginTop: 6, border: 'none', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <RotateCcw size={14} /> Reset Session
          </button>
        </div>
      </div>

      <GestureProcessingModal
        open={showProcessingModal}
        phase={processingPhase}
        message={processingMessage}
        onClose={() => setShowProcessingModal(false)}
      />

      <style>{`
        @keyframes rec-blink { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes modal-enter { 0%{opacity:0;transform:scale(0.92) translateY(20px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
}