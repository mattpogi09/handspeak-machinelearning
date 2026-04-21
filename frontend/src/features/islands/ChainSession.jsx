import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, Circle, CheckCircle2, AlertCircle, ArrowRight, MessageCircle,
  Trophy, Lightbulb, ChevronDown,
} from 'lucide-react';
import Camera from '../../components/Camera';
import GestureProcessingModal from '../../components/GestureProcessingModal';
import { useIslands } from '../../contexts/IslandsContext';
import { listIslandChains, startChainSession, submitChainTurn } from './conversationApi';

const CAPTURE_INTERVAL_MS = 250;
const MIN_FRAMES_FOR_VERIFY = 8;
const FRAME_BUFFER_SIZE = 20;
const COUNTDOWN_SECONDS = 3;

const RESPONSE_TYPE_LABELS = {
  'greet-open': 'Greeting opener',
  'greet-close': 'Farewell',
  confirm: 'Confirmation',
  deny: 'Denial',
  clarify: 'Clarification',
  'ask-back': 'Ask-back',
  repair: 'Repair',
  react: 'Emotional reaction',
  gratitude: 'Gratitude',
};

const getUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('handspeak_user') || 'null');
    return user?.id ?? null;
  } catch {
    return null;
  }
};

export default function ChainSession() {
  const navigate = useNavigate();
  const { islandId } = useParams();
  const { getIslandById } = useIslands();
  const island = getIslandById(islandId);

  // Chain selection state
  const [chains, setChains] = useState([]);
  const [selectedChain, setSelectedChain] = useState(null);

  // Session state
  const [chainSessionId, setChainSessionId] = useState(null);
  const [turnsSnapshot, setTurnsSnapshot] = useState([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(2);
  const [transcript, setTranscript] = useState([]); // completed turn results (one per turn)
  const [latestTurnResult, setLatestTurnResult] = useState(null);
  const [chainSummary, setChainSummary] = useState(null);
  const [coherenceSoFar, setCoherenceSoFar] = useState(null);

  // UI state
  const [recording, setRecording] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingPhase, setProcessingPhase] = useState('waiting');
  const [processingMessage, setProcessingMessage] = useState('');
  const [status, setStatus] = useState('');
  const [bootstrapError, setBootstrapError] = useState(null);

  const webcamRef = useRef(null);
  const frameBufferRef = useRef([]);
  const isSubmittingRef = useRef(false);
  const processingTimersRef = useRef([]);

  const currentTurn = turnsSnapshot[currentTurnIndex] || null;
  const totalTurns = turnsSnapshot.length;

  // Step 1: load chains for island
  useEffect(() => {
    if (!islandId) return;
    listIslandChains(islandId)
      .then(setChains)
      .catch(() => setBootstrapError('Unable to load conversations.'));
  }, [islandId]);

  // Step 2: start a chain session once user picks a chain
  const handleSelectChain = useCallback(async (chain) => {
    const userId = getUserId();
    if (!userId) {
      setBootstrapError('You need to be signed in to start a conversation chain.');
      return;
    }
    try {
      const session = await startChainSession({
        userId,
        islandId,
        chainId: chain.id,
      });
      const snapshot = session.turns_snapshot
        || (session.current_turn_data ? [session.current_turn_data] : []);
      setSelectedChain({ ...chain, title: session.title, description: session.description });
      setChainSessionId(session.chain_session_id);
      setTurnsSnapshot(snapshot);
      setCurrentTurnIndex(0);
      setAttemptsRemaining(session.max_attempts_per_turn ?? 2);
      setReadyToSubmit(false);
      setIsCountingDown(false);
      setCountdown(0);
      setStatus('Read the NPC line, then record your reply.');
    } catch (err) {
      setBootstrapError(err.message || 'Failed to start conversation.');
    }
  }, [islandId]);

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

  const resetFrameBuffer = useCallback(() => { frameBufferRef.current = []; }, []);

  const takeFrame = useCallback(() =>
    webcamRef.current?.captureFrame?.() || webcamRef.current?.getScreenshot?.() || null,
  []);

  const submitCurrentFrames = useCallback(async (debugOverrideWord = null) => {
    if (isSubmittingRef.current || !currentTurn || !chainSessionId) return;
    if (!debugOverrideWord && frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
      setStatus(`Need ${MIN_FRAMES_FOR_VERIFY - frameBufferRef.current.length} more frame(s).`);
      return;
    }

    isSubmittingRef.current = true;
    setReadyToSubmit(false);
    startProcessingFeedback();
    setStatus(`Scoring your reply for "${currentTurn.expected_word.toUpperCase()}"...`);

    try {
      const result = await submitChainTurn({
        chainSessionId,
        turnIndex: currentTurnIndex,
        userId: getUserId(),
        frames: frameBufferRef.current.length ? frameBufferRef.current : ["data:image/jpeg;base64,mock"],
        debugOverrideWord,
      });

      setLatestTurnResult(result);
      setAttemptsRemaining(result.attempts_remaining ?? 0);
      setCoherenceSoFar(result.coherence_so_far);
      setStatus(result.feedback_text || (result.is_correct ? 'Correct!' : 'Not quite.'));

      if (result.should_advance) {
        // Finalise this turn in local transcript
        setTranscript((prev) => {
          const updated = [...prev];
          updated[currentTurnIndex] = result;
          return updated;
        });
      }

      if (result.is_chain_complete && result.chain_summary) {
        setChainSummary(result.chain_summary);
      }
      finishProcessingFeedback(true, 'Gesture checked successfully.');
    } catch (err) {
      setStatus(err.message || 'Scoring failed. Try again.');
      setReadyToSubmit(true);
      finishProcessingFeedback(false, err.message || 'Could not submit this recording.');
    } finally {
      isSubmittingRef.current = false;
    }
  }, [chainSessionId, currentTurnIndex, currentTurn, finishProcessingFeedback, startProcessingFeedback]);

  const handleRecordToggle = useCallback(() => {
    if (isSubmittingRef.current || latestTurnResult?.should_advance || isCountingDown) return;

    if (!recording) {
      resetFrameBuffer();
      setLatestTurnResult(null);
      setReadyToSubmit(false);
      setCountdown(COUNTDOWN_SECONDS);
      setIsCountingDown(true);
      setStatus(`Get ready... ${COUNTDOWN_SECONDS}`);
      return;
    }

    setRecording(false);
    const last = takeFrame();
    if (last) frameBufferRef.current = [...frameBufferRef.current, last].slice(-FRAME_BUFFER_SIZE);

    if (!frameBufferRef.current.length) {
      setReadyToSubmit(false);
      setStatus('No frames — center your hand in the guide circle and try again.');
      return;
    }

    while (frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
      frameBufferRef.current.push(frameBufferRef.current[frameBufferRef.current.length - 1]);
    }

    setReadyToSubmit(true);
    setStatus('Recording stopped. Press submit to check your reply.');
  }, [isCountingDown, latestTurnResult?.should_advance, recording, takeFrame, resetFrameBuffer]);

  useEffect(() => {
    if (!isCountingDown) return undefined;
    if (countdown <= 0) {
      setIsCountingDown(false);
      setRecording(true);
      setStatus('Recording... hold the sign steady.');
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setCountdown((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [countdown, isCountingDown]);

  useEffect(() => {
    if (!recording || !currentTurn) return undefined;
    const id = window.setInterval(() => {
      if (isSubmittingRef.current || !webcamRef.current) return;
      const frame = takeFrame();
      if (!frame) return;
      frameBufferRef.current = [...frameBufferRef.current, frame].slice(-FRAME_BUFFER_SIZE);
      if (frameBufferRef.current.length < MIN_FRAMES_FOR_VERIFY) {
        setStatus(`Collecting frames ${frameBufferRef.current.length}/${MIN_FRAMES_FOR_VERIFY}...`);
      }
    }, CAPTURE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [recording, currentTurn, takeFrame]);

  const handleAdvanceTurn = useCallback(() => {
    if (!latestTurnResult?.should_advance) return;
    const next = latestTurnResult.next_turn_index ?? currentTurnIndex + 1;
    setCurrentTurnIndex(next);
    setLatestTurnResult(null);
    setAttemptsRemaining(selectedChain?.max_attempts_per_turn ?? 2);
    setReadyToSubmit(false);
    setIsCountingDown(false);
    setCountdown(0);
    resetFrameBuffer();
    setStatus('Next turn — read the NPC line and record your reply.');
  }, [latestTurnResult, currentTurnIndex, selectedChain, resetFrameBuffer]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (!island) {
    return <FullScreenMsg title="Island not found" onBack={() => navigate('/islands')} />;
  }
  if (bootstrapError) {
    return <FullScreenMsg title="Unavailable" subtitle={bootstrapError} onBack={() => navigate(`/islands/${islandId}`)} />;
  }

  // Chain picker
  if (!selectedChain) {
    return (
      <ChainPicker
        island={island}
        chains={chains}
        onSelect={handleSelectChain}
        onBack={() => navigate(`/islands/${islandId}`)}
      />
    );
  }

  // Summary
  if (chainSummary) {
    return (
      <ChainSummary
        island={island}
        chain={selectedChain}
        summary={chainSummary}
        transcript={transcript}
        turnsSnapshot={turnsSnapshot}
        onAgain={() => window.location.reload()}
        onExit={() => navigate(`/islands/${islandId}`)}
      />
    );
  }

  if (!currentTurn) {
    return <FullScreenMsg title="Loading conversation..." subtitle={status} />;
  }

  const rtb = latestTurnResult?.response_type_breakdown;
  const canAdvance = latestTurnResult?.should_advance && !latestTurnResult?.is_chain_complete;
  const isLastAttempt = attemptsRemaining === 0 && latestTurnResult && !latestTurnResult.should_advance;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(2,10,28,0.92)', backdropFilter: 'blur(10px)',
      padding: 20, fontFamily: "'Nunito', sans-serif",
    }}>
      <div
        className="flex flex-col md:flex-row w-full max-w-[1060px] max-h-[calc(100vh-40px)] overflow-y-auto md:overflow-hidden"
        style={{
        position: 'relative', background: '#0d2240', borderRadius: 28,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
      }}>
        <button onClick={() => navigate(`/islands/${islandId}`)}
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} color="white" />
        </button>

        {/* Camera */}
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
            <button onClick={() => submitCurrentFrames(currentTurn.expected_word)}
              style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}>
              Test: Correct
            </button>
            <button onClick={() => submitCurrentFrames('wrongword')}
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}>
              Test: Wrong Word
            </button>
            <button onClick={() => submitCurrentFrames('hello')}
              style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' }}>
              Test: Wrong Type
            </button>
          </div>

          <div style={{ position: 'absolute', top: 16, left: 16, background: recording ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.55)', borderRadius: 99, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: recording ? 'white' : '#ef4444', animation: recording ? 'rec-blink 1s ease-in-out infinite' : undefined }} />
            <span style={{ fontSize: 11, fontWeight: 900, color: 'white', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {isCountingDown ? `Starting ${countdown}` : recording ? 'Recording' : readyToSubmit ? 'Ready to submit' : 'Ready'}
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
              disabled={!!latestTurnResult?.should_advance || isCountingDown}
              style={{ width: 80, height: 80, borderRadius: '50%', border: `5px solid ${recording ? '#ef4444' : 'rgba(255,255,255,0.85)'}`, background: recording ? '#ef4444' : 'white', cursor: latestTurnResult?.should_advance || isCountingDown ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: recording ? '0 0 0 8px rgba(239,68,68,0.22)' : '0 6px 28px rgba(0,0,0,0.5)', opacity: latestTurnResult?.should_advance || isCountingDown ? 0.5 : 1 }}>
              <Circle size={30} fill={recording ? 'white' : '#e63946'} color={recording ? 'white' : '#e63946'} />
            </button>

            {readyToSubmit && !latestTurnResult?.should_advance && (
              <button
                onClick={() => submitCurrentFrames()}
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
        </div>

        {/* Right panel */}
        <div className="w-full md:w-[380px]" style={{ flexShrink: 0, background: 'linear-gradient(180deg,#0f2a54 0%,#091a38 100%)', display: 'flex', flexDirection: 'column', padding: '24px 20px 18px', gap: 12, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              <MessageCircle size={10} style={{ display: 'inline', marginRight: 4 }} />
              {selectedChain.title}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 800 }}>
              Turn {currentTurnIndex + 1} / {totalTurns}
            </span>
          </div>

          {/* Progress */}
          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${totalTurns ? Math.round(((transcript.filter(Boolean).length) / totalTurns) * 100) : 0}%`, background: 'linear-gradient(90deg,#34d399,#22d3ee)', transition: 'width 0.4s ease' }} />
          </div>

          {/* Transcript (past turns) */}
          {transcript.filter(Boolean).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10 }}>
              {transcript.filter(Boolean).map((entry, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{turnsSnapshot[entry.turn_index]?.npc_line}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: entry.is_correct ? '#4ade80' : '#f87171' }}>
                      {entry.matched_word ? entry.matched_word.toUpperCase() : '—'}
                    </span>
                    {entry.is_correct
                      ? <CheckCircle2 size={11} color="#4ade80" />
                      : <AlertCircle size={11} color="#f87171" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Situation Context Card */}
          {currentTurn.situation && (
            <div style={{
              padding: '8px 0',
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                📍 Context
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#93c5fd', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>{currentTurn.situation.emoji}</span>
                {currentTurn.situation.label}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                {currentTurn.situation.description}
              </div>
            </div>
          )}

          {/* NPC line (current turn) */}
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>NPC says</div>
              {currentTurn.response_type && (
                <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 99, background: 'rgba(167,139,250,0.18)', color: '#c4b5fd', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {RESPONSE_TYPE_LABELS[currentTurn.response_type] || currentTurn.response_type}
                </span>
              )}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: 'white' }}>{currentTurn.npc_line}</div>
          </div>

          {/* Expected reply */}
          <div style={{ background: 'linear-gradient(135deg,#34d399,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', WebkitTextFillColor: 'rgba(255,255,255,0.55)' }}>Your Reply</div>
            <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{currentTurn.expected_word.toUpperCase()}</div>
          </div>

          {/* Coaching tip */}
          {currentTurn.coaching_tip && (
            <div style={{ background: 'rgba(59,130,246,0.15)', border: '1.5px solid rgba(96,165,250,0.35)', borderRadius: 12, padding: '9px 12px', fontSize: 12, color: '#93c5fd', lineHeight: 1.5, display: 'flex', gap: 6 }}>
              <Lightbulb size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{currentTurn.coaching_tip}</span>
            </div>
          )}

          {/* Attempts indicator */}
          {latestTurnResult && !latestTurnResult.is_correct && !latestTurnResult.should_advance && (
            <div style={{ fontSize: 11, fontWeight: 800, color: attemptsRemaining > 0 ? '#fde68a' : '#f87171', textAlign: 'center' }}>
              {attemptsRemaining > 0 ? `${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining` : 'No attempts left — advancing turn'}
            </div>
          )}

          {/* Feedback panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              borderRadius: 14,
              background: latestTurnResult?.is_correct ? 'rgba(34,197,94,0.18)' : latestTurnResult ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${latestTurnResult?.is_correct ? 'rgba(52,211,153,0.45)' : latestTurnResult ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.12)'}`,
              padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {latestTurnResult?.is_correct
                  ? <CheckCircle2 size={15} color="#4ade80" />
                  : latestTurnResult ? <AlertCircle size={15} color="#f87171" /> : null}
                <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>
                  {latestTurnResult?.is_correct ? 'Correct reply' : latestTurnResult ? 'Not a match' : 'Waiting for your reply'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.78)' }}>{status}</p>
              {latestTurnResult?.matched_word && (
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  Closest: {latestTurnResult.matched_word.toUpperCase()} · {Number(latestTurnResult.confidence || 0).toFixed(2)}
                </p>
              )}
            </div>

            {/* Type breakdown */}
            {rtb && !latestTurnResult?.is_correct && (() => {
              if (rtb.type_correct === false) return (
                <div style={{ borderRadius: 12, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Wrong response type</span>
                    {rtb.actual_type_label && <span style={{ fontSize: 10, color: 'rgba(251,191,36,0.7)' }}>You: {rtb.actual_type_label}</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 11.5, color: '#fde68a', lineHeight: 1.5 }}>{rtb.explanation}</p>
                </div>
              );
              if (rtb.type_correct === true) return (
                <div style={{ borderRadius: 12, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', padding: '7px 11px' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#6ee7b7' }}>Right type — just needs the exact word.</span>
                </div>
              );
              return null;
            })()}
          </div>

          {/* Coherence live pill */}
          {coherenceSoFar && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Coherence</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: coherenceSoFar.coherence_score >= 0.7 ? '#34d399' : coherenceSoFar.coherence_score >= 0.4 ? '#fbbf24' : '#f87171' }}>
                {Math.round(coherenceSoFar.coherence_score * 100)}%
              </span>
            </div>
          )}

          {/* Next turn button */}
          <div style={{ marginTop: 'auto' }}>
            <button
              onClick={handleAdvanceTurn}
              disabled={!canAdvance}
              style={{
                width: '100%', border: 'none', borderRadius: 14, padding: '12px', cursor: canAdvance ? 'pointer' : 'not-allowed',
                background: canAdvance ? 'linear-gradient(135deg,#34d399,#22d3ee)' : 'rgba(255,255,255,0.08)',
                color: canAdvance ? '#064e3b' : 'rgba(255,255,255,0.35)',
                fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: canAdvance ? 1 : 0.6,
              }}>
              Next Turn <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
      <GestureProcessingModal
        open={showProcessingModal}
        phase={processingPhase}
        message={processingMessage}
        onClose={() => setShowProcessingModal(false)}
      />
      <style>{`@keyframes rec-blink { 0%,100%{opacity:1} 50%{opacity:0.25} }`}</style>
    </div>
  );
}

function ChainPicker({ island, chains, onSelect, onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 30% 0%,#22d3ee 0%,#0369a1 60%,#041421 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito',sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.22)', padding: '8px 14px', borderRadius: 50, cursor: 'pointer', color: 'white', fontWeight: 800, fontSize: 13, marginBottom: 22 }}>
          ← Back
        </button>
        <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 900 }}>Choose a Conversation</h1>
        <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
          Each chain is a scripted multi-turn exchange. You get {chains[0]?.max_attempts_per_turn ?? 2} attempts per turn.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {chains.map((chain) => (
            <button key={chain.id} onClick={() => onSelect(chain)}
              style={{ textAlign: 'left', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 18, padding: '18px 20px', color: 'white', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(0,0,0,0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 17, fontWeight: 900 }}>{chain.title}</div>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#6ee7b7', padding: '2px 8px', borderRadius: 99, background: 'rgba(52,211,153,0.15)' }}>
                  {chain.turns_count} turns
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{chain.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChainSummary({ island, chain, summary, transcript, turnsSnapshot, onAgain, onExit }) {
  const coherencePct = Math.round((summary.coherence_score || 0) * 100);
  const typePct = Math.round((summary.type_accuracy || 0) * 100);
  const wordPct = Math.round((summary.word_accuracy || 0) * 100);

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 30% 0%,#22d3ee 0%,#0369a1 60%,#041421 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito',sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 500, width: '100%', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 24, padding: '28px 26px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(52,211,153,0.2)', border: '2px solid rgba(52,211,153,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={34} color="#34d399" />
          </div>
        </div>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900, textAlign: 'center' }}>Chain Complete</h1>
        <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center' }}>{chain.title} · {island.title} Island</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 18 }}>
          <SumStat label="Words" value={`${summary.correct_turns}/${summary.total_turns}`} />
          <SumStat label="Type acc." value={`${typePct}%`} accent="#c4b5fd" />
          <SumStat label="Coherence" value={`${coherencePct}%`} accent={coherencePct >= 70 ? '#34d399' : coherencePct >= 40 ? '#fbbf24' : '#f87171'} />
        </div>

        {/* Per-turn transcript */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {(summary.per_turn_scores || []).map((ts) => {
            const turn = turnsSnapshot[ts.turn_index];
            const entry = transcript[ts.turn_index];
            return (
              <div key={ts.turn_index} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>Turn {ts.turn_index + 1}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {ts.word_correct ? <CheckCircle2 size={13} color="#4ade80" /> : <AlertCircle size={13} color="#f87171" />}
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)' }}>
                      coherence {Math.round((ts.turn_coherence || 0) * 100)}%
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{turn?.npc_line}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: ts.word_correct ? '#4ade80' : '#f87171', marginTop: 3 }}>
                  → {entry?.matched_word ? entry.matched_word.toUpperCase() : '—'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onAgain} style={{ flex: 1, border: 'none', borderRadius: 14, padding: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: 'white', fontWeight: 900 }}>Try again</button>
          <button onClick={onExit} style={{ flex: 1, border: 'none', borderRadius: 14, padding: '12px', cursor: 'pointer', background: 'linear-gradient(135deg,#34d399,#22d3ee)', color: '#064e3b', fontWeight: 900 }}>Back to island</button>
        </div>
      </div>
    </div>
  );
}

function SumStat({ label, value, accent }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 900, color: accent || 'white' }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>{label}</div>
    </div>
  );
}

function FullScreenMsg({ title, subtitle, onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: '#041524', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito',sans-serif", padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 10px' }}>{title}</h2>
        {subtitle && <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.7)' }}>{subtitle}</p>}
        {onBack && <button onClick={onBack} style={{ background: 'white', color: '#0369a1', border: 'none', borderRadius: 14, padding: '10px 20px', fontWeight: 900, cursor: 'pointer' }}>Go back</button>}
      </div>
    </div>
  );
}
