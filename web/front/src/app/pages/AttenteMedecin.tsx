import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export default function AttenteMedecin() {
  const { user, pendingUser, isPending, logout } = useAuth();
  const pendingDoctor = pendingUser || user;

  if (!isPending || !pendingDoctor || pendingDoctor.role !== 'medecin') {
    return <Navigate to="/connexion" replace />;
  }

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
            <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>

          <span style={s.logoText}>
            Cardio<span style={{ color: '#6B35F5' }}>Wave</span>
          </span>
        </Link>
      </nav>

      <main style={s.center}>
        <div className="fade-up" style={s.card}>
          <div style={s.iconCircle}>
            <svg
              viewBox="0 0 24 24"
              width="34"
              height="34"
              fill="none"
              stroke="#6B35F5"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h1 style={s.title}>Compte en cours de validation</h1>

          <p style={s.subtitle}>
            Bonjour <strong>{pendingDoctor.prenom}</strong>, votre inscription a bien été enregistrée.
          </p>

          <div style={s.statusBanner}>
            <div style={s.statusDot} />
            <span style={s.statusText}>
              En attente de vérification par l’administrateur
            </span>
          </div>

          <div style={s.infoCard}>
            <h3 style={s.infoTitle}>Comment ça marche ?</h3>

            <div style={s.stepsList}>
              {[
                {
                  n: '1',
                  text: "Votre numéro d'inscription est vérifié par notre équipe",
                  done: true,
                },
                {
                  n: '2',
                  text: 'Un administrateur valide votre profil médecin',
                  done: false,
                },
                {
                  n: '3',
                  text: 'Vous recevez l’accès complet au dashboard',
                  done: false,
                },
              ].map((step) => (
                <div key={step.n} style={s.stepRow}>
                  <div
                    style={{
                      ...s.stepCircle,
                      background: step.done
                        ? 'linear-gradient(135deg,#6B35F5,#9A35FF)'
                        : '#ECE9FF',
                      color: step.done ? 'white' : '#8A8FB8',
                    }}
                  >
                    {step.done ? '✓' : step.n}
                  </div>

                  <span
                    style={{
                      fontSize: '.9rem',
                      color: step.done ? '#6B35F5' : '#59617F',
                      fontWeight: step.done ? 800 : 600,
                    }}
                  >
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={s.userInfo}>
            <div style={s.userRow}>
              <span style={s.userLabel}>Email</span>
              <span style={s.userValue}>{pendingDoctor.email}</span>
            </div>

            <div style={s.userRow}>
              <span style={s.userLabel}>Spécialité</span>
              <span style={s.userValue}>{pendingDoctor.specialite || '—'}</span>
            </div>
          </div>

          <div style={s.reassurance}>
            <span style={s.reassuranceIcon}>✓</span>
            <span style={s.reassuranceText}>
              Vos données sont sécurisées. Vous serez notifié dès que votre compte sera activé.
            </span>
          </div>

          <div style={s.actions}>
            <button onClick={logout} style={s.logoutBtn}>
              Se déconnecter
            </button>

            <Link to="/" style={s.homeLink}>
              Retour à l’accueil
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');

@keyframes blobMove {
  from { transform: translate(0,0) scale(1); }
  to { transform: translate(28px,18px) scale(1.08); }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(25px); }
  to { opacity: 1; transform: translateY(0); }
}

.blob {
  animation: blobMove 12s ease-in-out infinite alternate;
}

.fade-up {
  animation: fadeUp .7s ease both;
}
`;

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'DM Sans', sans-serif",
    background: '#F8F5FF',
  },

  bgCanvas: {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    background: 'linear-gradient(135deg,#F8F5FF 0%,#EEF0FF 45%,#E9E4FF 100%)',
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
    background: '#C4B5FD',
    top: -140,
    left: -130,
  },

  blob2: {
    width: 420,
    height: 420,
    background: '#A78BFA',
    right: -100,
    top: '30%',
  },

  blob3: {
    width: 360,
    height: 360,
    background: '#E9D5FF',
    bottom: -90,
    left: '35%',
  },

  nav: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 56px',
    width: '100%',
    boxSizing: 'border-box',
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
    background: 'linear-gradient(135deg,#6B35F5 0%,#9A35FF 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 28px rgba(106,53,245,.25)',
  },

  logoText: {
    fontSize: '1.35rem',
    fontWeight: 900,
    color: '#101653',
  },

  center: {
    position: 'relative',
    zIndex: 2,
    minHeight: 'calc(100vh - 80px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 20px 40px',
  },

  card: {
    width: '100%',
    maxWidth: 560,
    background: 'rgba(255,255,255,.82)',
    backdropFilter: 'blur(20px)',
    borderRadius: 30,
    padding: '42px 42px',
    border: '1.5px solid rgba(107,53,245,.14)',
    boxShadow: '0 24px 70px rgba(106,53,245,.12)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    alignItems: 'center',
  },

  iconCircle: {
    width: 74,
    height: 74,
    borderRadius: '50%',
    background: 'rgba(107,53,245,.08)',
    border: '2px solid rgba(107,53,245,.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 16px 34px rgba(106,53,245,.16)',
  },

  title: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#101653',
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.2,
  },

  subtitle: {
    fontSize: '.98rem',
    color: '#7C82B4',
    textAlign: 'center',
    lineHeight: 1.6,
    margin: 0,
  },

  statusBanner: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(107,53,245,.07)',
    border: '1px solid rgba(107,53,245,.16)',
    borderRadius: 15,
    padding: '13px 16px',
    boxSizing: 'border-box',
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#6B35F5',
    boxShadow: '0 0 0 4px rgba(107,53,245,.13)',
  },

  statusText: {
    fontSize: '.88rem',
    color: '#6B35F5',
    fontWeight: 800,
  },

  infoCard: {
    width: '100%',
    background: 'rgba(255,255,255,.62)',
    border: '1px solid rgba(107,53,245,.13)',
    borderRadius: 18,
    padding: '20px 22px',
    boxSizing: 'border-box',
  },

  infoTitle: {
    fontSize: '.82rem',
    fontWeight: 900,
    color: '#6B35F5',
    textTransform: 'uppercase',
    letterSpacing: '.6px',
    margin: '0 0 16px',
  },

  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },

  stepRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },

  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '.78rem',
    fontWeight: 900,
    flexShrink: 0,
  },

  userInfo: {
    width: '100%',
    border: '1px solid rgba(107,53,245,.13)',
    borderRadius: 16,
    overflow: 'hidden',
    background: 'rgba(255,255,255,.60)',
  },

  userRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
    padding: '13px 18px',
    borderBottom: '1px solid rgba(107,53,245,.08)',
  },

  userLabel: {
    fontSize: '.82rem',
    color: '#8A8FB8',
    fontWeight: 700,
  },

  userValue: {
    fontSize: '.88rem',
    color: '#101653',
    fontWeight: 800,
    textAlign: 'right',
  },

  reassurance: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    background: 'rgba(34,197,94,.07)',
    border: '1px solid rgba(34,197,94,.16)',
    borderRadius: 15,
    padding: '13px 16px',
    boxSizing: 'border-box',
  },

  reassuranceIcon: {
    color: '#16A34A',
    fontWeight: 900,
  },

  reassuranceText: {
    fontSize: '.85rem',
    color: '#59617F',
    lineHeight: 1.6,
    fontWeight: 600,
  },

  actions: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 4,
  },

  logoutBtn: {
    width: '100%',
    height: 52,
    border: 'none',
    borderRadius: 999,
    background: 'linear-gradient(135deg,#6B35F5,#9A35FF)',
    color: 'white',
    fontWeight: 800,
    fontSize: '.95rem',
    cursor: 'pointer',
    boxShadow: '0 18px 38px rgba(106,53,245,.24)',
  },

  homeLink: {
    textAlign: 'center',
    color: '#6B35F5',
    fontWeight: 800,
    textDecoration: 'none',
    fontSize: '.9rem',
  },
};