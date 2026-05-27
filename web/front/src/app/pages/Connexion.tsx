// src/app/pages/Connexion.tsx

import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);

      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const pending = !!localStorage.getItem('pendingUser');

      if (pending) navigate('/attente-validation');
      else if (savedUser?.role === 'patient') navigate('/patient/dashboard');
      else if (savedUser?.role === 'admin') navigate('/admin/dashboard');
      else navigate('/tableau-de-bord');
    } catch (err: any) {
      if (err.requiresVerification) {
        setError(err.message || 'Veuillez vérifier votre email.');
        setShowResend(true);
      } else {
        setError(err || 'Email ou mot de passe incorrect.');
        setShowResend(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setIsLoading(true);
      const res = await googleLogin(credentialResponse.credential);
      if (res.requiresProfileCompletion) {
        navigate('/complete-profile');
      } else if (res.requiresApproval) {
        navigate('/attente-validation');
      } else {
        const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (savedUser?.role === 'patient') navigate('/patient/dashboard');
        else if (savedUser?.role === 'admin') navigate('/admin/dashboard');
        else navigate('/tableau-de-bord');
      }
    } catch (err: any) {
      setError(err || 'Erreur Google Login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const { resendVerificationEmail } = await import('../../services/api');
      await resendVerificationEmail(email);
      setError("Un nouveau lien a été envoyé. Vérifiez votre boîte de réception.");
      setShowResend(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de l'envoi.");
    }
  };

  return (
    <div style={s.root}>
      <style>{CSS}</style>

      <div style={s.bgCanvas}>
        <div className="blob" style={{ ...s.blob, ...s.blob1 }} />
        <div className="blob" style={{ ...s.blob, ...s.blob2 }} />
        <div className="blob" style={{ ...s.blob, ...s.blob3 }} />
      </div>

      <nav style={s.nav}>
        <Link to="/" style={s.logo}>
          <div style={s.logoIcon}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <span style={s.logoText}>
            Cardio<span style={{ color: '#4F46E5' }}>Wave</span>
          </span>
        </Link>

        <div style={s.navRight}>
          <span style={s.loginText}>Nouveau sur CardioWave ?</span>

          <button
            onClick={() => navigate('/')}
            style={s.navBtn}
          >
            Créer un compte
          </button>
        </div>
      </nav>

      <main style={s.centerWrap}>
        <div className="fade-up" style={s.header}>
          <h1 style={s.title}>Connectez-vous</h1>

          <p style={s.subtitle}>
            Accédez à votre espace CardioWave.
          </p>
        </div>

        <div className="fade-up" style={s.card}>
          <form onSubmit={handleSubmit}>
            <div style={s.stack}>
              <div style={s.sectionLabel}>
                Identité utilisateur
              </div>

              <div style={s.field}>
                <label style={s.label}>Email</label>

                <div style={s.inputWrap}>
                  <span style={s.inputIcon}>
                    <IconMail />
                  </span>

                  <input
                    className="cw-input"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Mot de passe</label>

                <div style={s.inputWrap}>
                  <span style={s.inputIcon}>
                    <IconLock />
                  </span>

                  <input
                    className="cw-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: 48 }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    style={s.eyeBtn}
                  >
                    {showPass ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/mot-de-passe-oublie')}
                  style={s.forgot}
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {error && (
                <div style={s.error}>
                  {error}
                  {showResend && (
                    <div style={{ marginTop: 8 }}>
                      <button type="button" onClick={handleResend} style={{...s.forgot, color: '#DC2626', textDecoration: 'underline'}}>Renvoyer le lien de vérification</button>
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={isLoading} className="cw-btn">
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
                <div style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }}></div>
                <span style={{ margin: '0 10px', fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>OU</span>
                <div style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }}></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Échec de la connexion Google')}
                  useOneTap
                  theme="outline"
                  shape="pill"
                />
              </div>

              <p style={s.footer}>
                Vous n’avez pas de compte ?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={s.footerBtn}
                >
                  Créer un compte
                </button>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

const IconMail = () => (
  <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="#8A8FB8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="16" height="12" rx="2" />
    <path d="M2 4l8 7 8-7" />
  </svg>
);

const IconLock = () => (
  <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="#8A8FB8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="8" width="12" height="10" rx="2" />
    <path d="M7 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8A8FB8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8A8FB8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a20.29 20.29 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.29 20.29 0 0 1-3.24 4.19" />
    <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');

html,
body,
#root {
  margin: 0;
  width: 100%;
  height: 100%;
}

* {
  box-sizing: border-box;
}

@keyframes blobMove {
  from { transform: translate(0,0) scale(1); }
  to { transform: translate(28px,18px) scale(1.08); }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(25px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.blob {
  animation: blobMove 12s ease-in-out infinite alternate;
}

.fade-up {
  animation: fadeUp .7s ease both;
}

.cw-input {
  width: 100%;
  height: 52px;
  border-radius: 16px;
  border: 1.5px solid rgba(79,70,229,.14);
  background: rgba(255,255,255,.92);
  padding: 0 16px 0 44px;
  outline: none;
  box-sizing: border-box;
  font-size: .94rem;
  font-family: 'DM Sans', sans-serif;
  color: #101653;
  transition: .2s;
}

.cw-input:focus {
  border-color: #4F46E5;
  box-shadow: 0 0 0 4px rgba(79,70,229,.10);
  background: #fff;
}

.cw-input::placeholder {
  color: #A5A9C7;
  font-weight: 400;
}

.cw-btn {
  width: 100%;
  height: 52px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg,#4F46E5,#7C3AED);
  color: white;
  font-weight: 800;
  font-size: .96rem;
  cursor: pointer;
  box-shadow: 0 18px 38px rgba(79,70,229,.24);
  font-family: 'DM Sans', sans-serif;
  transition: transform .2s, box-shadow .2s;
}

.cw-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 22px 46px rgba(79,70,229,.30);
}

.cw-btn:disabled {
  opacity: .65;
  cursor: not-allowed;
}

button {
  font-family: inherit;
}
`;

const s: Record<string, CSSProperties> = {
  root: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'DM Sans', sans-serif",
    background: '#F5F7FF',
  },

  bgCanvas: {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    background:
      'linear-gradient(135deg,#F5F7FF 0%,#EEF0FF 45%,#E9E4FF 100%)',
  },

  blob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(95px)',
    opacity: 0.35,
  },

  blob1: {
    width: 540,
    height: 540,
    background: '#A5B4FC',
    top: -140,
    left: -130,
  },

  blob2: {
    width: 420,
    height: 420,
    background: '#818CF8',
    right: -100,
    top: '30%',
  },

  blob3: {
    width: 360,
    height: 360,
    background: '#DBEAFE',
    bottom: -90,
    left: '35%',
  },

  nav: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 56px',
    width: '100%',
  },

  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
  },

  logoIcon: {
    width: 38,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: '#101653',
  },

  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },

  loginText: {
    color: '#7C82B4',
    fontSize: '.9rem',
    fontWeight: 700,
  },

  navBtn: {
    padding: '10px 24px',
    borderRadius: 999,
    background:
      'linear-gradient(135deg,#4F46E5,#7C3AED)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    fontWeight: 800,
    fontSize: '.88rem',
    boxShadow: '0 14px 30px rgba(79,70,229,.24)',
  },

  centerWrap: {
    position: 'relative',
    zIndex: 2,
    minHeight: 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: '40px 20px 40px',
    width: '100%',
  },

  header: {
    textAlign: 'center',
    marginBottom: 28,
  },

  title: {
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#101653',
    margin: 0,
    marginBottom: 12,
    lineHeight: 1.15,
  },

  subtitle: {
    color: '#7C82B4',
    fontSize: '1rem',
    lineHeight: 1.7,
    margin: 0,
    fontWeight: 600,
  },

  card: {
    width: '100%',
    maxWidth: 460,
    background: 'rgba(255,255,255,.82)',
    backdropFilter: 'blur(20px)',
    borderRadius: 30,
    padding: '34px 32px',
    border: '1.5px solid rgba(79,70,229,.14)',
    boxShadow: '0 24px 70px rgba(79,70,229,.12)',
  },

  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },

  sectionLabel: {
    fontSize: '.82rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    color: '#4F46E5',
    letterSpacing: '.6px',
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  label: {
    fontSize: '.84rem',
    fontWeight: 800,
    color: '#101653',
  },

  inputWrap: {
    position: 'relative',
  },

  inputIcon: {
    position: 'absolute',
    left: 15,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  },

  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },

  forgot: {
    alignSelf: 'flex-end',
    border: 'none',
    background: 'transparent',
    color: '#4F46E5',
    fontSize: '.82rem',
    fontWeight: 800,
    cursor: 'pointer',
    padding: 0,
    marginTop: 2,
  },

  error: {
    background: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid rgba(220,38,38,.18)',
    borderRadius: 14,
    padding: '13px 15px',
    fontSize: '.88rem',
    fontWeight: 700,
  },

  footer: {
    margin: '2px 0 0',
    textAlign: 'center',
    color: '#101653',
    fontSize: '.86rem',
    fontWeight: 700,
  },

  footerBtn: {
    border: 'none',
    background: 'transparent',
    color: '#4F46E5',
    fontSize: '.86rem',
    fontWeight: 900,
    cursor: 'pointer',
    padding: 0,
  },
};