// src/app/pages/InscriptionPatient.tsx

import { useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

export default function InscriptionPatient() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        nom,
        prenom,
        email,
        password,
        role: 'patient',
        telephone,
        dateNaissance,
      });

      setShowSuccess(true);
      setTimeout(() => {
        navigate('/connexion');
      }, 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setIsLoading(true);
      await googleLogin(credentialResponse.credential, "patient");
      navigate('/patient/dashboard');
    } catch (err: any) {
      setError(err || 'Erreur Google Login.');
    } finally {
      setIsLoading(false);
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
          <span style={s.loginText}>Déjà un compte ?</span>
          <Link to="/connexion" style={s.navBtn}>
            Se connecter
          </Link>
        </div>
      </nav>

      <div style={s.centerWrap}>
        <div className="fade-up" style={s.header}>
          <h1 style={s.title}>Créez votre compte patient</h1>
          <p style={s.subtitle}>Rejoignez CardioWave et prenez soin de votre cœur.</p>
        </div>

        <div className="fade-up" style={s.stepRow}>
          {[{ n: 1, label: 'Informations' }, { n: 2, label: 'Sécurité' }].map((st) => (
            <div key={st.n} style={s.stepItem}>
              <div
                style={{
                  ...s.stepCircle,
                  background: step >= st.n ? 'linear-gradient(135deg,#6B35F5,#9A35FF)' : '#ECE9FF',
                  color: step >= st.n ? 'white' : '#8A8FB8',
                }}
              >
                {step > st.n ? '✓' : st.n}
              </div>

              <span
                style={{
                  fontSize: '.82rem',
                  fontWeight: step === st.n ? 800 : 600,
                  color: step === st.n ? '#6B35F5' : '#8A8FB8',
                }}
              >
                {st.label}
              </span>

              {st.n < 2 && <div style={s.stepLine} />}
            </div>
          ))}
        </div>

        {showSuccess && (
          <div className="fade-up" style={{ width: '100%', maxWidth: 700, background: '#ECFDF5', padding: '20px 28px', borderRadius: 20, border: '1px solid #34D399', marginBottom: 20, textAlign: 'center' }}>
            <h3 style={{ color: '#065F46', margin: '0 0 10px', fontSize: '1.2rem' }}>Inscription réussie !</h3>
            <p style={{ color: '#047857', margin: 0, fontSize: '0.95rem' }}>
              Un email de vérification vous a été envoyé. Veuillez vérifier votre boîte de réception pour activer votre compte.
            </p>
          </div>
        )}

        <div className="fade-up" style={step === 1 ? s.cardInfo : s.cardSecurity}>
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div style={s.stack}>
                <div style={s.sectionLabel}>Informations du patient</div>

                <div style={s.row2}>
                  <Field label="Prénom">
                    <input className="cw-input" placeholder="Marie" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
                  </Field>

                  <Field label="Nom">
                    <input className="cw-input" placeholder="Dupont" value={nom} onChange={(e) => setNom(e.target.value)} />
                  </Field>
                </div>

                <Field label="Email">
                  <input className="cw-input" type="email" placeholder="marie.dupont@email.fr" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>

                <Field label="Téléphone">
                  <input className="cw-input" placeholder="+216 00 000 000" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
                </Field>

                <Field label="Date de naissance">
                  <input className="cw-input" type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
                </Field>

                {error && <ErrBox msg={error} />}

                <button
                  type="button"
                  className="cw-btn"
                  onClick={() => {
                    if (!prenom || !nom || !email || !telephone || !dateNaissance) {
                      setError('Veuillez remplir tous les champs.');
                      return;
                    }

                    setError('');
                    setStep(2);
                  }}
                >
                  Continuer →
                </button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0' }}>
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
              </div>
            )}

            {step === 2 && (
              <div style={s.stack}>
                <div style={s.sectionLabel}>Sécurité du compte</div>

                <div style={s.row2}>
                  <PasswordField
                    label="Mot de passe"
                    show={showPass}
                    toggle={() => setShowPass((p) => !p)}
                    value={password}
                    onChange={setPassword}
                  />

                  <PasswordField
                    label="Confirmer"
                    show={showConfirm}
                    toggle={() => setShowConfirm((p) => !p)}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                  />
                </div>

                {error && <ErrBox msg={error} />}

                <div style={s.actions}>
                  <button type="button" className="cw-btn-ghost" onClick={() => setStep(1)}>
                    Retour
                  </button>

                  <button type="submit" className="cw-btn" disabled={isLoading}>
                    {isLoading ? 'Création...' : 'Créer mon compte'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <p style={s.bottomText}>
          Vous êtes médecin ?{' '}
          <Link to="/inscription" style={s.bottomLink}>
            Compte médecin →
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

function PasswordField({
  label,
  show,
  toggle,
  value,
  onChange,
}: {
  label: string;
  show: boolean;
  toggle: () => void;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>

      <div style={{ position: 'relative' }}>
        <input
          className="cw-input"
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingRight: 48 }}
        />

        <button type="button" onClick={toggle} style={s.eyeBtn}>
          {show ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return <div style={s.err}>{msg}</div>;
}

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
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');

@keyframes blobMove {
  from { transform:translate(0,0) scale(1); }
  to { transform:translate(28px,18px) scale(1.08); }
}

@keyframes fadeUp {
  from { opacity:0; transform:translateY(25px); }
  to { opacity:1; transform:translateY(0); }
}

.blob {
  animation:blobMove 12s ease-in-out infinite alternate;
}

.fade-up {
  animation:fadeUp .7s ease both;
}

.cw-input {
  width:100%;
  height:52px;
  border-radius:16px;
  border:1.5px solid rgba(79,70,229,.14);
  background:rgba(255,255,255,.92);
  padding:0 16px;
  outline:none;
  box-sizing:border-box;
  font-size:.94rem;
  font-family:'DM Sans',sans-serif;
  color:#101653;
  transition:.2s;
}

.cw-input:focus {
  border-color:#4F46E5;
  box-shadow:0 0 0 4px rgba(79,70,229,.10);
}

.cw-btn {
  width:100%;
  height:52px;
  border:none;
  border-radius:999px;
  background:linear-gradient(135deg,#4F46E5,#7C3AED);
  color:white;
  font-weight:800;
  font-size:.95rem;
  cursor:pointer;
  box-shadow:0 18px 38px rgba(79,70,229,.24);
}

.cw-btn-ghost {
  height:52px;
  padding:0 26px;
  border-radius:999px;
  border:1.5px solid rgba(79,70,229,.16);
  background:white;
  color:#4F46E5;
  font-weight:700;
  cursor:pointer;
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
    background: 'linear-gradient(135deg,#F5F7FF 0%,#EEF0FF 45%,#E9E4FF 100%)',
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
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 56px',
    boxSizing: 'border-box',
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
    borderRadius: 12,
    background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 28px rgba(79,70,229,.25)',
  },

  logoText: {
    fontSize: '1.35rem',
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
    fontWeight: 600,
  },

  navBtn: {
    padding: '10px 24px',
    borderRadius: 999,
    background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
    color: 'white',
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
    padding: '0px 20px 20px',
    marginTop: '-45px',
    width: '100%',
    boxSizing: 'border-box',
  },

  header: {
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 40,
  },

  title: {
    fontSize: '2.5rem',
    fontWeight: 900,
    color: '#101653',
    marginBottom: 12,
  },

  subtitle: {
    color: '#7C82B4',
    fontSize: '1rem',
    lineHeight: 1.7,
  },

  stepRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 18,
  },

  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    boxShadow: '0 10px 24px rgba(79,70,229,.16)',
  },

  stepLine: {
    width: 80,
    height: 2,
    background: 'rgba(79,70,229,.14)',
    margin: '0 12px',
  },

  cardInfo: {
    width: '100%',
    maxWidth: 700,
    background: 'rgba(255,255,255,.82)',
    backdropFilter: 'blur(20px)',
    borderRadius: 30,
    padding: '30px 28px',
    border: '1.5px solid rgba(79,70,229,.14)',
    boxShadow: '0 24px 70px rgba(79,70,229,.12)',
    boxSizing: 'border-box',
  },

  cardSecurity: {
    width: '100%',
    maxWidth: 700,
    minHeight: 350,
    background: 'rgba(255,255,255,.82)',
    backdropFilter: 'blur(20px)',
    borderRadius: 30,
    padding: '42px 48px',
    border: '1.5px solid rgba(79,70,229,.14)',
    boxShadow: '0 24px 70px rgba(79,70,229,.12)',
    boxSizing: 'border-box',
  },

  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },

  sectionLabel: {
    fontSize: '.82rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    color: '#4F46E5',
    letterSpacing: '.6px',
  },

  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginTop: 20,
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

  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
  },

  err: {
    background: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid rgba(220,38,38,.18)',
    borderRadius: 14,
    padding: '13px 15px',
    fontSize: '.88rem',
    fontWeight: 600,
  },

  actions: {
    display: 'flex',
    gap: 16,
    marginTop: 30,
  },

  bottomText: {
    textAlign: 'center',
    fontSize: '.88rem',
    color: '#7C82B4',
    marginTop: 18,
    fontWeight: 600,
  },

  bottomLink: {
    color: '#4F46E5',
    fontWeight: 900,
    textDecoration: 'none',
  },
};