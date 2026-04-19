import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Fish, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { postJson } from '../../lib/api';
import Spinner from '../../components/Spinner';

export default function SignUp({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Inline defensive validation
    if (!email || !password || !confirm) { toast.error('Please fill in all fields'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Please enter a valid email address.'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (!agreed) { toast.error('Please agree to the terms to continue'); return; }

    setIsLoading(true);
    try {
      const user = await postJson('/api/auth/signup', { email, password });
      toast.success('Account successfully created!');
      localStorage.setItem('handspeak_user', JSON.stringify(user));
      onLogin(user);
      navigate('/welcome');
    } catch (signUpError) {
      const msg = signUpError.message || 'Unable to create account';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden md:flex flex-col items-center justify-center w-[42%] relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1565c0 0%, #42a5f5 100%)' }}>
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center shadow-lg">
            <Fish size={60} className="text-white" />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">HandSpeak</h1>
          <p className="text-white/80 text-xl font-semibold">ASL Learning</p>
        </div>
        <div className="absolute bottom-0 left-0 w-full">
          <svg viewBox="0 0 1440 200" preserveAspectRatio="none" className="w-full h-28">
            <path fill="rgba(255,255,255,0.15)" d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,85.3C672,75,768,85,864,106.7C960,128,1056,160,1152,154.7C1248,149,1344,107,1392,85.3L1440,64L1440,200L0,200Z" />
            <path fill="rgba(255,255,255,0.1)" d="M0,128L48,117.3C96,107,192,85,288,96C384,107,480,149,576,160C672,171,768,149,864,128C960,107,1056,85,1152,96C1248,107,1344,149,1392,170.7L1440,192L1440,200L0,200Z" />
          </svg>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-[#f0f8ff] px-10 py-12">
        <div className="w-full max-w-md">
          <div className="flex md:hidden items-center gap-2 mb-10">
            <Fish size={32} className="text-[#1a73e8]" />
            <span className="text-3xl font-black text-[#1a2a3a]">HandSpeak</span>
          </div>

          <h2 className="text-4xl font-black italic text-[#1a2a3a] mb-10">Create Account</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl px-5 py-4 text-sm mb-6 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8 }}>Email</label>
              <input type="email" placeholder="your email here" value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '16px 20px', borderRadius: 14, border: '2px solid #cce0f5', background: '#f8fbff', fontSize: 16, color: '#1a2a3a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#1a73e8'}
                onBlur={e => e.target.style.borderColor = '#cce0f5'} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} placeholder="create a password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '16px 56px 16px 20px', borderRadius: 14, border: '2px solid #cce0f5', background: '#f8fbff', fontSize: 16, color: '#1a2a3a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#1a73e8'}
                  onBlur={e => e.target.style.borderColor = '#cce0f5'} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#90a4ae', display: 'flex', alignItems: 'center', padding: 4 }}>
                  {showPass ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8 }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showConfirm ? 'text' : 'password'} placeholder="confirm your password" value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={{ width: '100%', padding: '16px 56px 16px 20px', borderRadius: 14, border: '2px solid #cce0f5', background: '#f8fbff', fontSize: 16, color: '#1a2a3a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#1a73e8'}
                  onBlur={e => e.target.style.borderColor = '#cce0f5'} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#90a4ae', display: 'flex', alignItems: 'center', padding: 4 }}>
                  {showConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: 3, width: 20, height: 20, flexShrink: 0, accentColor: '#1a73e8', cursor: 'pointer' }} />
              <span style={{ fontSize: 14, color: '#546e7a', lineHeight: 1.6 }}>
                I have read, understood and agreed to Nexgen's{' '}
                <span style={{ color: '#1a73e8', fontWeight: 700, cursor: 'pointer' }}>EULA</span>
                {' '}and{' '}
                <span style={{ color: '#1a73e8', fontWeight: 700, cursor: 'pointer' }}>Privacy Policy</span>
              </span>
            </label>

            <button type="submit"
              disabled={isLoading}
              style={{ width: '100%', padding: '18px 0', borderRadius: 14, border: 'none', background: isLoading ? '#94a3b8' : '#1a73e8', color: 'white', fontSize: 16, fontWeight: 900, cursor: isLoading ? 'not-allowed' : 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: isLoading ? 'none' : '0 4px 18px rgba(26,115,232,0.4)', transition: 'box-shadow 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { if(!isLoading) e.currentTarget.style.boxShadow = '0 6px 28px rgba(26,115,232,0.6)' }}
              onMouseLeave={e => { if(!isLoading) e.currentTarget.style.boxShadow = '0 4px 18px rgba(26,115,232,0.4)' }}>
              {isLoading ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.8 }}><Spinner size={18} /> CREATING ACCOUNT...</span> : 'CREATE ACCOUNT'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
              <Link to="/" style={{ fontSize: 14, fontWeight: 700, color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
                Already have an account? Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
