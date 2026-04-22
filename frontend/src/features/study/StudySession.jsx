import React, { useState, useEffect, useCallback, useRef } from 'react';
import YouTubeTutorial from '../../components/YouTubeTutorial';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Circle, ArrowRight, CheckCircle, Lock, Star, Lightbulb, Waves } from 'lucide-react';
import Camera from '../../components/Camera';
import GestureProcessingModal from '../../components/GestureProcessingModal';
import { postJson } from '../../lib/api';
import {
  getInitialStudyProgress,
  getStoredStudyProgress,
  loadStudyProgress,
  saveStudyProgress,
  isIslandUnlocked,
  isLevelCompleted,
  completeIslandLevel,
} from './studyVoyage';
import { useIslands } from '../../contexts/IslandsContext';

const LETTER_CAPTURE_INTERVAL_MS = 450;
const WORD_CAPTURE_INTERVAL_MS = 250;
const REQUIRED_STREAK = 3;
const LETTER_MIN_FRAMES_FOR_VERIFY = 3;
const WORD_MIN_FRAMES_FOR_VERIFY = 8;
const LETTER_FRAME_BUFFER_SIZE = 5;
const WORD_FRAME_BUFFER_SIZE = 20;
const LETTER_THRESHOLD = 0.66;
const WORD_THRESHOLD = 0.48;
const COUNTDOWN_SECONDS = 3;

export default function StudySession() {
  const { islandId, levelId } = useParams();
  const navigate = useNavigate();
  const { getIslandById } = useIslands();
  const [recording, setRecording] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingPhase, setProcessingPhase] = useState('waiting');
  const [processingMessage, setProcessingMessage] = useState('');
  const [progress, setProgress] = useState(getInitialStudyProgress());
  const [showSuccess, setShowSuccess] = useState(false);
  const [status, setStatus] = useState('Ready to verify');
  const [latestResult, setLatestResult] = useState(null);
  const [matchStreak, setMatchStreak] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState(0);
  const webcamRef = useRef(null);
  const frameBufferRef = useRef([]);
  const isSubmittingRef = useRef(false);
  const processingTimersRef = useRef([]);

  const takeFrame = useCallback(() => {
    if (!webcamRef.current) return null;
    return webcamRef.current.captureFrame?.() || webcamRef.current.getScreenshot?.() || null;
  }, []);

  const island = getIslandById(islandId);
  const phraseLevel = island?.levels.find((level) => level.id === levelId) || null;
  const activeLevel = phraseLevel;

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

  const handleClose = useCallback(() => {
    if (!island) { navigate('/study'); return; }
    navigate(`/study/${island.id}`);
  }, [island, navigate]);

  if (!island || !activeLevel) {
    return (
      <div style={{ minHeight: '100vh', background: '#041524', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', opacity: 0.8 }}>
            <Waves size={56} color="#60a5fa" />
          </div>
          <p style={{ fontSize: 20, fontWeight: 900, margin: '0 0 14px' }}>Level not found!</p>
          <button onClick={() => navigate('/study')}
            style={{ border: 'none', borderRadius: 14, padding: '12px 20px', cursor: 'pointer', fontWeight: 900, fontSize: 15, background: 'linear-gradient(135deg,#34d399,#22d3ee)', color: '#064e3b', fontFamily: "'Nunito',sans-serif" }}>
            ← Back to World Map
          </button>
        </div>
      </div>
    );
  }

  const islandUnlocked = isIslandUnlocked(progress, island.id);
  const phraseIndex = island.levels.findIndex((level) => level.id === levelId);
  const phraseUnlocked = phraseIndex === 0 || isLevelCompleted(progress, island.id, island.levels[phraseIndex - 1]?.id);
  const levelUnlocked = islandUnlocked && phraseUnlocked;
  const alreadyCompleted = isLevelCompleted(progress, island.id, activeLevel.id);

  const panelTitle = activeLevel.label;
  const panelDescription = activeLevel.description;
  const panelTip = activeLevel.tip;

  const targetWord = phraseLevel?.label ? String(phraseLevel.label).replace(/\s+/g, '').toUpperCase() : '';
  const isLetterTarget = targetWord.length === 1;
  const verifyModelType = isLetterTarget ? 'static' : 'dynamic';
  const verifyEndpoint = isLetterTarget ? '/api/gesture/verify/static' : '/api/gesture/verify/dynamic';
  const verifyThreshold = isLetterTarget ? LETTER_THRESHOLD : WORD_THRESHOLD;
  const minFramesForVerify = isLetterTarget ? LETTER_MIN_FRAMES_FOR_VERIFY : WORD_MIN_FRAMES_FOR_VERIFY;
  const frameBufferSize = isLetterTarget ? LETTER_FRAME_BUFFER_SIZE : WORD_FRAME_BUFFER_SIZE;
  const captureIntervalMs = isLetterTarget ? LETTER_CAPTURE_INTERVAL_MS : WORD_CAPTURE_INTERVAL_MS;

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
    if (isSubmittingRef.current || !targetWord || !levelUnlocked) return;
    if (frameBufferRef.current.length < minFramesForVerify) {
      setStatus(`Need ${minFramesForVerify - frameBufferRef.current.length} more frame(s) before checking`);
      return;
    }

    isSubmittingRef.current = true;
    setReadyToSubmit(false);
    startProcessingFeedback();
    setStatus(`Checking ${panelTitle}...`);

    try {
      const response = await postJson(verifyEndpoint, {
        target_word: targetWord,
        frames: frameBufferRef.current,
        top_k: 5,
        threshold: verifyThreshold,
        ...(debugOverrideWord && { debug_override_word: debugOverrideWord }),
      });

      setLatestResult(response);

      if (response.is_match) {
        const nextStreak = matchStreak + 1;
        if (nextStreak >= REQUIRED_STREAK) {
          setMatchStreak(0);
          setRecording(false);
          setStatus(`Correct sign ${REQUIRED_STREAK}/${REQUIRED_STREAK}. Completing level...`);
          finishProcessingFeedback(true, `Correct! Streak ${REQUIRED_STREAK}/${REQUIRED_STREAK}. Level complete.`);
          markComplete();
        } else {
          setMatchStreak(nextStreak);
          setStatus(`Correct sign ${nextStreak}/${REQUIRED_STREAK}. Record again then submit.`);
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
      setMatchStreak(0);
      setStatus(error.message || 'Verification failed');
      setReadyToSubmit(true);
      finishProcessingFeedback(false, error.message || 'Could not submit this recording.');
    } finally {
      isSubmittingRef.current = false;
    }
  }, [targetWord, levelUnlocked, minFramesForVerify, panelTitle, verifyEndpoint, verifyThreshold, finishProcessingFeedback, matchStreak, startProcessingFeedback]);

  const handleRecordToggle = useCallback(() => {
    if (!levelUnlocked) {
      setStatus('This level is locked. Complete previous levels first.');
      return;
    }
    if (isSubmittingRef.current || isCountingDown || showSuccess) return;

    if (!recording) {
      frameBufferRef.current = [];
      setCapturedFrames(0);
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
      frameBufferRef.current = [...frameBufferRef.current, stopFrame].slice(-frameBufferSize);
      setCapturedFrames(frameBufferRef.current.length);
    }

    if (frameBufferRef.current.length > 0 && frameBufferRef.current.length < minFramesForVerify) {
      const padFrame = frameBufferRef.current[frameBufferRef.current.length - 1];
      while (frameBufferRef.current.length < minFramesForVerify) {
        frameBufferRef.current.push(padFrame);
      }
      setCapturedFrames(frameBufferRef.current.length);
    }

    if (frameBufferRef.current.length === 0) {
      setReadyToSubmit(false);
      setStatus('No frames captured. The guide circle is only a helper, try centering your hand and hold for 1 second.');
      return;
    }

    setReadyToSubmit(true);
    setStatus('Recording stopped. Press submit to verify.');
  }, [frameBufferSize, levelUnlocked, minFramesForVerify, recording, showSuccess, takeFrame, isCountingDown]);

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

  useEffect(() => {
    frameBufferRef.current = [];
    setCapturedFrames(0);
    setMatchStreak(0);
    setLatestResult(null);
    setStatus('Ready to verify');
    setRecording(false);
    setReadyToSubmit(false);
    setIsCountingDown(false);
    setCountdown(0);
    clearProcessingTimers();
    setShowProcessingModal(false);
  }, [clearProcessingTimers, levelId]);

  useEffect(() => {
    if (!recording || !levelUnlocked || !targetWord) return undefined;

    const intervalId = window.setInterval(() => {
      if (isSubmittingRef.current || !webcamRef.current) return;

      const screenshot = takeFrame();
      if (!screenshot) return;

      frameBufferRef.current = [...frameBufferRef.current, screenshot].slice(-frameBufferSize);
      setCapturedFrames(frameBufferRef.current.length);

      if (frameBufferRef.current.length < minFramesForVerify) {
        setStatus(`Collecting frames ${frameBufferRef.current.length}/${minFramesForVerify}...`);
      } else {
        setStatus(`Frames ready ${frameBufferRef.current.length}/${minFramesForVerify}. Tap stop when done.`);
      }
    }, captureIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [recording, levelUnlocked, targetWord, takeFrame, frameBufferSize, minFramesForVerify, captureIntervalMs]);

  useEffect(() => {
    if (!recording && !isCountingDown && !showSuccess && !alreadyCompleted && !readyToSubmit && status === 'Ready to verify') {
      setStatus('Tap record to start.');
    }
  }, [recording, isCountingDown, showSuccess, alreadyCompleted, readyToSubmit, status]);

  const markComplete = () => {
    if (!levelUnlocked || alreadyCompleted) return;

    setReadyToSubmit(false);
    setIsCountingDown(false);
    setCountdown(0);
    const updated = completeIslandLevel(progress, island.id, activeLevel.id);
    setProgress(updated);
    saveStudyProgress(updated);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      const nextLevel = island.levels[phraseIndex + 1];
      if (nextLevel) { navigate(`/study/${island.id}/level/${nextLevel.id}`); return; }
      navigate(`/study/${island.id}`);
    }, 1800);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(2,10,28,0.88)', backdropFilter: 'blur(8px)',
      padding: 20, fontFamily: "'Nunito', sans-serif",
    }}>

      {/* success overlay */}
      {showSuccess && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(2,10,28,0.75)', backdropFilter: 'blur(4px)',
          animation: 'fade-in 0.2s ease-out',
        }}>
          <div style={{ textAlign: 'center', animation: 'pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              background: 'linear-gradient(135deg,#34d399,#22d3ee)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: '0 8px 32px rgba(52,211,153,0.55)',
            }}>
              <CheckCircle size={40} color="white" />
            </div>
            <p style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '0 0 8px' }}>
              Level Complete!
            </p>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', margin: 0, fontWeight: 700 }}>
              Moving to next level...
            </p>
          </div>
        </div>
      )}

      <div
        className="flex flex-col md:flex-row w-full max-w-[960px] max-h-[calc(100vh-40px)] overflow-y-auto md:overflow-hidden"
        style={{
        position: 'relative', background: '#0d2240', borderRadius: 28,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
        animation: 'modal-enter 0.3s ease-out',
      }}>

        {/* close button */}
        <button onClick={handleClose}
          style={{
            position: 'absolute', top: 16, right: 16, zIndex: 10,
            width: 42, height: 42, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)',
            backdropFilter: 'blur(8px)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.45)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <X size={18} color="white" />
        </button>

        {/* ── camera panel ── */}
        <div
          className="flex-1 relative overflow-hidden min-h-[500px]"
          style={{
            background: '#050d18',
            borderRadius: '28px 28px 0 0',
          }}
        >
          {/* md radius overrides */}
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
            <button onClick={async () => {
              isSubmittingRef.current = true;
              try {
                const response = await postJson(verifyEndpoint, { target_word: targetWord, frames: ["data:image/jpeg;base64,mock"], top_k: 5, threshold: verifyThreshold, debug_override_word: targetWord });
                setLatestResult(response);
                if (response.is_match) {
                  setMatchStreak((value) => {
                    const next = value + 1;
                    setStatus(`Match ${next}/${REQUIRED_STREAK}`);
                    if (next >= REQUIRED_STREAK) {
                      setMatchStreak(0);
                      setRecording(false);
                      markComplete();
                    }
                    return next;
                  });
                }
              } finally { isSubmittingRef.current = false; }
            }}
              style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}>
              Test: Correct
            </button>
            <button onClick={async () => {
              isSubmittingRef.current = true;
              try {
                const response = await postJson(verifyEndpoint, { target_word: targetWord, frames: ["data:image/jpeg;base64,mock"], top_k: 5, threshold: verifyThreshold, debug_override_word: 'wrongword' });
                setLatestResult(response);
                setStatus(`Closest: ${response.best_match}`);
                setMatchStreak(0);
              } finally { isSubmittingRef.current = false; }
            }}
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}>
              Test: Wrong Word
            </button>
          </div>


          {/* recording hint */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            background: recording ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)', borderRadius: 99,
            padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'background 0.3s',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: recording ? 'white' : '#ef4444',
              animation: recording ? 'rec-blink 1s ease-in-out infinite' : undefined,
            }} />
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

          <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <button onClick={handleRecordToggle}
              disabled={isCountingDown || showSuccess}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                border: `5px solid ${recording ? '#ef4444' : 'rgba(255,255,255,0.9)'}`,
                background: recording ? '#ef4444' : 'white',
                cursor: isCountingDown || showSuccess ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: recording ? '0 0 0 8px rgba(239,68,68,0.25), 0 6px 28px rgba(0,0,0,0.5)' : '0 6px 28px rgba(0,0,0,0.5)',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                opacity: isCountingDown || showSuccess ? 0.55 : 1,
              }}
            >
              <Circle size={32} fill={recording ? 'white' : '#e63946'} color={recording ? 'white' : '#e63946'} />
            </button>

            {readyToSubmit && !showSuccess && (
              <button
                onClick={() => verifyCurrentFrames()}
                disabled={isSubmittingRef.current || isCountingDown}
                style={{
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 16px',
                  minWidth: 92,
                  cursor: isSubmittingRef.current || isCountingDown ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg,#34d399,#22d3ee)',
                  color: '#064e3b',
                  fontWeight: 900,
                  fontSize: 13,
                  opacity: isSubmittingRef.current || isCountingDown ? 0.6 : 1,
                }}
              >
                Submit
              </button>
            )}
          </div>

          <div style={{
            position: 'absolute', bottom: 122, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(2,10,28,0.75)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 10, padding: '6px 10px', color: 'white', fontSize: 12, fontWeight: 800,
          }}>
            Frames: {capturedFrames}/{minFramesForVerify}
          </div>
        </div>

        {/* ── info panel ── */}
        <div 
          className="w-full md:w-[380px]"
          style={{
          flexShrink: 0,
          background: 'linear-gradient(180deg,#0f2a54 0%,#091a38 100%)',
          display: 'flex', flexDirection: 'column',
          padding: '32px 22px 20px', gap: 14, overflowY: 'auto',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
        }}>

          {/* level indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              background: 'rgba(52,211,153,0.2)',
              border: '1px solid rgba(52,211,153,0.4)',
              borderRadius: 99, padding: '4px 14px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                Practice
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', fontWeight: 700 }}>
              Level {activeLevel.order} / {island.levels.length}
            </span>
          </div>

          {/* title */}
          <div style={{
            fontSize: 30, fontWeight: 900, color: 'white',
            lineHeight: 1.2, textAlign: 'center',
            textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            background: 'linear-gradient(135deg,#34d399,#22d3ee)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {panelTitle}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

          <YouTubeTutorial word={activeLevel.label} isLetter={isLetterTarget} />

          {/* description */}
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, margin: 0 }}>
            {panelDescription}
          </p>

          {/* tip box */}
          <div style={{
            background: 'rgba(59,130,246,0.15)', border: '1.5px solid rgba(96,165,250,0.35)',
            borderRadius: 16, padding: '12px 14px',
            fontSize: 13, color: '#93c5fd', lineHeight: 1.6, flexShrink: 0,
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <Lightbulb size={15} color="#93c5fd" style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Tip:</strong> {panelTip}</span>
          </div>

          <div style={{
            borderRadius: 14,
            background: latestResult
              ? latestResult.is_match
                ? 'rgba(34,197,94,0.16)'
                : 'rgba(239,68,68,0.16)'
              : 'rgba(255,255,255,0.08)',
            border: latestResult
              ? latestResult.is_match
                ? '1px solid rgba(74,222,128,0.35)'
                : '1px solid rgba(248,113,113,0.4)'
              : '1px solid rgba(255,255,255,0.14)',
            padding: '11px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 900, color: 'rgba(255,255,255,0.56)' }}>
              Live Verification
            </span>
            <p style={{ margin: 0, fontSize: 14, color: latestResult ? (latestResult.is_match ? '#bbf7d0' : '#fecaca') : 'white', fontWeight: 800 }}>{status}</p>
            <p style={{ margin: 0, fontSize: 12, color: latestResult ? (latestResult.is_match ? 'rgba(187,247,208,0.9)' : 'rgba(254,202,202,0.9)') : 'rgba(255,255,255,0.68)' }}>
              {latestResult
                ? `Best: ${String(latestResult.best_match || 'unknown').toUpperCase()} · Similarity: ${Number(latestResult.similarity ?? 0).toFixed(3)}`
                : 'Press record and hold the target sign in frame.'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.56)' }}>
              Model: {verifyModelType === 'static' ? 'Static (letter)' : 'Dynamic (word)'}
            </p>
            {latestResult && (
              <p style={{ margin: 0, fontSize: 12, color: latestResult.is_match ? '#86efac' : '#fca5a5', fontWeight: 800 }}>
                Streak: {matchStreak}/{REQUIRED_STREAK}{latestResult.is_match ? '' : ' (reset on miss)'}
              </p>
            )}
          </div>

          {/* level dots */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            {island.levels.map((level) => {
              const done = isLevelCompleted(progress, island.id, level.id);
              const current = level.id === activeLevel.id;
              return (
                <div key={level.id} style={{
                  borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: done ? '#064e3b' : current ? '#064e3b' : 'rgba(255,255,255,0.7)',
                  background: done ? '#34d399' : current ? '#22d3ee' : 'rgba(255,255,255,0.12)',
                  boxShadow: current ? '0 0 0 2px rgba(34,211,238,0.6)' : 'none',
                  transition: 'all 0.2s',
                }}>
                  L{level.order}
                </div>
              );
            })}
          </div>

          {/* locked notice */}
          {!levelUnlocked && (
            <div style={{
              background: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.4)',
              color: '#fca5a5', borderRadius: 14, padding: '12px 14px',
              fontSize: 13, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
              <Lock size={15} /> This level is still locked.
            </div>
          )}

          {/* already done notice */}
          {alreadyCompleted && (
            <div style={{
              background: 'rgba(52,211,153,0.15)', border: '1.5px solid rgba(52,211,153,0.4)',
              color: '#a7f3d0', borderRadius: 14, padding: '12px 14px',
              fontSize: 13, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
              <CheckCircle size={14} color="#a7f3d0" /> Already completed! Practice again anytime.
            </div>
          )}

          {/* action button */}
          <button
            onClick={markComplete}
            disabled={!levelUnlocked || alreadyCompleted || !latestResult?.is_match}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 18, border: 'none',
              background: 'linear-gradient(135deg,#34d399,#22d3ee)',
              color: '#064e3b',
              fontSize: 16,
              fontWeight: 900,
              cursor: !levelUnlocked || alreadyCompleted || !latestResult?.is_match ? 'not-allowed' : 'pointer',
              opacity: !levelUnlocked || alreadyCompleted || !latestResult?.is_match ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: !levelUnlocked || alreadyCompleted ? 'none' : '0 8px 28px rgba(52,211,153,0.45)',
              flexShrink: 0, fontFamily: "'Nunito',sans-serif",
              transition: 'transform 0.18s ease, opacity 0.2s ease',
            }}
            onMouseEnter={e => { if (!(!levelUnlocked || alreadyCompleted || !latestResult?.is_match)) { e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <>Verified Complete <ArrowRight size={18} /></>
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
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');
        @keyframes rec-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fade-in { 0%{opacity:0} 100%{opacity:1} }
        @keyframes pop-in { 0%{transform:scale(0.7);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes modal-enter { 0%{opacity:0;transform:scale(0.92) translateY(20px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
}
