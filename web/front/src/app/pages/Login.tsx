// src/app/pages/Connexion.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from "../../services/api";

export default function Connexion() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();
  
  const handleLogin = async () => {
    try {
      const res = await API.post("/auth/login", {
        email,
        password,
      });

      // 🔥 stocker token
      localStorage.setItem("token", res.data.token);

      console.log("Login success:", res.data);

      // 👉 redirection plus tard
    } catch (error: any) {
      console.error(error.response?.data?.message);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/tableau-de-bord');
    } catch (err: any) {
      setError(err || 'Email ou mot de passe incorrect.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes blobDrift {
          from { transform:translate(0,0) scale(1); }
          to   { transform:translate(24px,16px) scale(1.08); }
        }
        @keyframes heartbeat {
          0%,100% { transform:scale(1);    filter:drop-shadow(0 6px 18px rgba(231,77,127,.28)); }
          14%     { transform:scale(1.22); filter:drop-shadow(0 10px 30px rgba(231,77,127,.52)); }
          28%     { transform:scale(1.04); filter:drop-shadow(0 6px 18px rgba(231,77,127,.28)); }
          42%     { transform:scale(1.13); filter:drop-shadow(0 8px 24px rgba(231,77,127,.40)); }
          70%     { transform:scale(1);    filter:drop-shadow(0 6px 18px rgba(231,77,127,.28)); }
        }
        @keyframes expandRing {
          0%   { transform:scale(.7);  opacity:.6; }
          100% { transform:scale(1.3); opacity:0;  }
        }
        @keyframes drawECG {
          0%   { stroke-dashoffset:500; opacity:1; }
          65%  { stroke-dashoffset:0;   opacity:1; }
          100% { stroke-dashoffset:0;   opacity:0; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes slideInLeft {
          from { opacity:0; transform:translateX(-30px); }
          to   { opacity:1; transform:translateX(0);     }
        }

        .cw-blob  { animation:blobDrift 14s ease-in-out infinite alternate; }
        .cw-heart { animation:heartbeat 1.6s ease-in-out infinite; }
        .cw-ring-1{ animation:expandRing 2.8s ease-out infinite 0s;    }
        .cw-ring-2{ animation:expandRing 2.8s ease-out infinite .9s;   }
        .cw-ring-3{ animation:expandRing 2.8s ease-out infinite 1.8s;  }
        .cw-ecg   {
          stroke:rgba(26,95,200,.45); stroke-width:2; fill:none;
          stroke-dasharray:500; animation:drawECG 3s linear infinite;
        }
        .cw-left  { animation:slideInLeft .7s ease both; }
        .cw-right { animation:fadeUp .7s ease .15s both; }

        .cw-input {
          width:100%; padding:13px 16px;
          border:1.5px solid rgba(215, 235, 255, 0.89);
          border-radius:12px; font-size:.95rem;
          font-family:'DM Sans',sans-serif; color:#1a1e2e;
          background:#fff; outline:none;
          transition:border-color .2s, box-shadow .2s;
          box-sizing:border-box;
        }
        .cw-input:focus {
          border-color:#1a5fc8;
          box-shadow:0 0 0 4px rgba(174, 202, 245, 0.09);
        }
        .cw-input::placeholder { color:#b0bcd0; }

        .cw-btn-primary {
          width:100%; padding:14px;
          background:#1a5fc8; color:white; border:none;
          border-radius:50px; font-size:.97rem; font-weight:600;
          font-family:'DM Sans',sans-serif; cursor:pointer;
          box-shadow:0 6px 20px rgba(188, 212, 248, 0.3);
          transition:background .2s, transform .15s, box-shadow .2s;
        }
        .cw-btn-primary:hover:not(:disabled) {
          background:#1550b0;
          transform:translateY(-2px);
          box-shadow:0 10px 28px rgba(26,95,200,.38);
        }
        .cw-btn-primary:disabled { opacity:.65; cursor:not-allowed; }

        .cw-demo-row:hover { background:rgba(93, 117, 154, 0.06); cursor:pointer; border-radius:8px; }

        .cw-show-pass {
          position:absolute; right:14px; top:50%; transform:translateY(-50%);
          background:none; border:none; cursor:pointer; color:#8899bb;
          font-size:.85rem; padding:4px;
          transition:color .2s;
        }
        .cw-show-pass:hover { color:#1a5fc8; }
      `}</style>

      {/* ── background ── */}
      <div style={s.bg}>
        <div className="cw-blob" style={{ ...s.blob, width:480, height:480, background:'#d8eaff', top:-100, left:-100, animationDelay:'0s' }} />
        <div className="cw-blob" style={{ ...s.blob, width:360, height:360, background:'#bfdbfe', bottom:-80, right:-60, animationDelay:'5s' }} />
        <div className="cw-blob" style={{ ...s.blob, width:260, height:260, background:'#dbeafe', top:'45%', left:'42%', animationDelay:'9s' }} />
      </div>

      {/* ── layout ── */}
      <div style={s.layout}>

        {/* ──── LEFT PANEL ──── */}
        <div className="cw-left" style={s.leftPanel}>

          {/* Logo */}
          <div style={s.logoWrap}>
            <div style={s.logoIcon}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <span style={s.logoText}>CardioWave</span>
          </div>

          {/* Headline */}
          <div style={{ marginTop:48, marginBottom:40 }}>
            <h1 style={s.leftTitle}>
              Bienvenue<br/>
              <span style={{ color:'#1a5fc8' }}>Dr. Médecin</span>
            </h1>
            <p style={s.leftSubtitle}>
              Accédez à votre tableau de bord pour analyser vos ECG, suivre vos patients et consulter les alertes en temps réel.
            </p>
          </div>

          {/* Animated heart scene */}
          <div style={s.heartScene}>
            {/* rings */}
            <div style={s.ringsWrap}>
              <div className="cw-ring-1" style={{ ...s.ring, width:110, height:110 }} />
              <div className="cw-ring-2" style={{ ...s.ring, width:165, height:165 }} />
              <div className="cw-ring-3" style={{ ...s.ring, width:225, height:225 }} />
            </div>
            {/* heart */}
            <div className="cw-heart" style={{ zIndex:2 }}>
              <svg width="90" height="83" viewBox="0 0 100 92">
                <defs>
                  <linearGradient id="hgL" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f472b6"/>
                    <stop offset="100%" stopColor="#be185d"/>
                  </linearGradient>
                  <radialGradient id="hsL" cx="38%" cy="30%" r="52%">
                    <stop offset="0%" stopColor="rgba(255,255,255,.38)"/>
                    <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
                  </radialGradient>
                </defs>
                <path d="M50 85 C50 85 5 52 5 28 C5 14 16 5 28 5 C36 5 44 9 50 16 C56 9 64 5 72 5 C84 5 95 14 95 28 C95 52 50 85 50 85Z" fill="url(#hgL)"/>
                <path d="M50 85 C50 85 5 52 5 28 C5 14 16 5 28 5 C36 5 44 9 50 16 C56 9 64 5 72 5 C84 5 95 14 95 28 C95 52 50 85 50 85Z" fill="url(#hsL)"/>
              </svg>
            </div>
            {/* ecg */}
            <div style={s.ecgWrap}>
              <svg viewBox="0 0 340 36" style={{ width:'100%', height:36, overflow:'visible' }}>
                <path className="cw-ecg" d="M0,18 L50,18 L62,4 L72,32 L82,4 L94,32 L104,18 L145,18 L157,4 L167,32 L177,4 L189,32 L199,18 L240,18 L252,4 L262,32 L272,4 L284,32 L294,18 L340,18"/>
              </svg>
            </div>
          </div>

          {/* KPI pills */}
          <div style={s.kpiRow}>
            {[['98%','Précision'],['50k+','Patients'],['24/7','Monitoring']].map(([v,l]) => (
              <div key={l} style={s.kpiPill}>
                <span style={s.kpiVal}>{v}</span>
                <span style={s.kpiLabel}>{l}</span>
              </div>
            ))}
          </div>

          {/* Back to home */}
          <Link to="/" style={s.backLink}>
            ← Retour à l'accueil
          </Link>
        </div>

        {/* ──── RIGHT PANEL — FORM ──── */}
        <div className="cw-right" style={s.rightPanel}>
          <div style={s.formCard}>

            {/* Header */}
            <div style={{ marginBottom:32 }}>
              <h2 style={s.formTitle}>Connexion</h2>
              <p style={s.formSubtitle}>Accédez à votre espace médecin CardioWave</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* Email */}
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Adresse email</label>
                <div style={s.inputWrap}>
                  <span style={s.inputIcon}>
                    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="#8899bb" strokeWidth="1.6" strokeLinecap="round">
                      <path d="M2 4h16v12H2z" rx="2"/>
                      <path d="M2 4l8 7 8-7"/>
                    </svg>
                  </span>
                  <input
                    className="cw-input"
                    type="email"
                    placeholder="medecin@hopital.fr"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{ paddingLeft:44 }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={s.fieldGroup}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <label style={s.fieldLabel}>Mot de passe</label>
                  <Link to="/mot-de-passe-oublie" style={s.forgotLink}>
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div style={{ position:'relative' }}>
                  <span style={{ ...s.inputIcon, pointerEvents:'none' }}>
                    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="#8899bb" strokeWidth="1.6" strokeLinecap="round">
                      <rect x="4" y="8" width="12" height="10" rx="2"/>
                      <path d="M7 8V6a3 3 0 0 1 6 0v2"/>
                    </svg>
                  </span>
                  <input
                    className="cw-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ paddingLeft:44, paddingRight:48 }}
                  />
                  <button
                    type="button"
                    className="cw-show-pass"
                    onClick={() => setShowPass(p => !p)}
                    title={showPass ? 'Masquer' : 'Afficher'}
                  >
                    {showPass ? (
                      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M17.94 10c-.46-2.54-2.88-5-7.94-5S2.52 7.46 2.06 10c.46 2.54 2.88 5 7.94 5s7.48-2.46 7.94-5z"/>
                        <circle cx="10" cy="10" r="3"/>
                        <line x1="3" y1="3" x2="17" y2="17"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M17.94 10c-.46-2.54-2.88-5-7.94-5S2.52 7.46 2.06 10c.46 2.54 2.88 5 7.94 5s7.48-2.46 7.94-5z"/>
                        <circle cx="10" cy="10" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={s.errorBox}>
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="#dc2626" style={{ flexShrink:0 }}>
                    <path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2zm0 4v4m0 4h.01" stroke="#dc2626" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" className="cw-btn-primary" disabled={isLoading} style={{ marginTop:4 }}>
                {isLoading ? (
                  <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation:'spin 1s linear infinite' }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Connexion en cours…
                  </span>
                ) : 'Se connecter'}
              </button>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </form>

            {/* Divider */}
            <div style={s.divider}>
              <div style={s.dividerLine} />
              <span style={s.dividerText}>Comptes de démonstration</span>
              <div style={s.dividerLine} />
            </div>

            {/* Demo accounts */}
            <div style={s.demoBox}>
              {[
                { emoji:'👨‍💼', role:'Admin',   email:'admin@ecg.com'   },
                { emoji:'👨‍⚕️', role:'Médecin', email:'doctor@ecg.com'  },
                { emoji:'🧑',  role:'Patient', email:'patient@ecg.com' },
              ].map(d => (
                <div
                  key={d.role}
                  className="cw-demo-row"
                  style={s.demoRow}
                  onClick={() => { setEmail(d.email); setPassword('demo'); }}
                >
                  <span style={{ fontSize:'1.1rem' }}>{d.emoji}</span>
                  <div>
                    <span style={s.demoRole}>{d.role}</span>
                    <span style={s.demoEmail}>{d.email}</span>
                  </div>
                  <span style={s.demoFill}>Utiliser →</span>
                </div>
              ))}
              <p style={{ fontSize:'.75rem', color:'#b0bcd0', marginTop:4, textAlign:'center' }}>
                Mot de passe : n'importe lequel
              </p>
            </div>

            {/* Sign up link */}
            <p style={{ textAlign:'center', fontSize:'.88rem', color:'#6b7a99', marginTop:24 }}>
              Pas encore de compte ?{' '}
              <Link to="/inscription" style={{ color:'#1a5fc8', fontWeight:600, textDecoration:'none' }}>
                Créer un compte
              </Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════ STYLES ══════════════════════════════════════ */
const s: Record<string, React.CSSProperties> = {

  root: {
    position:'relative', minHeight:'100vh',
    fontFamily:"'DM Sans','Segoe UI',sans-serif",
    background:'#ffffff', overflow:'hidden',
  },

  bg: { position:'fixed', inset:0, zIndex:0, pointerEvents:'none' },
  blob: { position:'absolute', borderRadius:'50%', filter:'blur(80px)', opacity:0.20 },

  layout: {
    position:'relative', zIndex:1,
    display:'grid', gridTemplateColumns:'1fr 1fr',
    minHeight:'100vh',
  },

  /* LEFT */
  leftPanel: {
    display:'flex', flexDirection:'column',
    padding:'48px 56px',
    background:'linear-gradient(160deg,#f0f7ff 0%,#e8f2ff 60%,#f5f9ff 100%)',
    borderRight:'1px solid rgba(200,220,255,0.4)',
    position:'relative', overflow:'hidden',
  },

  logoWrap: { display:'flex', alignItems:'center', gap:10 },
  logoIcon: {
    width:40, height:40, background:'#1a5fc8', borderRadius:12,
    display:'flex', alignItems:'center', justifyContent:'center',
    boxShadow:'0 4px 14px rgba(26,95,200,0.3)',
  },
  logoText: {
    fontFamily:"'Playfair Display',Georgia,serif",
    fontSize:'1.5rem', fontWeight:700, color:'#1a5fc8',
  },

  leftTitle: {
    fontFamily:"'Playfair Display',Georgia,serif",
    fontSize:'2.6rem', fontWeight:700, lineHeight:1.2, color:'#1a1e2e',
    marginBottom:16,
  },
  leftSubtitle: { fontSize:'1rem', color:'#6b7a99', lineHeight:1.75, maxWidth:360 },

  heartScene: {
    position:'relative', flex:1,
    display:'flex', alignItems:'center', justifyContent:'center',
    minHeight:260,
  },
  ringsWrap: { position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1 },
  ring: { position:'absolute', borderRadius:'50%', border:'1.5px solid rgba(231,77,127,0.20)' },
  ecgWrap: { position:'absolute', bottom:16, left:0, right:0, zIndex:3 },

  kpiRow: { display:'flex', gap:12, marginBottom:32, flexWrap:'wrap' },
  kpiPill: {
    display:'flex', flexDirection:'column', alignItems:'center',
    background:'rgba(255,255,255,0.7)', border:'1px solid rgba(200,220,255,0.5)',
    borderRadius:14, padding:'10px 18px',
    backdropFilter:'blur(8px)',
    boxShadow:'0 2px 12px rgba(26,95,200,0.07)',
  },
  kpiVal: { fontFamily:"'Playfair Display',serif", fontSize:'1.3rem', fontWeight:700, color:'#1a1e2e' },
  kpiLabel: { fontSize:'0.72rem', color:'#6b7a99', marginTop:1 },

  backLink: {
    textDecoration:'none', color:'#6b7a99', fontSize:'0.85rem',
    fontWeight:500, display:'inline-flex', alignItems:'center', gap:6,
    transition:'color .2s',
  },

  /* RIGHT */
  rightPanel: {
    display:'flex', alignItems:'center', justifyContent:'center',
    padding:'48px 56px',
    background:'#ffffff',
  },

  formCard: {
    width:'100%', maxWidth:440,
  },

  formTitle: {
    fontFamily:"'Playfair Display',Georgia,serif",
    fontSize:'2rem', fontWeight:700, color:'#1a1e2e', marginBottom:8,
  },
  formSubtitle: { fontSize:'0.95rem', color:'#6b7a99' },

  fieldGroup: { display:'flex', flexDirection:'column', gap:8 },
  fieldLabel: { fontSize:'0.83rem', fontWeight:600, color:'#4a556e', letterSpacing:'0.2px' },
  inputWrap: { position:'relative' },
  inputIcon: {
    position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
    display:'flex', alignItems:'center', zIndex:1,
  },
  forgotLink: { fontSize:'0.82rem', color:'#1a5fc8', textDecoration:'none', fontWeight:500 },

  errorBox: {
    display:'flex', alignItems:'center', gap:8,
    background:'#fef2f2', border:'1px solid rgba(220,38,38,.2)',
    color:'#dc2626', borderRadius:10, padding:'11px 14px',
    fontSize:'0.88rem',
  },

  divider: { display:'flex', alignItems:'center', gap:12, margin:'26px 0 20px' },
  dividerLine: { flex:1, height:1, background:'rgba(200,220,255,0.5)' },
  dividerText: { fontSize:'0.78rem', color:'#aab4cc', whiteSpace:'nowrap', fontWeight:500 },

  demoBox: {
    background:'rgba(248,251,255,1)', border:'1px solid rgba(200,220,255,0.5)',
    borderRadius:16, padding:'14px 16px',
    display:'flex', flexDirection:'column', gap:4,
  },
  demoRow: {
    display:'flex', alignItems:'center', gap:12,
    padding:'8px 10px', transition:'background .15s',
  },
  demoRole: { display:'block', fontSize:'.83rem', fontWeight:600, color:'#1a1e2e' },
  demoEmail: { display:'block', fontSize:'.76rem', color:'#6b7a99' },
  demoFill: { marginLeft:'auto', fontSize:'.76rem', color:'#1a5fc8', fontWeight:600 },
};