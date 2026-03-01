import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Circle } from 'lucide-react';
import { ALPHABET, NUMBERS } from '../../data/aslData';
import Camera from '../../components/Camera';

export default function PracticeSession() {
  const { type, signId } = useParams();
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);

  const signs = type === 'alphabet' ? ALPHABET : NUMBERS;
  const currentSign = signs.find((s) => s.id === signId) || signs[0];

  const handleClose = useCallback(() => navigate('/practice'), [navigate]);

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
        <div style={{ width: 340, flexShrink: 0, background: '#1e3246', display: 'flex', flexDirection: 'column', padding: '32px 24px 24px', gap: 16, overflowY: 'auto' }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#90caf9', textTransform: 'uppercase', letterSpacing: '0.22em' }}>Practice Target</span>
          <div style={{ fontSize: 100, fontWeight: 900, color: '#42a5f5', lineHeight: 1, textAlign: 'center', padding: '4px 0' }}>{currentSign.label}</div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, fontSize: 14, color: '#90a4ae', flexShrink: 0 }}>
            [Sign Diagram Placeholder]
          </div>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, margin: 0 }}>{currentSign.description}</p>
          <div style={{ background: 'rgba(26,115,232,0.14)', border: '1px solid rgba(26,115,232,0.3)', borderRadius: 16, padding: '14px 18px', fontSize: 14, color: '#90caf9', lineHeight: 1.6, flexShrink: 0 }}>
            <strong>Tip:</strong> {currentSign.tip}
          </div>
        </div>
      </div>
    </div>
  );
}
