import React from 'react';
import { AlertCircle, CheckCircle2, Clock3, Loader2 } from 'lucide-react';

const STEP_ORDER = ['waiting', 'reading', 'checking'];

function getStepState(step, phase) {
  if (phase === 'success') return 'done';
  if (phase === 'error') {
    if (step === 'checking') return 'error';
    return 'done';
  }

  const phaseIndex = STEP_ORDER.indexOf(phase);
  const stepIndex = STEP_ORDER.indexOf(step);
  if (stepIndex < phaseIndex) return 'done';
  if (stepIndex === phaseIndex) return 'active';
  return 'pending';
}

function StepIcon({ state }) {
  if (state === 'done') return <CheckCircle2 size={18} color="#4ade80" />;
  if (state === 'active') return <Loader2 size={18} color="#67e8f9" className="animate-spin" />;
  if (state === 'error') return <AlertCircle size={18} color="#f87171" />;
  return <Clock3 size={18} color="rgba(255,255,255,0.45)" />;
}

const STEP_LABELS = {
  waiting: 'Waiting',
  reading: 'Reading frames',
  checking: 'Checking gesture',
};

const TITLE_BY_PHASE = {
  waiting: 'Preparing Submission',
  reading: 'Reading Capture',
  checking: 'Analyzing Gesture',
  success: 'Submission Complete',
  error: 'Submission Failed',
};

export default function GestureProcessingModal({ open, phase = 'waiting', message = '', onClose }) {
  if (!open) return null;

  const icon = phase === 'success'
    ? <CheckCircle2 size={30} color="#4ade80" />
    : phase === 'error'
      ? <AlertCircle size={30} color="#f87171" />
      : <Loader2 size={30} color="#67e8f9" className="animate-spin" />;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 90,
      background: 'rgba(2,10,28,0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'linear-gradient(180deg,#0f2a54 0%,#091a38 100%)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 18,
        boxShadow: '0 18px 44px rgba(0,0,0,0.45)',
        padding: '18px 18px 16px',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon}
          <div>
            <div style={{ fontSize: 15, fontWeight: 900 }}>{TITLE_BY_PHASE[phase] || 'Processing'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{message}</div>
          </div>
        </div>

        <div style={{
          borderRadius: 12,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {STEP_ORDER.map((step) => {
            const stepState = getStepState(step, phase);
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StepIcon state={stepState} />
                  <span style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: stepState === 'pending' ? 'rgba(255,255,255,0.58)' : 'white',
                  }}>
                    {STEP_LABELS[step]}
                  </span>
                </div>
                <span style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: stepState === 'done'
                    ? '#86efac'
                    : stepState === 'active'
                      ? '#67e8f9'
                      : stepState === 'error'
                        ? '#fca5a5'
                        : 'rgba(255,255,255,0.45)',
                }}>
                  {stepState === 'done' ? 'Done' : stepState === 'active' ? 'Working' : stepState === 'error' ? 'Error' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>

        {phase === 'error' && onClose && (
          <button
            onClick={onClose}
            style={{
              border: 'none',
              borderRadius: 12,
              padding: '10px 12px',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.12)',
              color: 'white',
              fontWeight: 900,
            }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
