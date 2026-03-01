import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, ArrowRight } from 'lucide-react';

function FishSvg({ color = 'rgba(255,255,255,0.22)', size = 48 }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 80 48" fill="none">
      <ellipse cx="35" cy="24" rx="26" ry="16" fill={color} />
      <polygon points="58,24 76,10 76,38" fill={color} />
      <circle cx="22" cy="20" r="4" fill="rgba(0,0,0,0.2)" />
      <circle cx="23" cy="19" r="1.5" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

export default function Welcome({ user, onProfileComplete }) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !nickname) {
      setError('Please fill in First Name, Last Name, and Nickname.');
      return;
    }
    const profile = { firstName, middleName, lastName, nickname };
    localStorage.setItem('handspeak_profile', JSON.stringify(profile));
    onProfileComplete(profile);
    navigate('/dashboard');
  };

  const swimFish = [
    { dir: 'r', top: '13%', dur: '14s', del: '0s',  size: 52, color: 'rgba(255,255,255,0.22)' },
    { dir: 'l', top: '36%', dur: '18s', del: '4s',  size: 36, color: 'rgba(255,255,255,0.15)' },
    { dir: 'r', top: '60%', dur: '11s', del: '7s',  size: 44, color: 'rgba(255,235,59,0.2)'   },
    { dir: 'l', top: '78%', dur: '16s', del: '2s',  size: 30, color: 'rgba(255,255,255,0.12)' },
    { dir: 'r', top: '50%', dur: '20s', del: '10s', size: 28, color: 'rgba(144,202,249,0.3)'  },
    { dir: 'l', top: '22%', dur: '13s', del: '6s',  size: 58, color: 'rgba(255,255,255,0.1)'  },
  ];
  const bubbles = [
    { l: '8%',  b: '18%', w: 10, dur: '4.5s', del: '0s'   },
    { l: '18%', b: '30%', w:  7, dur: '3.8s', del: '1.2s' },
    { l: '30%', b: '10%', w: 15, dur: '5.2s', del: '0.5s' },
    { l: '72%', b: '22%', w:  9, dur: '4.1s', del: '2s'   },
    { l: '85%', b: '38%', w: 13, dur: '3.5s', del: '0.8s' },
    { l: '62%', b: '55%', w:  6, dur: '4.8s', del: '1.5s' },
    { l: '45%', b: '8%',  w: 11, dur: '3.2s', del: '0.3s' },
    { l: '92%', b: '60%', w:  8, dur: '5.5s', del: '2.5s' },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a2d5a 0%, #0d4a9a 25%, #1565c0 50%, #29b6f6 78%, #b2ebf2 100%)' }}>

      {/* Animated swimming fish */}
      {swimFish.map((f, i) => (
        <div key={i} className={`pointer-events-none absolute fish-swim-${f.dir}`}
          style={{ top: f.top, [f.dir === 'r' ? 'left' : 'right']: 0,
            animationDuration: f.dur, animationDelay: f.del }}>
          <FishSvg size={f.size} color={f.color} />
        </div>
      ))}

      {/* Rising bubbles */}
      {bubbles.map((b, i) => (
        <div key={i} className="bubble-rise pointer-events-none absolute rounded-full border border-white/25 bg-white/10"
          style={{ width: b.w, height: b.w, left: b.l, bottom: b.b,
            animationDuration: b.dur, animationDelay: b.del }} />
      ))}

      {/* Coral left */}
      <svg className="absolute left-[3%] bottom-0 w-32 h-32 text-pink-300/20 pointer-events-none" viewBox="0 0 120 120" fill="currentColor">
        <path d="M20,120 Q25,70 15,50 Q5,30 20,10 Q25,30 30,50 Q35,30 45,15 Q50,35 48,55 Q55,35 60,20 Q65,40 62,60 Q70,40 78,25 Q80,45 75,65 Q82,50 90,35 Q92,55 85,75 Q95,65 105,55 Q100,80 90,100 L20,120Z"/>
      </svg>
      {/* Coral right */}
      <svg className="absolute right-[4%] bottom-0 w-28 h-28 text-orange-300/20 pointer-events-none" viewBox="0 0 120 120" fill="currentColor">
        <path d="M100,120 Q95,75 105,55 Q110,35 100,15 Q95,35 90,55 Q85,35 75,20 Q72,40 75,60 Q65,40 58,25 Q55,45 60,65 Q50,50 42,38 Q42,60 50,80 Q35,70 25,60 Q30,85 45,100 L100,120Z"/>
      </svg>
      {/* Seaweed */}
      <svg className="absolute left-[14%] bottom-0 w-8 h-36 text-green-400/25 pointer-events-none" viewBox="0 0 30 120" fill="currentColor">
        <path d="M15,120 Q5,100 15,80 Q25,60 15,40 Q5,20 12,0 Q20,20 18,40 Q28,60 18,80 Q8,100 18,120Z"/>
      </svg>
      <svg className="absolute right-[16%] bottom-0 w-6 h-28 text-green-500/20 pointer-events-none" viewBox="0 0 30 120" fill="currentColor">
        <path d="M15,120 Q25,95 15,75 Q5,55 15,35 Q25,15 18,0 Q10,15 12,35 Q2,55 12,75 Q22,95 12,120Z"/>
      </svg>
      {/* Wave bottom */}
      <div className="absolute bottom-0 left-0 w-full pointer-events-none">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full h-16">
          <path fill="rgba(255,255,255,0.07)" d="M0,50 C200,80 400,20 600,50 C800,80 1000,20 1200,50 C1320,70 1400,30 1440,50 L1440,100 L0,100Z"/>
        </svg>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-xl px-4 py-10">
        <div style={{ background: '#fff', borderRadius: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', padding: '48px 44px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(21,101,192,0.18)'
            }}>
              <Anchor size={40} color="#1565c0" />
            </div>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1a2a3a', textAlign: 'center', marginBottom: 8 }}>Welcome to HandSpeak</h1>
          <p style={{ color: '#90a4ae', fontSize: 15, textAlign: 'center', marginBottom: 36, lineHeight: 1.5 }}>
            Tell us a bit about yourself to get your Diver License!
          </p>

          {error && (
            <div style={{
              background: '#fff5f5', border: '1.5px solid #ffcdd2', color: '#c62828',
              borderRadius: 14, padding: '14px 20px', fontSize: 14, marginBottom: 24, fontWeight: 600
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 900, color: '#78909c', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10 }}>Full Name</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[['First', firstName, setFirstName], ['Middle', middleName, setMiddleName], ['Last', lastName, setLastName]].map(([ph, val, setter]) => (
                  <input key={ph} type="text" placeholder={ph} value={val}
                    onChange={e => setter(e.target.value)}
                    style={{
                      width: '100%', padding: '15px 14px', borderRadius: 14,
                      border: '2px solid #cce0f5', background: '#f8fbff',
                      color: '#1a2a3a', fontSize: 15, outline: 'none',
                      fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#1a73e8'}
                    onBlur={e => e.target.style.borderColor = '#cce0f5'}
                  />
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 900, color: '#78909c', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10 }}>
                <Anchor size={13} color="#1a73e8" /> Nickname
              </label>
              <input type="text" placeholder="What should we call you?" value={nickname}
                onChange={e => setNickname(e.target.value)}
                style={{
                  width: '100%', padding: '15px 20px', borderRadius: 14,
                  border: '2px solid #cce0f5', background: '#f8fbff',
                  color: '#1a2a3a', fontSize: 15, outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#1a73e8'}
                onBlur={e => e.target.style.borderColor = '#cce0f5'}
              />
            </div>

            <button type="submit"
              style={{
                width: '100%', padding: '17px 0', borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #1a73e8 0%, #00897b 100%)',
                color: 'white', fontSize: 16, fontWeight: 900, cursor: 'pointer',
                letterSpacing: '0.05em', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                boxShadow: '0 6px 24px rgba(26,115,232,0.35)', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 32px rgba(26,115,232,0.5)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(26,115,232,0.35)'}
            >
              Get My License! <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
