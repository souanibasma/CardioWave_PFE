import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getPatientProfile,
  updatePatientProfile,
  changePatientPassword,
} from '../../services/api';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  @keyframes fadeup {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-avatar {
    0%,100% { box-shadow: 0 0 0 0 rgba(21,101,192,0.2); }
    50%     { box-shadow: 0 0 0 12px rgba(21,101,192,0); }
  }

  .pf-fade   { animation: fadeup 0.5s ease both; }
  .pf-fade-1 { animation-delay: 0.04s; }
  .pf-fade-2 { animation-delay: 0.10s; }
  .pf-fade-3 { animation-delay: 0.17s; }
  .pf-fade-4 { animation-delay: 0.24s; }
  .pf-fade-5 { animation-delay: 0.31s; }

  .pf-avatar { animation: pulse-avatar 3s ease-in-out infinite; }

  .pf-input {
    width: 100%; padding: 12px 14px;
    border: 1.5px solid #E2EEFF; border-radius: 12px;
    font-size: 0.93rem; font-family: 'DM Sans', sans-serif;
    color: #1A237E; background: #F8FBFF; outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .pf-input:focus {
    border-color: #1565C0;
    box-shadow: 0 0 0 4px rgba(21,101,192,0.09);
    background: #fff;
  }
  .pf-input::placeholder { color: #B0BEC5; }

  .pf-save-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 28px;
    background: linear-gradient(135deg, #0D47A1, #1E88E5);
    color: #fff; border: none; border-radius: 50px;
    font-family: 'DM Sans', sans-serif; font-size: 0.92rem; font-weight: 700;
    cursor: pointer; box-shadow: 0 6px 20px rgba(21,101,192,0.25);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .pf-save-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(21,101,192,0.36); }
  .pf-save-btn:active { transform: scale(0.97); }

  .pf-cancel-btn {
    padding: 12px 22px;
    background: none; color: #90A4AE;
    border: 1.5px solid #E2EEFF; border-radius: 50px;
    font-family: 'DM Sans', sans-serif; font-size: 0.92rem; font-weight: 600;
    cursor: pointer; transition: border-color 0.15s, color 0.15s;
  }
  .pf-cancel-btn:hover { border-color: #1565C0; color: #1565C0; }

  .pf-edit-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 18px;
    background: rgba(255,255,255,0.18); backdrop-filter: blur(8px);
    color: #fff; border: 1.5px solid rgba(255,255,255,0.35); border-radius: 30px;
    font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 600;
    cursor: pointer; transition: background 0.15s;
  }
  .pf-edit-btn:hover { background: rgba(255,255,255,0.28); }

  .pf-label {
    font-size: 0.75rem; font-weight: 700; color: #5C85C5;
    text-transform: uppercase; letter-spacing: 0.05em;
    display: block; margin-bottom: 6px;
  }
  .pf-value {
    font-size: 0.93rem; font-weight: 500; color: #1A237E;
    padding: 12px 14px; background: #F8FBFF;
    border-radius: 12px; border: 1.5px solid #E8F0FE;
  }

  .pf-card {
    background: #fff; border-radius: 20px; padding: 1.75rem 2rem;
    box-shadow: 0 2px 16px rgba(21,101,192,0.07);
  }
  .pf-card-title {
    font-family: 'Outfit', sans-serif; font-size: 1rem; font-weight: 700;
    color: #0D47A1; margin: 0 0 1.5rem;
    display: flex; align-items: center; gap: 10px;
    padding-bottom: 1rem; border-bottom: 1.5px solid #EEF4FF;
  }
  .pf-card-title-icon {
    width: 34px; height: 34px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .pf-badge-group {
    background: rgba(255,255,255,0.15); backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.25); border-radius: 12px;
    padding: 8px 14px; display: inline-flex; align-items: center; gap: 8px;
  }

  .pf-pwd-input-wrap { position: relative; }
  .pf-pwd-eye {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: #90A4AE;
    display: flex; padding: 4px;
  }

  .pf-strength-bar {
    height: 4px; border-radius: 2px;
    transition: background 0.3s, width 0.3s;
  }

  .pf-toast {
    background: #E8F5E9; border: 1px solid #A5D6A7; border-radius: 12px;
    padding: 12px 18px; margin-bottom: 1.25rem; color: #2E7D32;
    font-size: 0.88rem; font-weight: 600;
    display: flex; align-items: center; gap: 8px;
  }
  .pf-toast-err {
    background: #FEF2F2; border: 1px solid #FFCDD2; color: #C62828;
  }
`;

type ToastState = { msg: string; err?: boolean } | null;

export default function ProfilPatient() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [editingInfo, setEditingInfo] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    dateNaissance: ''
  });

  const [pwd, setPwd] = useState({
    actuel: '',
    nouveau: '',
    confirmer: '',
  });

  const [showPwd, setShowPwd] = useState({
    actuel: false,
    nouveau: false,
    confirmer: false,
  });

  const initiales = `${form.prenom?.[0] ?? ''}${form.nom?.[0] ?? ''}`;

  const showToast = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        const data = await getPatientProfile();
        const fullName = data.fullName || '';
        const parts = fullName.trim().split(' ');

        setForm({
          prenom: parts[0] || '',
          nom: parts.slice(1).join(' ') || '',
          email: data.email || '',
          telephone: data.phone || '',
          dateNaissance: data.dateOfBirth
            ? new Date(data.dateOfBirth).toISOString().split('T')[0]
            : ''
        });
      } catch (error: any) {
        showToast(
          error?.response?.data?.message ||
            'Erreur lors du chargement du profil patient',
          true
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveInfo = async () => {
    try {
      const fullName = `${form.prenom} ${form.nom}`.trim();

      const res = await updatePatientProfile({
        fullName,
        email: form.email,
        phone: form.telephone,
        dateOfBirth: form.dateNaissance || undefined,
      });

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        localStorage.setItem(
          'user',
          JSON.stringify({
            ...parsedUser,
            fullName,
            email: form.email,
            phone: form.telephone,
          })
        );
      }

      setEditingInfo(false);
      showToast(res.message || 'Informations personnelles mises à jour !');
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          'Erreur lors de la mise à jour du profil',
        true
      );
    }
  };

  const handleSavePwd = async () => {
    if (!pwd.actuel) {
      showToast('Veuillez saisir votre mot de passe actuel.', true);
      return;
    }

    if (pwd.nouveau.length < 6) {
      showToast(
        'Le nouveau mot de passe doit contenir au moins 6 caractères.',
        true
      );
      return;
    }

    if (pwd.nouveau !== pwd.confirmer) {
      showToast('Les mots de passe ne correspondent pas.', true);
      return;
    }

    try {
      const res = await changePatientPassword({
        currentPassword: pwd.actuel,
        newPassword: pwd.nouveau,
      });

      setPwd({ actuel: '', nouveau: '', confirmer: '' });
      showToast(res.message || 'Mot de passe mis à jour avec succès !');
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          'Erreur lors du changement du mot de passe',
        true
      );
    }
  };

  const pwdScore = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) =>
    r.test(pwd.nouveau)
  ).length;

  const pwdColors = ['#EF5350', '#FF7043', '#FFA726', '#66BB6A'];
  const pwdLabels = ['Faible', 'Moyen', 'Fort', 'Très fort'];

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#EEF4FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Chargement du profil...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EEF4FF', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{CSS}</style>

      <nav
        style={{
          background: '#fff',
          borderBottom: '1px solid #E2EEFF',
          padding: '0 2.5rem',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 1px 10px rgba(21,101,192,0.07)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1565C0, #1E88E5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 12h-4l-3 9L9 3l-3 9H2"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: '1.1rem',
              color: '#0D47A1',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            CardioWave
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/patient/dashboard')}
            style={{
              background: 'none',
              border: '1.5px solid #E2EEFF',
              borderRadius: '8px',
              padding: '7px 16px',
              color: '#5C85C5',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Tableau de bord
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/connexion');
            }}
            style={{
              background: 'none',
              border: '1.5px solid #E2EEFF',
              borderRadius: '8px',
              padding: '7px 16px',
              color: '#5C85C5',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Déconnexion
          </button>
        </div>
      </nav>

      <div style={{ padding: '2rem 2.5rem' }}>
        <div
          className="pf-fade pf-fade-1"
          style={{
            background: 'linear-gradient(135deg, #0A2F6E 0%, #1565C0 50%, #1E88E5 100%)',
            borderRadius: '24px',
            padding: '2rem 2.5rem',
            marginBottom: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 28px rgba(13,71,161,0.22)',
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: -30, right: 80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

          <div
            className="pf-avatar"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              flexShrink: 0,
              background: 'rgba(255,255,255,0.2)',
              border: '3px solid rgba(255,255,255,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.7rem',
              fontFamily: "'Outfit', sans-serif",
              zIndex: 1,
              position: 'relative',
            }}
          >
            {initiales || '?'}
          </div>

          <div style={{ flex: 1, zIndex: 1, position: 'relative' }}>
            <h1
              style={{
                margin: 0,
                color: '#fff',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1.7rem',
                fontWeight: 800,
              }}
            >
              {form.prenom} {form.nom}
            </h1>
            <p
              style={{
                margin: '6px 0 14px',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.88rem',
              }}
            >
              {form.email}
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div className="pf-badge-group">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  Patient CardioWave
                </span>
              </div>
            </div>
          </div>
        </div>

        {toast && (
          <div className={`pf-toast${toast.err ? ' pf-toast-err' : ''}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              {toast.err ? (
                <>
                  <circle cx="12" cy="12" r="9" stroke="#C62828" strokeWidth="2" />
                  <line x1="12" y1="7" x2="12" y2="13" stroke="#C62828" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="16" r="1" fill="#C62828" />
                </>
              ) : (
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="#2E7D32"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
            {toast.msg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="pf-fade pf-fade-2 pf-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1.5px solid #EEF4FF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="pf-card-title-icon" style={{ background: '#EEF4FF' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                      stroke="#1565C0"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#0D47A1',
                  }}
                >
                  Informations personnelles
                </span>
              </div>

              {!editingInfo ? (
                <button
                  className="pf-edit-btn"
                  onClick={() => setEditingInfo(true)}
                  style={{
                    background: '#EEF4FF',
                    border: '1.5px solid #DBEAFE',
                    color: '#1565C0',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                      stroke="#1565C0"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Modifier
                </button>
              ) : (
                <span style={{ fontSize: '0.8rem', color: '#1565C0', fontWeight: 600 }}>
                  ✏️ Mode édition
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <F label="Prénom" value={form.prenom} editing={editingInfo} onChange={(v) => setForm((f) => ({ ...f, prenom: v }))} placeholder="Marie" />
              <F label="Nom" value={form.nom} editing={editingInfo} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} placeholder="Dupont" />
              <F label="Email" value={form.email} editing={editingInfo} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="marie@email.com" type="email" />
              <F label="Téléphone" value={form.telephone} editing={editingInfo} onChange={(v) => setForm((f) => ({ ...f, telephone: v }))} placeholder="+216 00 000 000" />
              <F label="Date de naissance" value={form.dateNaissance} editing={editingInfo} onChange={(v) => setForm((f) => ({ ...f, dateNaissance: v }))} type="date" />
            </div>

            {editingInfo && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button className="pf-cancel-btn" onClick={() => setEditingInfo(false)}>
                  Annuler
                </button>
                <button className="pf-save-btn" onClick={handleSaveInfo}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Enregistrer
                </button>
              </div>
            )}
          </div>

          <div className="pf-fade pf-fade-4 pf-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1.5px solid #EEF4FF',
              }}
            >
              <div className="pf-card-title-icon" style={{ background: '#FFF3E0' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="8" width="16" height="13" rx="2" stroke="#E65100" strokeWidth="2" />
                  <path d="M8 8V6a4 4 0 018 0v2" stroke="#E65100" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: '#0D47A1',
                }}
              >
                Changer le mot de passe
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <label className="pf-label">Mot de passe actuel</label>
                <div className="pf-pwd-input-wrap">
                  <input
                    className="pf-input"
                    type={showPwd.actuel ? 'text' : 'password'}
                    value={pwd.actuel}
                    onChange={(e) => setPwd((p) => ({ ...p, actuel: e.target.value }))}
                    placeholder="••••••••"
                    style={{ paddingRight: '42px' }}
                  />
                  <button className="pf-pwd-eye" type="button" onClick={() => setShowPwd((s) => ({ ...s, actuel: !s.actuel }))}>
                    <EyeIcon show={showPwd.actuel} />
                  </button>
                </div>
              </div>

              <div>
                <label className="pf-label">Nouveau mot de passe</label>
                <div className="pf-pwd-input-wrap">
                  <input
                    className="pf-input"
                    type={showPwd.nouveau ? 'text' : 'password'}
                    value={pwd.nouveau}
                    onChange={(e) => setPwd((p) => ({ ...p, nouveau: e.target.value }))}
                    placeholder="••••••••"
                    style={{ paddingRight: '42px' }}
                  />
                  <button className="pf-pwd-eye" type="button" onClick={() => setShowPwd((s) => ({ ...s, nouveau: !s.nouveau }))}>
                    <EyeIcon show={showPwd.nouveau} />
                  </button>
                </div>
                {pwd.nouveau && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="pf-strength-bar"
                          style={{
                            flex: 1,
                            background: i < pwdScore ? pwdColors[pwdScore - 1] : '#E2EEFF',
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.73rem', fontWeight: 700, color: pwdColors[pwdScore - 1] || '#90A4AE' }}>
                      {pwd.nouveau ? pwdLabels[pwdScore - 1] || 'Trop court' : ''}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="pf-label">Confirmer le mot de passe</label>
                <div className="pf-pwd-input-wrap">
                  <input
                    className="pf-input"
                    type={showPwd.confirmer ? 'text' : 'password'}
                    value={pwd.confirmer}
                    onChange={(e) => setPwd((p) => ({ ...p, confirmer: e.target.value }))}
                    placeholder="••••••••"
                    style={{
                      paddingRight: '42px',
                      borderColor:
                        pwd.confirmer && pwd.confirmer !== pwd.nouveau ? '#EF5350' : undefined,
                    }}
                  />
                  <button className="pf-pwd-eye" type="button" onClick={() => setShowPwd((s) => ({ ...s, confirmer: !s.confirmer }))}>
                    <EyeIcon show={showPwd.confirmer} />
                  </button>
                </div>
                {pwd.confirmer && pwd.confirmer !== pwd.nouveau && (
                  <p style={{ fontSize: '0.75rem', color: '#EF5350', margin: '4px 0 0', fontWeight: 600 }}>
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                className="pf-save-btn"
                onClick={handleSavePwd}
                style={{ background: 'linear-gradient(135deg, #BF360C, #E64A19)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="8" width="16" height="13" rx="2" stroke="#fff" strokeWidth="2" />
                  <path d="M8 8V6a4 4 0 018 0v2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Mettre à jour le mot de passe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function F({
  label,
  value,
  editing,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label className="pf-label">{label}</label>
      {editing ? (
        <input
          className="pf-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div className="pf-value" style={{ color: value ? '#0D47A1' : '#B0BEC5' }}>
          {value || '—'}
        </div>
      )}
    </div>
  );
}

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M17.94 10c-.46-2.54-2.88-5-7.94-5S2.52 7.46 2.06 10c.46 2.54 2.88 5 7.94 5s7.48-2.46 7.94-5z" />
      <circle cx="10" cy="10" r="3" />
      <line x1="3" y1="3" x2="17" y2="17" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M17.94 10c-.46-2.54-2.88-5-7.94-5S2.52 7.46 2.06 10c.46 2.54 2.88 5 7.94 5s7.48-2.46 7.94-5z" />
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}