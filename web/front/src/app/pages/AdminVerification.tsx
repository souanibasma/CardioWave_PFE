import { useEffect, useState } from "react";
import { DashboardLayout } from "../components/DashboardLayout";
import { getDoctors, approveDoctor, rejectDoctor } from "../../services/api";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

  @keyframes fadeup { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes pulse-badge { 0%,100%{opacity:1} 50%{opacity:0.6} }

  .vrf-fade   { animation: fadeup 0.45s ease both; }
  .vrf-fade-1 { animation-delay: 0.04s; }
  .vrf-fade-2 { animation-delay: 0.10s; }

  .vrf-spinner {
    width: 20px; height: 20px; border-radius: 50%;
    border: 2.5px solid #E2E8F0; border-top-color: #3B82F6;
    animation: spin 0.8s linear infinite; display: inline-block;
  }

  .vrf-card {
    background: #fff; border-radius: 16px; padding: 0;
    box-shadow: 0 1px 8px rgba(0,0,0,0.06);
    overflow: hidden;
    transition: box-shadow 0.2s, transform 0.15s;
    border: 1.5px solid #F1F5F9;
  }
  .vrf-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.10); transform: translateY(-2px); }

  .vrf-approve {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 18px; background: #10B981; color: #fff;
    border: none; border-radius: 30px; font-size: 0.82rem; font-weight: 700;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: background 0.15s, transform 0.1s;
  }
  .vrf-approve:hover { background: #059669; transform: translateY(-1px); }

  .vrf-reject {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 18px; background: #FEF2F2; color: #DC2626;
    border: 1.5px solid #FECACA; border-radius: 30px; font-size: 0.82rem; font-weight: 700;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
  }
  .vrf-reject:hover { background: #FEE2E2; }

  .vrf-tab {
    padding: 9px 20px; border-radius: 30px; border: none;
    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
  }
  .vrf-tab.active { background: #1E293B; color: #fff; }
  .vrf-tab:not(.active) { background: #F1F5F9; color: #64748B; }
  .vrf-tab:not(.active):hover { background: #E2E8F0; }

  .vrf-modal-overlay {
    position: fixed; inset: 0; background: rgba(15,23,42,0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; padding: 1rem;
  }
  .vrf-modal {
    background: #fff; border-radius: 20px; padding: 2rem;
    max-width: 520px; width: 100%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: fadeup 0.3s ease both;
  }

  .vrf-license-input {
    width: 100%; padding: 11px 14px;
    border: 1.5px solid #E2E8F0; border-radius: 10px;
    font-size: 0.9rem; font-family: 'DM Sans', sans-serif; color: #1E293B;
    background: #F8FAFC; outline: none; box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s;
    letter-spacing: 0.05em;
  }
  .vrf-license-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); background: #fff; }

  .vrf-verify-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 22px; background: linear-gradient(135deg, #1E293B, #334155);
    color: #fff; border: none; border-radius: 30px;
    font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700;
    cursor: pointer; transition: transform 0.1s, box-shadow 0.15s;
    box-shadow: 0 4px 12px rgba(15,23,42,0.2);
  }
  .vrf-verify-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(15,23,42,0.25); }

  .vrf-info-row {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 0.85rem;
  }
  .vrf-info-row:last-child { border-bottom: none; }

  .pulse-badge { animation: pulse-badge 2s ease-in-out infinite; }
`;

interface Doctor {
  _id: string;
  fullName: string;
  specialty: string;
  email: string;
  hospitalOrClinic?: string;
  licenseNumber?: string;
  isApproved?: boolean;
  createdAt?: string;
  phone?: string;
}

interface ModalState {
  doctor: Doctor;
  licenseInput: string;
  verifyResult: 'idle' | 'valid' | 'invalid';
  verifying: boolean;
}

export default function AdminVerification() {
  const [tab, setTab]     = useState<'en_attente' | 'verifie'>('en_attente');
  const [list, setList]   = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const data = await getDoctors(tab);
      setList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoctors(); }, [tab]);

  const showToast = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 2500);
  };

  const action = async (id: string, statut: 'verifie' | 'refuse') => {
    try {
      if (statut === 'verifie') await approveDoctor(id);
      else await rejectDoctor(id);
      showToast(statut === 'verifie' ? 'Médecin approuvé ✓' : 'Demande refusée');
      setModal(null);
      fetchDoctors();
    } catch (err) {
      showToast('Une erreur est survenue.', true);
    }
  };

  // Simule une vérification du numéro de licence (à remplacer par API réelle)
  const verifyLicense = async () => {
    if (!modal) return;
    setModal(m => m ? { ...m, verifying: true, verifyResult: 'idle' } : null);
    await new Promise(r => setTimeout(r, 1200)); // simulate API call
    const isValid = modal.licenseInput.trim().length >= 6;
    setModal(m => m ? { ...m, verifying: false, verifyResult: isValid ? 'valid' : 'invalid' } : null);
  };

  const openModal = (doctor: Doctor) => {
    setModal({ doctor, licenseInput: doctor.licenseNumber ?? '', verifyResult: 'idle', verifying: false });
  };

  const initiales = (name: string) =>
    name.split(' ').slice(1).map(n => n[0]).join('').slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <DashboardLayout>
      <style>{CSS}</style>

      <div style={{ padding: 24 }}>

        {/* Header */}
        <div className="vrf-fade vrf-fade-1" style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>
            Vérification des médecins
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '0.88rem' }}>
            Validez les demandes d'inscription et vérifiez les numéros de licence
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            background: toast.err ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${toast.err ? '#FECACA' : '#86EFAC'}`,
            borderRadius: '10px', padding: '10px 16px', marginBottom: '1.25rem',
            color: toast.err ? '#DC2626' : '#166534',
            fontSize: '0.85rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            {toast.err
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#DC2626" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="13" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            }
            {toast.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="vrf-fade vrf-fade-1" style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          {([['en_attente', 'En attente'], ['verifie', 'Vérifiés']] as const).map(([key, label]) => (
            <button key={key} className={`vrf-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
              {label}
              <span style={{
                marginLeft: '8px', padding: '1px 7px', borderRadius: '20px', fontSize: '0.72rem',
                background: tab === key ? 'rgba(255,255,255,0.2)' : '#E2E8F0',
                color: tab === key ? '#fff' : '#64748B', fontWeight: 700,
              }}>
                {list.length}
              </span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '2rem', color: '#64748B', fontSize: '0.88rem' }}>
            <span className="vrf-spinner" />
            Chargement des médecins...
          </div>
        )}

        {/* Empty */}
        {!loading && list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8', background: '#fff', borderRadius: '16px', fontSize: '0.9rem', border: '1.5px dashed #E2E8F0' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Aucun médecin dans cette catégorie.
          </div>
        )}

        {/* Cards */}
        {!loading && (
          <div className="vrf-fade vrf-fade-2" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {list.map((m) => (
              <div key={m._id} className="vrf-card">

                {/* Card top stripe */}
                <div style={{ height: '4px', background: tab === 'verifie' ? 'linear-gradient(90deg, #10B981, #34D399)' : 'linear-gradient(90deg, #3B82F6, #60A5FA)' }} />

                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>

                  {/* Avatar */}
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: '1rem',
                    fontFamily: "'Outfit', sans-serif",
                    boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                  }}>
                    {initiales(m.fullName)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.97rem', color: '#1E293B', marginBottom: '2px' }}>{m.fullName}</div>
                    <div style={{ color: '#64748B', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>
                        {m.specialty || '—'}
                      </span>
                      {m.hospitalOrClinic && <span style={{ color: '#94A3B8' }}>· {m.hospitalOrClinic}</span>}
                    </div>
                    <div style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      <span>{m.email}</span>
                      {m.phone && <span>{m.phone}</span>}
                      {m.createdAt && <span>Inscrit le {formatDate(m.createdAt)}</span>}
                    </div>
                  </div>

                  {/* Licence badge */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                    borderRadius: '12px', padding: '10px 16px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      N° Licence
                    </div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: m.licenseNumber ? '#1E293B' : '#CBD5E1', letterSpacing: '0.08em' }}>
                      {m.licenseNumber || 'Non fourni'}
                    </div>
                  </div>

                  {/* Status badge */}
                  {tab === 'verifie' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '30px', padding: '6px 14px' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>Approuvé</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => openModal(m)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '9px 16px', background: '#F8FAFC',
                        border: '1.5px solid #E2E8F0', borderRadius: '30px',
                        fontSize: '0.82rem', fontWeight: 700, color: '#334155',
                        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        transition: 'background 0.15s',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                      </svg>
                      Vérifier
                    </button>

                    {tab === 'en_attente' && (
                      <>
                        <button className="vrf-approve" onClick={() => action(m._id, 'verifie')}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Approuver
                        </button>
                        <button className="vrf-reject" onClick={() => action(m._id, 'refuse')}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"/></svg>
                          Refuser
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal vérification ── */}
      {modal && (
        <div className="vrf-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="vrf-modal">

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                  Fiche de vérification
                </h2>
                <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: '0.82rem' }}>{modal.doctor.fullName}</p>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1.2rem', lineHeight: 1, padding: '2px' }}>✕</button>
            </div>

            {/* Infos médecin */}
            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Nom complet',    value: modal.doctor.fullName,                icon: '👤' },
                { label: 'Spécialité',     value: modal.doctor.specialty || '—',        icon: '🩺' },
                { label: 'Email',          value: modal.doctor.email,                   icon: '📧' },
                { label: 'Établissement',  value: modal.doctor.hospitalOrClinic || '—', icon: '🏥' },
                { label: 'Téléphone',      value: modal.doctor.phone || '—',            icon: '📞' },
                { label: 'Date inscription', value: modal.doctor.createdAt ? new Date(modal.doctor.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—', icon: '📅' },
              ].map((row, i) => (
                <div key={i} className="vrf-info-row">
                  <span style={{ fontSize: '0.88rem' }}>{row.icon}</span>
                  <span style={{ color: '#64748B', fontSize: '0.8rem', minWidth: '110px', flexShrink: 0 }}>{row.label}</span>
                  <span style={{ color: '#1E293B', fontSize: '0.85rem', fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Vérification numéro de licence */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Vérifier le numéro de licence médicale
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="vrf-license-input"
                  placeholder="Ex: TN-CARD-2024-0042"
                  value={modal.licenseInput}
                  onChange={e => setModal(m => m ? { ...m, licenseInput: e.target.value, verifyResult: 'idle' } : null)}
                />
                <button className="vrf-verify-btn" onClick={verifyLicense} disabled={modal.verifying || !modal.licenseInput.trim()}>
                  {modal.verifying
                    ? <span className="vrf-spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                  }
                  {modal.verifying ? 'Vérification...' : 'Vérifier'}
                </button>
              </div>

              {/* Result */}
              {modal.verifyResult === 'valid' && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '10px', padding: '10px 14px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="#166534" strokeWidth="2" strokeLinecap="round"/></svg>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#166534' }}>Numéro valide ✓</div>
                    <div style={{ fontSize: '0.78rem', color: '#4ADE80' }}>Ce médecin est enregistré auprès de l'Ordre des médecins.</div>
                  </div>
                </div>
              )}
              {modal.verifyResult === 'invalid' && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#DC2626" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="13" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill="#DC2626"/></svg>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#DC2626' }}>Numéro invalide ou introuvable</div>
                    <div style={{ fontSize: '0.78rem', color: '#F87171' }}>Ce numéro ne correspond à aucun médecin enregistré.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal actions */}
            {tab === 'en_attente' && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
                <button onClick={() => setModal(null)} style={{ padding: '10px 20px', background: 'none', border: '1.5px solid #E2E8F0', borderRadius: '30px', color: '#64748B', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  Fermer
                </button>
                <button className="vrf-reject" onClick={() => action(modal.doctor._id, 'refuse')}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  Refuser
                </button>
                <button className="vrf-approve" onClick={() => action(modal.doctor._id, 'verifie')}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Approuver
                </button>
              </div>
            )}
            {tab === 'verifie' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
                <button onClick={() => setModal(null)} style={{ padding: '10px 24px', background: '#1E293B', border: 'none', borderRadius: '30px', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}