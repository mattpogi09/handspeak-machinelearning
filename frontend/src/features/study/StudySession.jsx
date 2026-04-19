import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Circle, ArrowRight, CheckCircle, Crown, Lock, Star, Lightbulb, Waves } from 'lucide-react';
import Camera from '../../components/Camera';
import { postJson } from '../../lib/api';
import {
  getInitialStudyProgress,
  getStoredStudyProgress,
  loadStudyProgress,
  saveStudyProgress,
  isIslandUnlocked,
  isLevelCompleted,
  isBossUnlocked,
  completeIslandLevel,
  buildBossChallenge,
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

export default function StudySession() {
  const { islandId, levelId } = useParams();
  const navigate = useNavigate();
  const { getIslandById } = useIslands();
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(getInitialStudyProgress());
  const [showSuccess, setShowSuccess] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const [status, setStatus] = useState('Ready to verify');
  const [latestResult, setLatestResult] = useState(null);
  const [matchStreak, setMatchStreak] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState(0);
  const webcamRef = useRef(null);
  const frameBufferRef = useRef([]);
  const isSubmittingRef = useRef(false);

  const takeFrame = useCallback(() => {
    if (!webcamRef.current) return null;
    return webcamRef.current.captureFrame?.() || webcamRef.current.getScreenshot?.() || null;
  }, []);

  const island = getIslandById(islandId);
  const phraseLevel = island?.levels.find((level) => level.id === levelId) || null;
  const isBossLevel = island?.bossLevel?.id === levelId;
  const activeLevel = isBossLevel ? island?.bossLevel : phraseLevel;
  const bossChallenge = island && isBossLevel ? buildBossChallenge(island, progress) : null;

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

  useEffect(() => { setImgOk(true); }, [levelId]);

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
  const levelUnlocked = islandUnlocked && (isBossLevel ? isBossUnlocked(progress, island.id) : phraseUnlocked);
  const alreadyCompleted = isBossLevel
    ? Boolean(progress.islands?.[island.id]?.bossCompleted)
    : isLevelCompleted(progress, island.id, activeLevel.id);

  const panelTitle = isBossLevel ? bossChallenge.title : activeLevel.label;
  const panelDescription = isBossLevel ? bossChallenge.objective : activeLevel.description;
  const panelTip = isBossLevel
    ? 'Perform each generated phrase combination in one smooth sequence.'
    : activeLevel.tip;

  /* ASL phrase image — Lifeprint vocabulary GIFs */
  const phraseId = phraseLevel?.phraseId || '';
  const phraseImgSrc = phraseId
    ? `https://www.lifeprint.com/asl101/gifs-animated/${phraseId.replace('_', '-')}.gif`
    : null;

  const targetWord = phraseLevel?.label ? String(phraseLevel.label).replace(/\s+/g, '').toUpperCase() : '';
  const isLetterTarget = targetWord.length === 1;
  const verifyModelType = isLetterTarget ? 'static' : 'dynamic';
  const verifyEndpoint = isLetterTarget ? '/api/gesture/verify/static' : '/api/gesture/verify/dynamic';
  const verifyThreshold = isLetterTarget ? LETTER_THRESHOLD : WORD_THRESHOLD;
  const minFramesForVerify = isLetterTarget ? LETTER_MIN_FRAMES_FOR_VERIFY : WORD_MIN_FRAMES_FOR_VERIFY;
  const frameBufferSize = isLetterTarget ? LETTER_FRAME_BUFFER_SIZE : WORD_FRAME_BUFFER_SIZE;
  const captureIntervalMs = isLetterTarget ? LETTER_CAPTURE_INTERVAL_MS : WORD_CAPTURE_INTERVAL_MS;

  const verifyCurrentFrames = useCallback(async (triggeredByStop = false) => {
    if (isSubmittingRef.current || !targetWord || isBossLevel || !levelUnlocked) return;
    if (frameBufferRef.current.length < minFramesForVerify) {
      setStatus(`Need ${minFramesForVerify - frameBufferRef.current.length} more frame(s) before checking`);
      return;
    }

    isSubmittingRef.current = true;
    setStatus(`Checking ${panelTitle}...`);

    try {
      const response = await postJson(verifyEndpoint, {
        target_word: targetWord,
        frames: frameBufferRef.current,
        top_k: 5,
        threshold: verifyThreshold,
      });

      setLatestResult(response);

      if (response.is_match) {
        if (triggeredByStop) {
          setStatus('Correct sign captured. Completing level...');
          setMatchStreak(0);
          setRecording(false);
          markComplete();
          return;
        }

        setMatchStreak((value) => {
          const next = value + 1;
          setStatus(`Correct sign ${next}/${REQUIRED_STREAK}`);
          if (next >= REQUIRED_STREAK) {
            setRecording(false);
            markComplete();
            return 0;
          }
          return next;
        });
      } else {
        setMatchStreak(0);
        setStatus(triggeredByStop
          ? `Not matched. Closest match: ${response.best_match}`
          : `Not yet. Closest match: ${response.best_match}`);
      }
    } catch (error) {
      setMatchStreak(0);
      setStatus(error.message || 'Verification failed');
    } finally {
      isSubmittingRef.current = false;
    }
  }, [targetWord, isBossLevel, levelUnlocked, panelTitle, verifyThreshold, minFramesForVerify, verifyEndpoint, verifyModelType]);

  const handleRecordToggle = useCallback(async () => {
    if (!levelUnlocked) {
      setStatus('This level is locked. Complete previous levels first.');
      return;
    }

    if (isBossLevel) {
      setStatus('Boss levels use the complete button after practicing combinations.');
      return;
    }

    if (!recording) {
      setStatus('Recording... hold the sign steady');
      setRecording(true);
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
      setStatus('No frames captured. The guide circle is only a helper, try centering your hand and hold for 1 second.');
      return;
    }

    await verifyCurrentFrames(true);
  }, [recording, isBossLevel, verifyCurrentFrames, takeFrame, frameBufferSize, minFramesForVerify, levelUnlocked]);

  useEffect(() => {
    frameBufferRef.current = [];
    setCapturedFrames(0);
    setMatchStreak(0);
    setLatestResult(null);
    setStatus('Ready to verify');
    setRecording(false);
  }, [levelId]);

  useEffect(() => {
    if (!recording || !levelUnlocked || isBossLevel || !targetWord) return undefined;

    const intervalId = window.setInterval(async () => {
      if (isSubmittingRef.current || !webcamRef.current) return;

      const screenshot = takeFrame();
      if (!screenshot) return;

      frameBufferRef.current = [...frameBufferRef.current, screenshot].slice(-frameBufferSize);
      setCapturedFrames(frameBufferRef.current.length);

      if (frameBufferRef.current.length < minFramesForVerify) {
        setStatus(`Collecting frames ${frameBufferRef.current.length}/${minFramesForVerify}...`);
        return;
      }

      await verifyCurrentFrames(false);
    }, captureIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [recording, levelUnlocked, isBossLevel, verifyCurrentFrames, takeFrame, frameBufferSize, minFramesForVerify, captureIntervalMs]);

  useEffect(() => {
    if (!recording && !showSuccess && !alreadyCompleted && !isBossLevel && status === 'Ready to verify') {
      setStatus('Recording stopped. Press record to continue.');
    }
  }, [recording, showSuccess, alreadyCompleted, isBossLevel, status]);

  const markComplete = () => {
    if (!levelUnlocked || alreadyCompleted) return;

    const updated = completeIslandLevel(progress, island.id, activeLevel.id);
    setProgress(updated);
    saveStudyProgress(updated);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      if (isBossLevel) { navigate('/study'); return; }
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
              background: isBossLevel ? 'linear-gradient(135deg,#fbbf24,#f97316)' : 'linear-gradient(135deg,#34d399,#22d3ee)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: isBossLevel ? '0 8px 32px rgba(251,191,36,0.55)' : '0 8px 32px rgba(52,211,153,0.55)',
            }}>
              {isBossLevel ? <Crown size={40} color="white" /> : <CheckCircle size={40} color="white" />}
            </div>
            <p style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '0 0 8px' }}>
              {isBossLevel ? 'Boss Defeated!' : 'Level Complete!'}
            </p>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', margin: 0, fontWeight: 700 }}>
              {isBossLevel ? 'Island cleared!' : 'Moving to next level...'}
            </p>
          </div>
        </div>
      )}

      <div style={{
        position: 'relative', background: '#0d2240', borderRadius: 28,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
        width: '100%', maxWidth: 960, maxHeight: 'calc(100vh - 40px)',
        overflow: 'hidden', display: 'flex', flexDirection: 'row',
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
        <div style={{
          flex: 1, background: '#050d18', position: 'relative',
          borderRadius: '28px 0 0 28px', overflow: 'hidden', minHeight: 500,
        }}>
          <Camera ref={webcamRef} />

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
              {recording ? 'Recording' : 'Camera'}
            </span>
          </div>

          {/* record button */}
          <button onClick={handleRecordToggle}
            style={{
              position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
              width: 80, height: 80, borderRadius: '50%',
              border: `5px solid ${recording ? '#ef4444' : 'rgba(255,255,255,0.9)'}`,
              background: recording ? '#ef4444' : 'white',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: recording ? '0 0 0 8px rgba(239,68,68,0.25), 0 6px 28px rgba(0,0,0,0.5)' : '0 6px 28px rgba(0,0,0,0.5)',
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <Circle size={32} fill={recording ? 'white' : '#e63946'} color={recording ? 'white' : '#e63946'} />
          </button>

          {!isBossLevel && (
            <div style={{
              position: 'absolute', bottom: 122, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(2,10,28,0.75)', border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 10, padding: '6px 10px', color: 'white', fontSize: 12, fontWeight: 800,
            }}>
              Frames: {capturedFrames}/{minFramesForVerify}
            </div>
          )}
        </div>

        {/* ── info panel ── */}
        <div style={{
          width: 350, flexShrink: 0,
          background: 'linear-gradient(180deg,#0f2a54 0%,#091a38 100%)',
          display: 'flex', flexDirection: 'column',
          padding: '32px 22px 20px', gap: 14, overflowY: 'auto',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
        }}>

          {/* level indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              background: isBossLevel ? 'linear-gradient(135deg,#fbbf24,#f97316)' : 'rgba(52,211,153,0.2)',
              border: isBossLevel ? 'none' : '1px solid rgba(52,211,153,0.4)',
              borderRadius: 99, padding: '4px 14px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {isBossLevel ? <Crown size={13} color="white" /> : null}
              <span style={{ fontSize: 10, fontWeight: 900, color: isBossLevel ? 'white' : '#34d399', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                {isBossLevel ? 'Boss Level' : 'Practice'}
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', fontWeight: 700 }}>
              {isBossLevel ? 'Boss Challenge' : `Level ${activeLevel.order} / ${island.levels.length}`}
            </span>
          </div>

          {/* title */}
          <div style={{
            fontSize: isBossLevel ? 26 : 30, fontWeight: 900, color: 'white',
            lineHeight: 1.2, textAlign: 'center',
            textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            background: isBossLevel ? 'linear-gradient(135deg,#fbbf24,#f97316)' : 'linear-gradient(135deg,#34d399,#22d3ee)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {panelTitle}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

          {/* ASL hand sign reference image */}
          {!isBossLevel && (
            <div>
              <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Hand Sign Reference
              </p>
              <div style={{
                borderRadius: 18, overflow: 'hidden',
                background: 'rgba(255,255,255,0.95)',
                border: '2px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 150, flexShrink: 0,
                boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
              }}>
                {phraseImgSrc && imgOk ? (
                  <img
                    key={phraseId}
                    src={phraseImgSrc}
                    alt={`ASL sign for ${activeLevel.label}`}
                    style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
                    onError={() => setImgOk(false)}
                  />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: '#0ea5e9', lineHeight: 1 }}>
                      {activeLevel.label}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 5 }}>ASL Sign</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* boss combos */}
          {isBossLevel && (
            <div style={{
              borderRadius: 16, border: '1.5px solid rgba(251,191,36,0.4)',
              background: 'rgba(251,191,36,0.1)', padding: '13px 14px', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <Crown size={14} color="#fbbf24" />
                <span style={{ fontSize: 11, fontWeight: 900, color: '#fbbf24', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Boss Combos
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {bossChallenge.combinations.map((combo) => (
                  <div key={combo} style={{
                    borderRadius: 10, background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    padding: '8px 12px', fontSize: 13, color: '#fff7de', fontWeight: 800,
                  }}>
                    {combo}
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {!isBossLevel && (
            <div style={{
              borderRadius: 14,
              background: latestResult?.is_match ? 'rgba(34,197,94,0.16)' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              padding: '11px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 900, color: 'rgba(255,255,255,0.56)' }}>
                Live Verification
              </span>
              <p style={{ margin: 0, fontSize: 14, color: 'white', fontWeight: 800 }}>{status}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.68)' }}>
                {latestResult
                  ? `Best: ${latestResult.best_match} · Similarity: ${latestResult.similarity.toFixed(3)}`
                  : 'Press record and hold the target sign in frame.'}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.56)' }}>
                Model: {verifyModelType === 'static' ? 'Static (letter)' : 'Dynamic (word)'}
              </p>
              {matchStreak > 0 && (
                <p style={{ margin: 0, fontSize: 12, color: '#86efac', fontWeight: 800 }}>
                  Correct streak: {matchStreak}/{REQUIRED_STREAK}
                </p>
              )}
            </div>
          )}

          {/* level dots */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            {island.levels.map((level) => {
              const done = isLevelCompleted(progress, island.id, level.id);
              const current = !isBossLevel && level.id === activeLevel.id;
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
            <div style={{
              borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 800,
              letterSpacing: '0.04em',
              color: isBossLevel ? '#451a03' : 'rgba(255,255,255,0.7)',
              background: isBossLevel ? '#fbbf24' : 'rgba(255,255,255,0.12)',
              boxShadow: isBossLevel ? '0 0 0 2px rgba(251,191,36,0.6)' : 'none',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Crown size={10} color={isBossLevel ? '#451a03' : 'rgba(255,255,255,0.7)'} /> Boss
            </div>
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
            disabled={!levelUnlocked || alreadyCompleted || (!isBossLevel && !latestResult?.is_match)}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 18, border: 'none',
              background: isBossLevel
                ? 'linear-gradient(135deg,#fbbf24,#f97316)'
                : 'linear-gradient(135deg,#34d399,#22d3ee)',
              color: isBossLevel ? '#451a03' : '#064e3b',
              fontSize: 16,
              fontWeight: 900,
              cursor: !levelUnlocked || alreadyCompleted || (!isBossLevel && !latestResult?.is_match) ? 'not-allowed' : 'pointer',
              opacity: !levelUnlocked || alreadyCompleted || (!isBossLevel && !latestResult?.is_match) ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: !levelUnlocked || alreadyCompleted ? 'none'
                : isBossLevel ? '0 8px 28px rgba(251,191,36,0.55)' : '0 8px 28px rgba(52,211,153,0.45)',
              flexShrink: 0, fontFamily: "'Nunito',sans-serif",
              transition: 'transform 0.18s ease, opacity 0.2s ease',
            }}
            onMouseEnter={e => { if (!(!levelUnlocked || alreadyCompleted || (!isBossLevel && !latestResult?.is_match))) { e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {isBossLevel
              ? <><Crown size={18} /> Defeat Boss</>  
              : <>Verified Complete <ArrowRight size={18} /></>}
          </button>
        </div>
      </div>

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
