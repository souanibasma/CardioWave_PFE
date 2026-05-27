import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import {
  getDoctorProfile,
  updateDoctorProfile,
  changeDoctorPassword,
} from '../../services/api';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Save,
  Check,
  Mail,
  Phone,
  Building2,
  Stethoscope,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PRIMARY = '#4f46e5';
const PRIMARY_LIGHT = '#eef2ff';
const TEXT = '#1e293b';
const MUTED = '#64748b';
const SUCCESS = '#10b981';
const DANGER = '#e11d48';

function SaveButton({
  onClick,
  saved,
  disabled = false,
}: {
  onClick: () => void;
  saved: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 42,
        padding: '0 22px',
        borderRadius: 16,
        border: 'none',
        background: saved ? SUCCESS : PRIMARY,
        color: 'white',
        fontSize: 13,
        fontWeight: 950,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        boxShadow: disabled ? 'none' : '0 14px 30px rgba(79,70,229,0.22)',
      }}
    >
      {saved ? <Check size={15} /> : <Save size={15} />}
      {saved ? 'Enregistré' : 'Enregistrer'}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontSize: 12,
        fontWeight: 900,
        color: MUTED,
        display: 'block',
        marginBottom: 7,
      }}
    >
      {children}
    </label>
  );
}

function InputWithIcon({
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  rightSlot,
}: {
  icon?: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div style={{ position: 'relative' }}>
      {icon && (
        <span
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: PRIMARY,
            display: 'flex',
          }}
        >
          {icon}
        </span>
      )}

      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          height: 46,
          borderRadius: 16,
          fontSize: 14,
          fontWeight: 700,
          paddingLeft: icon ? 42 : 14,
          paddingRight: rightSlot ? 42 : 14,
          border: '1px solid #e0e7ff',
          background: '#f5f3ff',
          color: TEXT,
          outline: 'none',
        }}
      />

      {rightSlot && (
        <span
          style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
          }}
        >
          {rightSlot}
        </span>
      )}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 26,
        overflow: 'hidden',
        border: '1px solid #e0e7ff',
        boxShadow: '0 18px 45px rgba(79,70,229,0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          background: '#f8faff',
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 18,
            background: PRIMARY_LIGHT,
            color: PRIMARY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div>
          <p style={{ margin: 0, color: TEXT, fontSize: 17, fontWeight: 950 }}>
            {title}
          </p>
          <p style={{ margin: '5px 0 0', color: MUTED, fontSize: 13, fontWeight: 650 }}>
            {description}
          </p>
        </div>
      </div>

      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

export default function Parametres() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profilError, setProfilError] = useState('');
  const [profilSuccess, setProfilSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [specialite, setSpecialite] = useState('');
  const [etablissement, setEtablissement] = useState('');
  const [savedProfil, setSavedProfil] = useState(false);

  const [pwdActuel, setPwdActuel] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [savedPwd, setSavedPwd] = useState(false);

  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setProfilError('');

        const data = await getDoctorProfile();

        const fullName = data.fullName || '';
        const parts = fullName.trim().split(' ');

        setPrenom(parts[0] || '');
        setNom(parts.slice(1).join(' ') || '');
        setEmail(data.email || '');
        setTelephone(data.phone || '');
        setSpecialite(data.specialty || '');
        setEtablissement(data.hospitalOrClinic || '');
      } catch (error: any) {
        setProfilError(error?.response?.data?.message || 'Erreur lors du chargement du profil');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveProfil = async () => {
    try {
      setProfilError('');
      setProfilSuccess('');

      const fullName = `${prenom} ${nom}`.trim();

      const res = await updateDoctorProfile({
        fullName,
        email,
        phone: telephone,
        specialty: specialite,
        hospitalOrClinic: etablissement,
      });

      setSavedProfil(true);
      setProfilSuccess(res.message || 'Profil mis à jour avec succès');

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        localStorage.setItem(
          'user',
          JSON.stringify({
            ...parsedUser,
            fullName,
            email,
            phone: telephone,
            specialty: specialite,
            hospitalOrClinic: etablissement,
          })
        );
      }

      setTimeout(() => setSavedProfil(false), 2500);
    } catch (error: any) {
      setProfilError(error?.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    }
  };

  const handleSavePwd = async () => {
    try {
      setPwdError('');
      setPwdSuccess('');

      if (pwdNew !== pwdConfirm) {
        setPwdError('Les mots de passe ne correspondent pas');
        return;
      }

      const res = await changeDoctorPassword({
        currentPassword: pwdActuel,
        newPassword: pwdNew,
      });

      setSavedPwd(true);
      setPwdSuccess(res.message || 'Mot de passe modifié avec succès');

      setPwdActuel('');
      setPwdNew('');
      setPwdConfirm('');

      setTimeout(() => setSavedPwd(false), 2500);
    } catch (error: any) {
      setPwdError(error?.response?.data?.message || 'Erreur lors du changement du mot de passe');
    }
  };

  const pwdStrength =
    pwdNew.length === 0
      ? 0
      : pwdNew.length < 5
      ? 1
      : pwdNew.length < 8
      ? 2
      : pwdNew.length < 12
      ? 3
      : 4;

  const pwdStrengthLabel = ['', 'Trop court', 'Faible', 'Moyen', 'Fort'];
  const pwdStrengthColor = ['', DANGER, '#B77900', PRIMARY, SUCCESS];

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const weekStart = getStartOfWeek(currentWeekDate);

  const weekDays = Array.from({ length: 7 }).map((_, index) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + index);
    return d;
  });

  const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

  // Exemple temporaire : jours avec ECG.
  // Plus tard, tu peux remplacer cette liste par les dates récupérées depuis ton API.
  const ecgDateKeys = [
    formatDateKey(new Date()),
    formatDateKey(new Date(new Date().setDate(new Date().getDate() - 2))),
    formatDateKey(new Date(new Date().setDate(new Date().getDate() + 1))),
  ];

  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : '';
  const selectedHasECG = selectedDate ? ecgDateKeys.includes(selectedDateKey) : false;

  const goPrevWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() - 7);
    setCurrentWeekDate(d);
    setSelectedDate(d);
  };

  const goNextWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() + 7);
    setCurrentWeekDate(d);
    setSelectedDate(d);
  };

  const monthLabel = currentWeekDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div
          style={{
            minHeight: '100vh',
            padding: 32,
            background: '#f8fafc',
            color: TEXT,
          }}
        >
          Chargement du profil...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div
        style={{
          minHeight: '100vh',
          padding: 24,
          background: '#f8fafc',
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: TEXT,
        }}
      >
        <div
          style={{
            width: '100%',
          }}
        >
          {/* TOP GRID */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 330px',
              gap: 24,
              marginBottom: 24,
            }}
          >
            {/* PROFILE CARD */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 26,
                padding: 22,
                minHeight: 174,
                boxShadow: '0 18px 45px rgba(79,70,229,0.08)',
                border: '1px solid #e0e7ff',
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 30,
                  fontWeight: 950,
                  flexShrink: 0,
                }}
              >
                {(prenom[0] ?? 'D').toUpperCase()}
                {(nom[0] ?? 'R').toUpperCase()}
              </div>

              <div style={{ flex: 1 }}>
                <h2
                  style={{
                    margin: 0,
                    color: TEXT,
                    fontSize: 22,
                    fontWeight: 950,
                  }}
                >
                  Dr. {prenom} {nom}
                </h2>

                <div
                  style={{
                    display: 'grid',
                    gap: 6,
                    marginTop: 12,
                    color: '#555B75',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: MUTED }}>E-mail :</strong> {email || 'Non renseigné'}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: MUTED }}>Téléphone :</strong>{' '}
                    {telephone || 'Non renseigné'}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: MUTED }}>Spécialité :</strong>{' '}
                    {specialite || 'Non renseignée'}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: MUTED }}>Établissement :</strong>{' '}
                    {etablissement || 'Non renseigné'}
                  </p>
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  width: 48,
                  height: 48,
                  borderRadius: 18,
                  background: PRIMARY_LIGHT,
                  color: PRIMARY,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 24px rgba(79,70,229,0.12)',
                }}
              >
                <User size={22} />
              </div>
            </div>

            {/* REAL COMPACT CALENDAR */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 26,
                padding: 18,
                minHeight: 174,
                boxShadow: '0 18px 45px rgba(79,70,229,0.08)',
                border: '1px solid #e0e7ff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      color: TEXT,
                      fontSize: 17,
                      fontWeight: 950,
                    }}
                  >
                    Activité ECG
                  </h3>
                  <p
                    style={{
                      margin: '4px 0 0',
                      color: MUTED,
                      fontSize: 12,
                      fontWeight: 650,
                      textTransform: 'capitalize',
                    }}
                  >
                    {monthLabel}
                  </p>
                </div>

                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 16,
                    background: PRIMARY_LIGHT,
                    color: PRIMARY,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Calendar size={20} />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <button
                  onClick={goPrevWeek}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 11,
                    border: 'none',
                    background: '#eef2ff',
                    color: PRIMARY,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                <span
                  style={{
                    color: '#555B75',
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  Semaine affichée
                </span>

                <button
                  onClick={goNextWeek}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 11,
                    border: 'none',
                    background: '#eef2ff',
                    color: PRIMARY,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 6,
                }}
              >
                {weekDays.map((date) => {
                  const key = formatDateKey(date);
                  const hasECG = ecgDateKeys.includes(key);
                  const isSelected = selectedDateKey === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(date)}
                      style={{
                        height: 46,
                        borderRadius: 14,
                        border: isSelected ? `2px solid ${PRIMARY}` : '1px solid #e0e7ff',
                        background: hasECG ? PRIMARY : '#eef2ff',
                        color: hasECG ? 'white' : '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        boxShadow: hasECG ? '0 8px 18px rgba(79,70,229,0.22)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 800 }}>
                        {date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 950 }}>{date.getDate()}</span>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: 12,
                  background: '#eef2ff',
                  borderRadius: 16,
                  padding: '10px 12px',
                  color: PRIMARY,
                  fontSize: 12,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  {selectedDate
                    ? selectedDate.toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                      })
                    : 'Aucun jour'}
                </span>
                <span>{selectedHasECG ? 'ECG reçu' : 'Aucun ECG'}</span>
              </div>
            </div>
          </div>

          {/* FORMS GRID - FULL WIDTH */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
              width: '100%',
            }}
          >
            <SectionCard
              icon={<User size={20} />}
              title="Informations du profil"
              description="Modifiez vos informations personnelles et professionnelles"
            >
              {profilError && (
                <p style={{ color: DANGER, fontWeight: 800, marginBottom: 16 }}>{profilError}</p>
              )}

              {profilSuccess && (
                <p style={{ color: SUCCESS, fontWeight: 800, marginBottom: 16 }}>
                  {profilSuccess}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <FieldLabel>Prénom</FieldLabel>
                  <InputWithIcon value={prenom} onChange={setPrenom} />
                </div>

                <div>
                  <FieldLabel>Nom</FieldLabel>
                  <InputWithIcon value={nom} onChange={setNom} />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <FieldLabel>Adresse e-mail</FieldLabel>
                <InputWithIcon
                  icon={<Mail size={15} />}
                  type="email"
                  value={email}
                  onChange={setEmail}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginTop: 16,
                }}
              >
                <div>
                  <FieldLabel>Téléphone</FieldLabel>
                  <InputWithIcon
                    icon={<Phone size={15} />}
                    value={telephone}
                    onChange={setTelephone}
                    placeholder="+216 00 000 000"
                  />
                </div>

                <div>
                  <FieldLabel>Spécialité</FieldLabel>
                  <InputWithIcon
                    icon={<Stethoscope size={15} />}
                    value={specialite}
                    onChange={setSpecialite}
                    placeholder="Ex : Cardiologie"
                  />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <FieldLabel>Établissement</FieldLabel>
                <InputWithIcon
                  icon={<Building2 size={15} />}
                  value={etablissement}
                  onChange={setEtablissement}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  paddingTop: 20,
                  marginTop: 20,
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <SaveButton onClick={handleSaveProfil} saved={savedProfil} />
              </div>
            </SectionCard>

            <SectionCard
              icon={<Lock size={20} />}
              title="Mot de passe"
              description="Changez votre mot de passe de connexion"
            >
              {pwdError && (
                <p style={{ color: DANGER, fontWeight: 800, marginBottom: 16 }}>{pwdError}</p>
              )}

              {pwdSuccess && (
                <p style={{ color: SUCCESS, fontWeight: 800, marginBottom: 16 }}>{pwdSuccess}</p>
              )}

              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <FieldLabel>Mot de passe actuel</FieldLabel>
                  <InputWithIcon
                    type={showPwd ? 'text' : 'password'}
                    value={pwdActuel}
                    onChange={setPwdActuel}
                    placeholder="••••••••••"
                    rightSlot={
                      <button
                        onClick={() => setShowPwd((v) => !v)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: MUTED,
                          padding: 0,
                          display: 'flex',
                        }}
                      >
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    }
                  />
                </div>

                <div>
                  <FieldLabel>Nouveau mot de passe</FieldLabel>
                  <InputWithIcon
                    type={showNewPwd ? 'text' : 'password'}
                    value={pwdNew}
                    onChange={setPwdNew}
                    placeholder="••••••••••"
                    rightSlot={
                      <button
                        onClick={() => setShowNewPwd((v) => !v)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: MUTED,
                          padding: 0,
                          display: 'flex',
                        }}
                      >
                        {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    }
                  />

                  {pwdNew.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                        {[1, 2, 3, 4].map((lvl) => (
                          <div
                            key={lvl}
                            style={{
                              flex: 1,
                              height: 4,
                              borderRadius: 999,
                              background:
                                pwdStrength >= lvl
                                  ? pwdStrengthColor[pwdStrength]
                                  : '#e0e7ff',
                            }}
                          />
                        ))}
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: pwdStrengthColor[pwdStrength],
                          fontWeight: 800,
                        }}
                      >
                        {pwdStrengthLabel[pwdStrength]}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <FieldLabel>Confirmer le mot de passe</FieldLabel>
                  <InputWithIcon
                    type="password"
                    value={pwdConfirm}
                    onChange={setPwdConfirm}
                    placeholder="••••••••••"
                  />

                  {pwdConfirm.length > 0 && pwdConfirm !== pwdNew && (
                    <p style={{ fontSize: 12, color: DANGER, marginTop: 7, fontWeight: 800 }}>
                      Les mots de passe ne correspondent pas
                    </p>
                  )}

                  {pwdConfirm.length > 0 && pwdConfirm === pwdNew && pwdNew.length > 0 && (
                    <p
                      style={{
                        fontSize: 12,
                        color: SUCCESS,
                        marginTop: 7,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Check size={13} />
                      Les mots de passe correspondent
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingTop: 20,
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <SaveButton
                    onClick={handleSavePwd}
                    saved={savedPwd}
                    disabled={!pwdActuel || !pwdNew || pwdNew !== pwdConfirm}
                  />
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}