import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, Circle, CheckCircle2, AlertCircle, ArrowRight, MessageCircle, Trophy, Lightbulb, RefreshCw,
} from 'lucide-react';
import Camera from '../../components/Camera';
import { useIslands } from '../../contexts/IslandsContext';
import { startConversationSession, submitConversationAttempt } from './conversationApi';

const CAPTURE_INTERVAL_MS = 250;
const MIN_FRAMES_FOR_VERIFY = 8;
const FRAME_BUFFER_SIZE = 20;

const getUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('handspeak_user') || 'null');
    return user?.id ?? null;
  } catch {
    return null;
  }
};

export default function ReplyQuestSession() {
  const navigate = useNavigate();
  const { islandId } = useParams();
  const { getIslandById } = useIslands();
  const island = getIslandById(islandId);

  const [sessionId, setSessionId] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('Loading Reply Quest...');
  const [bootstrapError, setBootstrapError] = useState(null);
  const [latestResult, setLatestResult] = useState(null);
  const [correctPromptIds, setCorrectPromptIds] = useState(() => new Set());
  const [sessionSummary, setSessionSummary] = useState(null);
  const [typeResults, setTypeResults] = useState({ correct: 0, total: 0 });

  const webcamRef = useRef(null);
  const frameBufferRef = useRef([]);
  const isSubmittingRef = useRef(false);

  const currentPrompt = prompts[currentIndex] || null;

  useEffect(() => {
    if (!islandId) return;
    let active = true;

    (async () => {
      const userId = getUserId();
      if (!userId) {
        setBootstrapError('You need to be signed in to start Reply Quest.');
        return;
      }
      try {
        const session = await startConversationSession({ userId, islandId });
        if (!active) return;
        setSessionId(session.session_id);
        setPrompts(session.prompts || []);
        setStatus('Read the prompt, then press record and sign your reply.');
      } catch (error) {
        if (active) setBootstrapError(error.message || 'Unable to start Reply Quest.');
      }
    })();

    return () => { active = false; };
  }, [islandId]);

  const resetFrameBuffer = useCallback(() => {
    frameBufferRef.current = [];
  }, []);

  const takeFrame = useCallback(() => {
    if (!webcamRef.current) return null;
    return webcamRef.current.captureFrame?.() || webcamRef.current.getScreenshot?.() || null;
  }, []);

  const advanceToNextPrompt = useCallback(() => {
    setLatestResult(null);
    resetFrameBuffer();
    setStatus('Next prompt — read it, then record your reply.');
    setCurrentIndex((idx) => {
      const nextIdx = idx + 1;
      return nextIdx < prompts.length ? nextIdx : idx;
    });
  }, [prompts.length, resetFrameBuffer]);

  const submitCurrentFrames = useCallback(async (debugOverrideWord = null) => {
    if (isSubmittingRef.current || !currentPrompt || !sessionId) return;
    if (!debugOverrideWord && frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
      setStatus(`Need ${MIN_FRAMES_FOR_VERIFY - frameBufferRef.current.length} more frame(s) before checking.`);
      return;
    }

    isSubmittingRef.current = true;
    setStatus(`Scoring your reply for "${currentPrompt.expected_word.toUpperCase()}"...`);

    try {
      const response = await submitConversationAttempt({
        sessionId,
        promptId: currentPrompt.id,
        userId: getUserId(),
        frames: frameBufferRef.current.length ? frameBufferRef.current : ["data:image/jpeg;base64,mock"],
        debugOverrideWord,
      });

      setLatestResult(response);
      setStatus(response.feedback_text || (response.is_correct ? 'Correct!' : 'Not quite — try again.'));

      if (response.is_correct) {
        setCorrectPromptIds((prev) => {
          const next = new Set(prev);
          next.add(currentPrompt.id);
          return next;
        });
      }

      const rtb = response.response_type_breakdown;
      if (rtb && rtb.type_correct !== null && rtb.type_correct !== undefined) {
        setTypeResults((prev) => ({
          correct: prev.correct + (rtb.type_correct ? 1 : 0),
          total: prev.total + 1,
        }));
      }

      if (response.session_completed) {
        setSessionSummary({
          correct: response.correct_count,
          total: response.total_count,
          accuracy: response.total_count ? response.correct_count / response.total_count : 0,
        });
      }
    } catch (error) {
      setStatus(error.message || 'Scoring failed. Try again.');
    } finally {
      isSubmittingRef.current = false;
    }
  }, [currentPrompt, sessionId]);

  const handleRecordToggle = useCallback(async () => {
    if (!recording) {
      resetFrameBuffer();
      setLatestResult(null);
      setStatus('Recording... hold the sign steady.');
      setRecording(true);
      return;
    }

    setRecording(false);
    const stopFrame = takeFrame();
    if (stopFrame) {
      frameBufferRef.current = [...frameBufferRef.current, stopFrame].slice(-FRAME_BUFFER_SIZE);
    }

    if (frameBufferRef.current.length === 0) {
      setStatus('No frames captured — center your hand in the guide circle and try again.');
      return;
    }

    if (frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
      const pad = frameBufferRef.current[frameBufferRef.current.length - 1];
      while (frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
        frameBufferRef.current.push(pad);
      }
    }

    await submitCurrentFrames();
  }, [recording, submitCurrentFrames, takeFrame, resetFrameBuffer]);

  useEffect(() => {
    if (!recording || !currentPrompt) return undefined;
    const intervalId = window.setInterval(() => {
      if (isSubmittingRef.current || !webcamRef.current) return;
      const screenshot = takeFrame();
      if (!screenshot) return;
      frameBufferRef.current = [...frameBufferRef.current, screenshot].slice(-FRAME_BUFFER_SIZE);
      if (frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
        setStatus(`Collecting frames ${frameBufferRef.current.length}/${MIN_FRAMES_FOR_VERIFY}...`);
      }
    }, CAPTURE_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [recording, currentPrompt, takeFrame]);

  useEffect(() => {
    resetFrameBuffer();
    setLatestResult(null);
  }, [currentPrompt?.id, resetFrameBuffer]);

  if (!island) {
    return <FullScreenMessage title="Island not found" onBack={() => navigate('/islands')} />;
  }

  if (bootstrapError) {
    return <FullScreenMessage title="Reply Quest unavailable" subtitle={bootstrapError} onBack={() => navigate(`/islands/${islandId}`)} />;
  }

  if (sessionSummary) {
    return (
      <SummaryScreen
        island={island}
        summary={sessionSummary}
        typeResults={typeResults}
        onAgain={() => window.location.reload()}
        onExit={() => navigate(`/islands/${islandId}`)}
      />
    );
  }

  if (!currentPrompt) {
    return <FullScreenMessage title="Preparing prompts..." subtitle={status} />;
  }

  const totalPrompts = prompts.length;
  const correctCount = correctPromptIds.size;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(2,10,28,0.92)', backdropFilter: 'blur(10px)',
      padding: 20, fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{
        position: 'relative', background: '#0d2240', borderRadius: 28,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
        width: '100%', maxWidth: 1000, maxHeight: 'calc(100vh - 40px)',
        overflow: 'hidden', display: 'flex', flexDirection: 'row',
      }}>
        <button onClick={() => navigate(`/islands/${islandId}`)}
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} color="white" />
        </button>

        {/* Camera side */}
        <div style={{ flex: 1, background: '#050d18', position: 'relative', borderRadius: '28px 0 0 28px', overflow: 'hidden', minHeight: 500 }}>
          <Camera ref={webcamRef} />

          {/* DEBUG CONTROLS */}
          <div style={{ position: 'absolute', top: 50, right: 16, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => submitCurrentFrames(currentPrompt.expected_word)}
              style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}>
              Test: Correct
            </button>
            <button onClick={() => submitCurrentFrames('wrongword')}
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}>
              Test: Wrong Word
            </button>
            {/* For testing Phase 2 response type mismatches, pass a valid word that is a known wrong type */}
            <button onClick={() => submitCurrentFrames('hello')}
              style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}>
              Test: Wrong Type
            </button>
          </div>

          <div style={{ position: 'absolute', top: 16, left: 16, background: recording ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.55)', borderRadius: 99, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: recording ? 'white' : '#ef4444', animation: recording ? 'rec-blink 1s ease-in-out infinite' : undefined }} />
            <span style={{ fontSize: 11, fontWeight: 900, color: 'white', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{recording ? 'Recording' : 'Ready'}</span>
          </div>

          <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <button onClick={handleRecordToggle}
              style={{ width: 80, height: 80, borderRadius: '50%', border: `5px solid ${recording ? '#ef4444' : 'rgba(255,255,255,0.85)'}`, background: recording ? '#ef4444' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: recording ? '0 0 0 8px rgba(239,68,68,0.22)' : '0 6px 28px rgba(0,0,0,0.5)' }}>
              <Circle size={30} fill={recording ? 'white' : '#e63946'} color={recording ? 'white' : '#e63946'} />
            </button>
          </div>
        </div>

        {/* Prompt side */}
        <div style={{ width: 360, flexShrink: 0, background: 'linear-gradient(180deg,#0f2a54 0%,#091a38 100%)', display: 'flex', flexDirection: 'column', padding: '28px 22px 22px', gap: 14, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              <MessageCircle size={10} style={{ display: 'inline', marginRight: 4 }} />
              Reply Quest
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 800 }}>
              {currentIndex + 1} / {totalPrompts}
            </span>
          </div>

          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${totalPrompts ? Math.round((correctCount / totalPrompts) * 100) : 0}%`,
              background: 'linear-gradient(90deg,#34d399,#22d3ee)', transition: 'width 0.4s ease',
            }} />
          </div>

          {currentPrompt.situation && (
            <div style={{
              padding: '8px 0',
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                📍 Context
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#93c5fd', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>{currentPrompt.situation.emoji}</span>
                {currentPrompt.situation.label}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                {currentPrompt.situation.description}
              </div>
            </div>
          )}

          <div style={{
            background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.12)',
            borderRadius: 18, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>NPC Prompt</div>
              {currentPrompt.response_type_label && (
                <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 99, background: 'rgba(167,139,250,0.18)', color: '#c4b5fd', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {currentPrompt.response_type_label}
                </span>
              )}
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.55, color: 'white' }}>
              {currentPrompt.prompt_text}
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg,#34d399,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textAlign: 'center', padding: '6px 0' }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', WebkitTextFillColor: 'rgba(255,255,255,0.55)' }}>Your Reply</div>
            <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>
              {currentPrompt.expected_word.toUpperCase()}
            </div>
          </div>

          {currentPrompt.coaching_tip && (
            <div style={{ background: 'rgba(59,130,246,0.15)', border: '1.5px solid rgba(96,165,250,0.35)', borderRadius: 14, padding: '10px 12px', fontSize: 12.5, color: '#93c5fd', lineHeight: 1.55, display: 'flex', gap: 6 }}>
              <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{currentPrompt.coaching_tip}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              borderRadius: 14,
              background: latestResult?.is_correct ? 'rgba(34,197,94,0.18)' : latestResult ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${latestResult?.is_correct ? 'rgba(52,211,153,0.45)' : latestResult ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.12)'}`,
              padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {latestResult?.is_correct ? (
                  <CheckCircle2 size={16} color="#4ade80" />
                ) : latestResult ? (
                  <AlertCircle size={16} color="#f87171" />
                ) : null}
                <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>
                  {latestResult?.is_correct ? 'Correct reply' : latestResult ? 'Not a match' : 'Waiting for your reply'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.78)' }}>{status}</p>
              {latestResult?.matched_word && (
                <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(255,255,255,0.55)' }}>
                  Closest reading: {latestResult.matched_word.toUpperCase()} · {Number(latestResult.confidence || 0).toFixed(2)}
                </p>
              )}
            </div>

            {/* Phase 2: response type breakdown */}
            {latestResult?.response_type_breakdown && !latestResult.is_correct && (() => {
              const rtb = latestResult.response_type_breakdown;
              if (rtb.type_correct === false) {
                return (
                  <div style={{ borderRadius: 12, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Response type mismatch</span>
                      {rtb.actual_type_label && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(251,191,36,0.75)' }}>
                          You signed: {rtb.actual_type_label}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#fde68a', lineHeight: 1.5 }}>{rtb.explanation}</p>
                  </div>
                );
              }
              if (rtb.type_correct === true) {
                return (
                  <div style={{ borderRadius: 12, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', padding: '8px 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#6ee7b7' }}>
                      Right response type — just needs the exact word.
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <button onClick={() => { resetFrameBuffer(); setLatestResult(null); setStatus('Reset — press record and try again.'); }}
              style={{ flex: 1, border: 'none', borderRadius: 14, padding: '11px 12px', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <RefreshCw size={13} /> Retry
            </button>
            <button
              onClick={advanceToNextPrompt}
              disabled={!latestResult?.is_correct || currentIndex >= prompts.length - 1}
              style={{
                flex: 1, border: 'none', borderRadius: 14, padding: '11px 12px', cursor: (!latestResult?.is_correct || currentIndex >= prompts.length - 1) ? 'not-allowed' : 'pointer',
                background: latestResult?.is_correct ? 'linear-gradient(135deg,#34d399,#22d3ee)' : 'rgba(255,255,255,0.08)',
                color: latestResult?.is_correct ? '#064e3b' : 'rgba(255,255,255,0.5)',
                fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: (!latestResult?.is_correct || currentIndex >= prompts.length - 1) ? 0.6 : 1,
              }}>
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes rec-blink { 0%,100%{opacity:1} 50%{opacity:0.25} }`}</style>
    </div>
  );
}

function FullScreenMessage({ title, subtitle, onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: '#041524', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito',sans-serif", padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 10px' }}>{title}</h2>
        {subtitle && <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.7)' }}>{subtitle}</p>}
        {onBack && (
          <button onClick={onBack}
            style={{ background: 'white', color: '#0369a1', border: 'none', borderRadius: 14, padding: '10px 20px', fontWeight: 900, cursor: 'pointer' }}>
            Go back
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryScreen({ island, summary, typeResults, onAgain, onExit }) {
  const typeAccuracy = typeResults.total > 0
    ? Math.round((typeResults.correct / typeResults.total) * 100)
    : null;

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 30% 0%, #22d3ee 0%, #0369a1 60%, #041421 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito',sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 460, width: '100%', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 24, padding: '28px 28px 24px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(52,211,153,0.2)', border: '2px solid rgba(52,211,153,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Trophy size={36} color="#34d399" />
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 900 }}>Conversation Complete</h1>
        <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.5 }}>
          You just finished your first Reply Quest on {island.title} Island.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginBottom: 24 }}>
          <Stat label="Prompts" value={`${summary.correct}/${summary.total}`} />
          <Stat label="Accuracy" value={`${Math.round(summary.accuracy * 100)}%`} />
          {typeAccuracy !== null && (
            <Stat label="Type accuracy" value={`${typeAccuracy}%`} accent="#c4b5fd" />
          )}
        </div>
        {typeResults.total > 0 && typeResults.correct < typeResults.total && (
          <div style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 12, padding: '10px 14px', marginBottom: 18, fontSize: 12.5, color: '#c4b5fd', lineHeight: 1.55 }}>
            You got the right response type {typeResults.correct}/{typeResults.total} times.
            Focus on matching the kind of reply the situation calls for.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onAgain}
            style={{ flex: 1, border: 'none', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: 'white', fontWeight: 900 }}>
            Play again
          </button>
          <button onClick={onExit}
            style={{ flex: 1, border: 'none', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', background: 'linear-gradient(135deg,#34d399,#22d3ee)', color: '#064e3b', fontWeight: 900 }}>
            Back to island
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 900, color: accent || 'white' }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}
