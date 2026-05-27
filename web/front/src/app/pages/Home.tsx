// src/app/pages/Home.tsx
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

/* ─── scroll-reveal hook ─── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('revealed');
          }
        }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const CARDS = [
  {
    title: 'Surveillance ECG en temps réel',
    desc: 'Acquisition et visualisation instantanée du signal ECG avec détection automatique des anomalies.',
  },
  {
    title: 'Analyse par intelligence artificielle',
    desc: "Modèles IA entraînés sur des millions d'ECG pour une classification précise et rapide.",
  },
  {
    title: 'Analyse morphologique',
    desc: 'Étude détaillée des ondes P, QRS et T pour un diagnostic morphologique complet.',
  },
  {
    title: 'Analyse rythmique',
    desc: 'Détection automatique de la fibrillation auriculaire, tachycardie, bradycardie et plus.',
  },
  {
    title: 'Dashboard médecin intuitif',
    desc: 'Interface claire et ergonomique permettant au médecin de gérer ses patients et résultats.',
  },
  {
    title: 'Alertes intelligentes',
    desc: "Notifications prioritaires en cas d'anomalie critique pour une réaction médicale immédiate.",
  },
];

const FOR_WHO = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
      </svg>
    ),
    label: 'Médecins',
    link: '/inscription',
    color: '#4F46E5',
    bg: 'rgba(79,70,229,0.08)',
    border: 'rgba(79,70,229,0.16)',
    desc: 'Accédez à une analyse rapide et fiable de chaque ECG. Notre IA vous apporte une aide au diagnostic pour réduire votre charge cognitive et améliorer la qualité de soins.',
    tags: ['Aide au diagnostic', 'Gain de temps', 'Précision'],
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
    label: 'Patients',
    link: '/inscription-patient',
    color: '#4F46E5',
    bg: 'rgba(79,70,229,0.08)',
    border: 'rgba(79,70,229,0.16)',
    desc: 'Suivez votre santé cardiaque de façon simple et visuelle. Recevez des rapports clairs et des alertes personnalisées pour rester informé en toute tranquillité.',
    tags: ['Suivi personnel', 'Alertes', 'Rapports clairs'],
  },
];

export default function Home() {
  const navigate = useNavigate();
  useReveal();

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');

         @keyframes heartbeat {
          0%,100% { transform:scale(1); filter:drop-shadow(0 8px 24px rgba(79,70,229,.26)); }
          10% { transform:scale(1.28); filter:drop-shadow(0 14px 40px rgba(124,58,237,.45)); }
          20% { transform:scale(1.05); filter:drop-shadow(0 8px 24px rgba(79,70,229,.28)); }
          35% { transform:scale(1.18); filter:drop-shadow(0 10px 32px rgba(59,130,246,.36)); }
          55% { transform:scale(1); filter:drop-shadow(0 8px 24px rgba(79,70,229,.26)); }
        }

        @keyframes expandRing {
          0% { transform:scale(.65); opacity:.65; }
          100% { transform:scale(1.22); opacity:0; }
        }

        @keyframes drawECG {
          0% { stroke-dashoffset:600; opacity:1; }
          65% { stroke-dashoffset:0; opacity:1; }
          100% { stroke-dashoffset:0; opacity:0; }
        }

        @keyframes pulseDot {
          0%,100% { box-shadow:0 0 0 3px rgba(34,197,94,.2); }
          50% { box-shadow:0 0 0 7px rgba(34,197,94,.07); }
        }

        @keyframes blobDrift {
          from { transform:translate(0,0) scale(1); }
          to { transform:translate(28px,18px) scale(1.09); }
        }

        @keyframes purpleGlow {
          0%,100% { opacity:.40; transform:scale(1); }
          50% { opacity:.62; transform:scale(1.08); }
        }

        .heart-beat { animation:heartbeat 1.5s ease-in-out infinite; }
        .ring-1 { animation:expandRing 2s ease-out infinite 0s; }
        .ring-2 { animation:expandRing 2s ease-out infinite .95s; }
        .ring-3 { animation:expandRing 2s ease-out infinite 1.9s; }

        .ecg-line {
          stroke:rgba(79,70,229,.58);
          stroke-width:2;
          fill:none;
          stroke-dasharray:600;
          animation:drawECG 3.2s linear infinite;
        }

        .badge-dot {
          width:7px;
          height:7px;
          border-radius:50%;
          background:#22c55e;
          box-shadow:0 0 0 3px rgba(34,197,94,.2);
          animation:pulseDot 2s infinite;
          flex-shrink:0;
          display:inline-block;
        }

        .blob-bg { animation:blobDrift 14s ease-in-out infinite alternate; }
        .purple-glow-br { animation:purpleGlow 4s ease-in-out infinite; }

        .reveal {
          opacity:0;
          transform:translateY(28px);
          transition:opacity .65s ease, transform .65s ease;
        }

        .reveal.revealed {
          opacity:1;
          transform:translateY(0);
        }

        .reveal-delay-1 { transition-delay:.1s; }
        .reveal-delay-2 { transition-delay:.2s; }
        .reveal-delay-3 { transition-delay:.3s; }
        .reveal-delay-4 { transition-delay:.4s; }
        .reveal-delay-5 { transition-delay:.5s; }

        .sol-card {
          background:rgba(255,255,255,.78);
          backdrop-filter:blur(18px);
          border:1px solid rgba(79,70,229,.14);
          border-radius:24px;
          padding:32px 28px;
          cursor:default;
          box-shadow:0 18px 44px rgba(79,70,229,.08);
          transition:transform .25s ease, box-shadow .25s ease, border-color .25s ease;
        }

        .sol-card:hover {
          transform:translateY(-6px);
          box-shadow:0 22px 55px rgba(79,70,229,.16);
          border-color:rgba(79,70,229,.26);
        }

        .who-card {
          border-radius:28px;
          padding:40px 32px;
          transition:transform .25s ease, box-shadow .25s ease;
          backdrop-filter:blur(20px);
        }

        .who-card:hover {
          transform:translateY(-5px);
          box-shadow:0 18px 48px rgba(79,70,229,.14);
        }

        .cw-input {
          width:100%;
          padding:14px 18px;
          border:1.5px solid rgba(79,70,229,.14);
          border-radius:16px;
          font-size:.95rem;
          font-family:'DM Sans',sans-serif;
          color:#111653;
          background:rgba(255,255,255,.88);
          outline:none;
          transition:border-color .2s, box-shadow .2s;
        }

        .cw-input:focus {
          border-color:#4F46E5;
          box-shadow:0 0 0 4px rgba(79,70,229,.10);
        }

        .cw-input::placeholder { color:#A5A9C7; }

        .section-divider {
          width:60px;
          height:4px;
          border-radius:2px;
          background:linear-gradient(90deg,#4F46E5,#3B82F6);
          margin:0 auto 20px;
        }

        .tag-pill {
          display:inline-block;
          padding:4px 12px;
          border-radius:50px;
          font-size:.74rem;
          font-weight:700;
          background:rgba(79,70,229,.08);
          color:#4F46E5;
          border:1px solid rgba(79,70,229,.15);
        }:1px solid rgba(107,53,245,.15);
        }
      `}</style>

      <div style={styles.bgCanvas}>
        <div className="blob-bg" style={{ ...styles.blob, ...styles.blob1 }} />
        <div className="blob-bg" style={{ ...styles.blob, ...styles.blob2, animationDelay: '4s' }} />
        <div className="blob-bg" style={{ ...styles.blob, ...styles.blob3, animationDelay: '8s' }} />

     

        
      </div>

      <nav style={styles.nav}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={styles.logoText}>
            Cardio<span style={{ color: '#4F46E5' }}>Wave</span>
          </span>
        </div>

        <div style={styles.navLinks}>
          <a href="#hero" style={styles.navLink}>Accueil</a>
          <a href="#solution" style={styles.navLink}>Fonctionnalités</a>
          <a href="#pourqui" style={styles.navLink}>Pour qui ?</a>
          <a href="#apropos" style={styles.navLink}>À propos</a>
          <a href="#contact" style={styles.navLink}>Contact</a>
          <button onClick={() => navigate('/connexion')} style={styles.navCta}>Connectez</button>
        </div>
      </nav>

      <main id="hero" style={styles.hero}>
        <div style={styles.heroLeft}>
         

          <h1 style={styles.title}>
            Rapide, Efficace<br />
            et <span style={{ color: '#4F46E5' }}>Productif</span><br />
            pour votre cœur
          </h1>

          <p style={styles.subtitle}>
            CardioWave surveille votre rythme cardiaque en temps réel avec une précision médicale.
            Prenez soin de vous avec une technologie pensée pour votre santé.
          </p>

          <div style={styles.actions}>
            <button
              onClick={() => document.getElementById('pourqui')?.scrollIntoView({ behavior: 'smooth' })}
              style={styles.btnPrimary}
            >
              Commencer 
            </button>

            
          </div>

         
        </div>

        <div style={styles.heroRight}>
          <div style={styles.heartScene}>
            <div className="purple-glow-br" style={styles.purpleGlowBR} />
            

            <div style={styles.ringsWrap}>
              <div className="ring-1" style={{ ...styles.ring, width: 170, height: 170 }} />
              <div className="ring-2" style={{ ...styles.ring, width: 255, height: 255 }} />
              <div className="ring-3" style={{ ...styles.ring, width: 345, height: 345 }} />
            </div>

            <div
  style={{
    position: 'relative',
    width: 520,
    height: 520,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  }}
>
  {/* IMAGE HAUT GAUCHE */}
  <img
    src="/card.png"
    alt=""
    style={{
      position: 'absolute',
      top: 70,
      left: 10,
      width: 140,
      objectFit: 'contain',
      zIndex: 1,
    }}
  />

  {/* IMAGE BAS GAUCHE */}
  <img
    src="/card2.png"
    alt=""
    style={{
      position: 'absolute',
      bottom: 80,
      left: 20,
      width: 120,
      objectFit: 'contain',
      zIndex: 1,
    }}
  />

  {/* IMAGE DROITE */}
  <img
    src="/card3.png"
    alt=""
    style={{
      position: 'absolute',
      top: 120,
      right: 0,
      width: 230,
      objectFit: 'contain',
      zIndex: 1,
    }}
  />

  {/* COEUR QUI BOUGE */}
  <div className="heart-beat" style={{ zIndex: 3 }}>
    <img
      src="/heart.png"
      alt="Heart"
      style={{
        width: 300,
        height: 600,
        objectFit: 'contain',
        display: 'block',
        marginRight:40
      }}
    />
  </div>
</div>

            <div style={styles.ecgOverlay}>
              <svg viewBox="0 0 400 44" style={{ width: '100%', height: 44, overflow: 'visible' }}>
                <path className="ecg-line" d="M0,22 L60,22 L75,6 L85,38 L95,6 L108,38 L118,22 L170,22 L185,6 L195,38 L205,6 L218,38 L228,22 L280,22 L295,6 L305,38 L315,6 L328,38 L338,22 L400,22" />
              </svg>
            </div>
          </div>
        </div>
      </main>

      <section id="solution" style={styles.section}>
        <div style={styles.sectionInner}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-divider" />
            <h2 style={styles.sectionTitle}>Une solution complète pour<br />l'analyse cardiaque</h2>
            <p style={styles.sectionSubtitle}>
              Chaque fonctionnalité est pensée pour répondre aux exigences du diagnostic médical moderne.
            </p>
          </div>

          <div style={styles.cardsGrid}>
            {CARDS.map((c, i) => (
              <div key={i} className={`sol-card reveal reveal-delay-${(i % 3) + 1}`}>
                <h3 style={styles.cardTitle}>{c.title}</h3>
                <p style={styles.cardDesc}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pourqui" style={{ ...styles.section, background: 'linear-gradient(180deg,#F5F7FF 0%,#FFFFFF 100%)' }}>
        <div style={styles.sectionInner}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-divider" />
            <h2 style={styles.sectionTitle}>Une plateforme adaptée<br />à chaque utilisateur</h2>
            <p style={styles.sectionSubtitle}>
              Que vous soyez médecin, patient ou responsable clinique, CardioWave s'adapte à vos besoins.
            </p>
          </div>

          <div style={styles.whoGrid}>
            {FOR_WHO.map((w, i) => (
              <div
                key={i}
                className={`who-card reveal reveal-delay-${i + 1}`}
                style={{
                  background: 'rgba(255,255,255,0.74)',
                  border: `1.5px solid ${w.border}`,
                  boxShadow: `0 18px 48px rgba(79,70,229,0.10)`,
                }}
              >
                <div style={{ ...styles.whoIconWrap, background: w.bg, border: `1.5px solid ${w.border}` }}>
                  {w.icon}
                </div>

                <h3 style={{ ...styles.whoLabel, color: w.color }}>{w.label}</h3>
                <p style={styles.whoDesc}>{w.desc}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
                  {w.tags.map((t, ti) => (
                    <span key={ti} className="tag-pill">
                      {t}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                  <button
                    onClick={() => navigate(w.link)}
                    style={{
                      background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 22px',
                      borderRadius: 50,
                      fontSize: '.85rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 14px 28px rgba(79,70,229,0.22)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    Commencer →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="apropos" style={styles.section}>
        <div style={styles.sectionInner}>
          <div style={styles.aboutGrid}>
            <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 24, justifyContent: 'center' }}>
              <div>
                <div style={styles.sectionDividerLeft} />
                <h2 style={{ ...styles.sectionTitle, textAlign: 'left', marginBottom: 16 }}>
                  À propos de CardioWave
                </h2>
              </div>

              <p style={styles.aboutText}>
                CardioWave est une plateforme de cardiologie alimentée par l'intelligence artificielle, conçue pour améliorer l'analyse ECG et le suivi des patients. Elle combine précision médicale et innovation technologique pour transformer le diagnostic cardiaque.
              </p>

              <p style={styles.aboutText}>
                Développée dans le cadre d'un projet de recherche en médecine et IA, CardioWave s'appuie sur des algorithmes de deep learning entraînés sur de larges bases de données cliniques validées.
              </p>

              <div style={styles.missionBox}>
                <div>
                  <div style={styles.missionLabel}>Notre mission</div>
                  <p style={styles.missionText}>
                    Rendre le diagnostic cardiaque plus rapide, plus accessible et plus fiable pour chaque patient, partout dans le monde.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {['IA médicale', 'Recherche clinique', 'Open innovation', 'Précision 98%'].map((tag, i) => (
                  <span key={i} className="tag-pill">{tag}</span>
                ))}
              </div>
            </div>

            <div className="reveal reveal-delay-2" style={styles.aboutVisual}>
              <div style={styles.aboutCard}>
                <div style={styles.aboutCardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                    <span style={{ fontSize: '.8rem', fontWeight: 800, color: '#4F46E5' }}>Analyse en cours</span>
                  </div>
                  <span style={{ fontSize: '.75rem', color: '#A5A9C7' }}>Patient #3821</span>
                </div>

                <svg viewBox="0 0 320 80" style={{ width: '100%', margin: '16px 0' }}>
                  <polyline
                    points="0,40 30,40 42,12 52,68 62,12 74,68 86,40 120,40 132,12 142,68 152,12 164,68 176,40 210,40 222,12 232,68 242,12 254,68 266,40 320,40"
                    fill="none"
                    stroke="#4F46E5"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>

                <div style={styles.aboutCardStats}>
                  {[
                    ['BPM', '72'],
                    ['QRS', '98ms'],
                    ['QTc', '420ms'],
                    ['RR', '830ms'],
                  ].map(([l, v]) => (
                    <div key={l} style={styles.aboutStat}>
                      <span style={styles.aboutStatVal}>{v}</span>
                      <span style={styles.aboutStatLabel}>{l}</span>
                    </div>
                  ))}
                </div>

                <div style={styles.aiTag}>
                  <span style={{ fontSize: '1rem' }}>🤖</span>
                  <span style={{ fontSize: '.8rem', fontWeight: 700, color: '#15803d' }}>
                    Rythme sinusal normal — Aucune anomalie détectée
                  </span>
                </div>
              </div>

              <div style={{ ...styles.floatBadge, top: 0, right: -16 }}>
                <span>98%</span>
                <span style={{ fontSize: '.72rem', color: '#7C82B4' }}>Précision IA</span>
              </div>

              <div style={{ ...styles.floatBadge, bottom: 24, left: -20 }}>
                <span>24/7</span>
                <span style={{ fontSize: '.72rem', color: '#7C82B4' }}>Monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      

      <footer style={styles.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ ...styles.footerText, fontSize: '1.2rem', fontWeight: 900, color: '#101653' }}>Cardio<span style={{ color: '#4F46E5' }}>Wave</span></span>
        </div>

        <div style={{ display: 'flex', gap: 28 }}>
          <a href="#solution" style={styles.footerLink}>Fonctionnalités</a>
          <a href="#pourqui" style={styles.footerLink}>Pour qui ?</a>
          <a href="#apropos" style={styles.footerLink}>À propos</a>
          <a href="#contact" style={styles.footerLink}>Contact</a>
        </div>

        <span style={styles.footerText}>© 2026 CardioWave — Tous droits réservés</span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
root: {
  position: 'relative',
  minHeight: '120vh',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: "'DM Sans','Segoe UI',sans-serif",
  background: '#F5F7FF',
},

  bgCanvas: {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    background: 'linear-gradient(135deg,#F5F7FF 0%,#EEF0FF 45%,#E9E4FF 100%)',
    pointerEvents: 'none',
    overflow: 'hidden',
  },

  waveTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 280,
  },

  waveBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: 280,
  },

  blob: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(95px)',
    opacity: 0.34,
  },

  blob1: {
    width: 560,
    height: 560,
    background: '#A5B4FC',
    top: -150,
    left: -130,
  },

  blob2: {
    width: 430,
    height: 430,
    background: '#818CF8',
    top: '28%',
    right: -110,
  },

  blob3: {
    width: 360,
    height: 360,
    background: '#DBEAFE',
    bottom: -100,
    left: '32%',
  },

  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 56px',
    background: 'rgba(255,255,255,0.50)',
    backdropFilter: 'blur(22px)',
    borderBottom: '1px solid rgba(79,70,229,0.12)',
    boxShadow: '0 10px 35px rgba(79,70,229,0.06)',
  },

  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  logoIcon: {
    width: 52,
    height: 52,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    fontSize: '1.6rem',
    fontWeight: 900,
    color: '#101653',
  },

  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 28,
  },

  navLink: {
    textDecoration: 'none',
    color: '#7C82B4',
    fontSize: '0.88rem',
    fontWeight: 700,
  },

  navCta: {
    background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)',
    color: 'white',
    padding: '10px 24px',
    borderRadius: 50,
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontWeight: 800,
    boxShadow: '0 14px 30px rgba(79,70,229,0.24)',
  },

hero: {
  position: 'relative',
  zIndex: 1,
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  alignItems: 'center',
  gap: 48,
  padding: '70px 56px',
  maxWidth: 1280,
  margin: '0 auto',
  width: '100%',
  minHeight: 'calc(100vh - 92px)',
  boxSizing: 'border-box',
},

  heroLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
  },

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(79,70,229,0.08)',
    border: '1px solid rgba(79,70,229,0.18)',
    color: '#4F46E5',
    fontSize: '0.76rem',
    fontWeight: 800,
    padding: '7px 17px',
    borderRadius: 50,
    width: 'fit-content',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  title: {
fontFamily: "'DM Sans', sans-serif", 
    fontWeight: 700,
    lineHeight: 1.18,
    color: '#101653',
  },

  subtitle: {
    fontSize: '1.05rem',
    color: '#7C82B4',
    lineHeight: 1.75,
    maxWidth: 440,
    fontWeight: 500,
  },

  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
  },

  btnPrimary: {
    background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)',
    color: 'white',
    padding: '14px 34px',
    borderRadius: 50,
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 800,
    boxShadow: '0 18px 38px rgba(79,70,229,0.24)',
  },

  btnGhost: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.92rem',
    fontWeight: 700,
    color: '#101653',
  },

  playIcon: {
    width: 42,
    height: 42,
    background: 'rgba(255,255,255,0.88)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 26px rgba(79,70,229,0.13)',
    border: '1px solid rgba(79,70,229,0.14)',
  },

  statsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 32,
    paddingTop: 8,
  },

  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },

  statVal: {
    fontSize: '1.65rem',
    fontWeight: 900,
    color: '#101653',
  },

  statLabel: {
    fontSize: '0.78rem',
    color: '#7C82B4',
  },

  statDivider: {
    width: 1,
    height: 42,
    background: 'rgba(79,70,229,0.16)',
  },

  heroRight: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  heartScene: {
    position: 'relative',
    width: 520,
    height: 440,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  purpleGlowBR: {
    position: 'absolute',
    bottom: -20,
    right: 10,
    width: 260,
    height: 260,
    borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(124,58,237,0.42) 0%,rgba(165,180,252,0.24) 50%,transparent 78%)',
    filter: 'blur(32px)',
    zIndex: 0,
    pointerEvents: 'none',
  },

  videoLabel: {
    position: 'absolute',
    top: 16,
    left: 16,
    background: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(79,70,229,0.16)',
    borderRadius: 50,
    padding: '6px 14px',
    fontSize: '0.76rem',
    fontWeight: 800,
    color: '#4F46E5',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
    boxShadow: '0 8px 24px rgba(79,70,229,0.10)',
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#22c55e',
  },

  ringsWrap: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

ring: {
  position: 'absolute',
  borderRadius: '50%',
  border: '2px solid #4F46E5',
  boxShadow: '0 0 25px rgba(15, 23, 42, 0.6)',
},

  ecgOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    zIndex: 10,
  },

  section: {
    position: 'relative',
    zIndex: 1,
    padding: '96px 56px',
    background: 'rgba(255,255,255,0.72)',
  },

  sectionInner: {
    maxWidth: 1200,
    margin: '0 auto',
    width: '100%',
  },

  sectionTitle: {
    fontSize: '2.4rem',
    fontWeight: 900,
    color: '#101653',
    lineHeight: 1.22,
    marginBottom: 16,
  },

  sectionSubtitle: {
    fontSize: '1.05rem',
    color: '#7C82B4',
    lineHeight: 1.7,
    maxWidth: 560,
    margin: '0 auto',
  },

  sectionDividerLeft: {
    width: 48,
    height: 4,
    borderRadius: 2,
    background: 'linear-gradient(90deg,#4F46E5,#3B82F6)',
    marginBottom: 16,
  },

  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    gap: 24,
  },

  cardTitle: {
    fontSize: '1.05rem',
    fontWeight: 900,
    color: '#111653',
    marginBottom: 10,
  },

  cardDesc: {
    fontSize: '0.9rem',
    color: '#7C82B4',
    lineHeight: 1.65,
  },

  whoGrid: {
    display: 'flex',
    gap: 28,
    justifyContent: 'center',
  },

  whoIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  whoLabel: {
    fontSize: '1.3rem',
    fontWeight: 900,
    marginBottom: 12,
  },

  whoDesc: {
    fontSize: '0.93rem',
    color: '#7C82B4',
    lineHeight: 1.7,
  },

  aboutGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 80,
    alignItems: 'center',
  },

  aboutText: {
    fontSize: '1rem',
    color: '#59617F',
    lineHeight: 1.78,
  },

  missionBox: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
    background: 'rgba(79,70,229,0.07)',
    border: '1px solid rgba(79,70,229,0.14)',
    borderRadius: 18,
    padding: '20px 22px',
  },

  missionLabel: {
    fontSize: '0.78rem',
    fontWeight: 900,
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 6,
  },

  missionText: {
    fontSize: '0.93rem',
    color: '#59617F',
    lineHeight: 1.65,
  },

  aboutVisual: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  aboutCard: {
    background: 'rgba(255,255,255,0.78)',
    backdropFilter: 'blur(20px)',
    borderRadius: 28,
    padding: '28px 28px 20px',
    border: '1.5px solid rgba(79,70,229,0.14)',
    boxShadow: '0 28px 70px rgba(79,70,229,0.13)',
    width: '100%',
    maxWidth: 460,
  },

  aboutCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  aboutCardStats: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 0 8px',
  },

  aboutStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },

  aboutStatVal: {
    fontSize: '1.3rem',
    fontWeight: 900,
    color: '#101653',
  },

  aboutStatLabel: {
    fontSize: '0.72rem',
    color: '#7C82B4',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },

  aiTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    background: 'rgba(34,197,94,0.08)',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: 50,
    padding: '8px 14px',
  },

  floatBadge: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    background: 'rgba(255,255,255,0.86)',
    backdropFilter: 'blur(16px)',
    borderRadius: 16,
    padding: '10px 16px',
    boxShadow: '0 14px 32px rgba(79,70,229,0.14)',
    border: '1px solid rgba(79,70,229,0.12)',
    fontSize: '1.2rem',
    fontWeight: 900,
    color: '#101653',
  },

  contactWrap: {
    display: 'flex',
    justifyContent: 'center',
  },

  contactForm: {
    width: '100%',
    maxWidth: 680,
    background: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(20px)',
    borderRadius: 30,
    padding: '48px 48px 40px',
    border: '1.5px solid rgba(79,70,229,0.14)',
    boxShadow: '0 24px 70px rgba(79,70,229,0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },

  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 18,
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  label: {
    fontSize: '0.83rem',
    fontWeight: 800,
    color: '#111653',
    letterSpacing: '0.2px',
  },

  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)',
    color: 'white',
    border: 'none',
    padding: '15px 36px',
    borderRadius: 50,
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 800,
    alignSelf: 'center',
    boxShadow: '0 18px 38px rgba(79,70,229,0.24)',
    marginTop: 4,
  },

  contactEmail: {
    textAlign: 'center',
    fontSize: '0.87rem',
    color: '#7C82B4',
    marginTop: 4,
  },

  footer: {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(18px)',
    borderTop: '1px solid rgba(79,70,229,0.12)',
    padding: '22px 56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  footerText: {
    fontSize: '0.83rem',
    color: '#7C82B4',
  },

  footerLink: {
    textDecoration: 'none',
    color: '#7C82B4',
    fontSize: '0.83rem',
    fontWeight: 700,
  },
};