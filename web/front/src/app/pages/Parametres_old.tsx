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
} from 'lucide-react';

// ── SaveButton ───────────────────────────────────────────────────────────────
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
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: '9px 20px',
        borderRadius: '10px',
        border: 'none',
        background: saved ? '#0F6E56' : '#534AB7',
        color: 'white',
        fontSize: '13px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !saved) e.currentTarget.style.background = '#3D35A0';
      }}
      onMouseLeave={(e) => {
        if (!disabled && !saved) e.currentTarget.style.background = '#534AB7';
      }}
    >
      {saved ? (
        <>
          <Check style={{ width: '14px', height: '14px' }} />
          Enregistré
        </>
      ) : (
        <>
          <Save style={{ width: '14px', height: '14px' }} />
          Enregistrer
        </>
      )}
    </button>
  );
}

// ── FieldLabel ───────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        display: 'block',
        marginBottom: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {children}
    </label>
  );
}

// ── InputWithIcon ────────────────────────────────────────────────────────────
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
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
            display: 'flex',
            pointerEvents: 'none',
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
          borderRadius: '10px',
          fontSize: '14px',
          height: '40px',
          paddingLeft: icon ? '36px' : '12px',
          paddingRight: rightSlot ? '42px' : '12px',
          border: '1.5px solid #C7D2FE',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#534AB7')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#C7D2FE')}
      />
      {rightSlot && (
        <span
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          {rightSlot}
        </span>
      )}
    </div>
  );
}

// ── SectionCard ──────────────────────────────────────────────────────────────
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
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        background: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--background)',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: '#EEF2FF',
            border: '1px solid #C7D2FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#534AB7',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <p
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '2px',
            }}
          >
            {title}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '24px' }}>{children}</div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Parametres() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profilError, setProfilError] = useState('');
  const [profilSuccess, setProfilSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Profil
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [specialite, setSpecialite] = useState('');
  const [etablissement, setEtablissement] = useState('');
  const [savedProfil, setSavedProfil]     = useState(false);

  // Sécurité
  const [pwdActuel, setPwdActuel]         = useState('');
  const [pwdNew, setPwdNew]               = useState('');
  const [pwdConfirm, setPwdConfirm]       = useState('');
  const [showPwd, setShowPwd]             = useState(false);
  const [showNewPwd, setShowNewPwd]       = useState(false);
  const [savedPwd, setSavedPwd]           = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setProfilError('');

        const data = await getDoctorProfile();

        const fullName = data.fullName || '';
        const parts = fullName.trim().split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';

        setPrenom(firstName);
        setNom(lastName);
        setEmail(data.email || '');
        setTelephone(data.phone || '');
        setSpecialite(data.specialty || '');
        setEtablissement(data.hospitalOrClinic || '');
      } catch (error: any) {
        setProfilError(
          error?.response?.data?.message || 'Erreur lors du chargement du profil'
        );
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
        const updatedUser = {
          ...parsedUser,
          fullName,
          email,
          phone: telephone,
          specialty: specialite,
          hospitalOrClinic: etablissement,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setTimeout(() => setSavedProfil(false), 2500);
    } catch (error: any) {
      setProfilError(
        error?.response?.data?.message ||
          'Erreur lors de la mise à jour du profil'
      );
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
      setPwdError(
        error?.response?.data?.message ||
          'Erreur lors du changement du mot de passe'
      );
    }
  };

  const pwdStrength =
    pwdNew.length === 0 ? 0
    : pwdNew.length < 5 ? 1
    : pwdNew.length < 8 ? 2
    : pwdNew.length < 12 ? 3
    : 4;
  const pwdStrengthLabel = ['', 'Trop court', 'Faible', 'Moyen', 'Fort'];
  const pwdStrengthColor = ['', '#E24B4A', '#EF9F27', '#534AB7', '#0F6E56'];

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ padding: '2rem' }}>Chargement du profil...</div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <div style={{ padding: '2rem 2rem 3rem', background: 'var(--background)', minHeight: '100vh' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <h1
            style={{
              fontFamily: 'var(--font-family-heading)',
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '4px',
            }}
          >
            Paramètres
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Gérez votre profil et la sécurité de votre compte
          </p>
        </div>

        {/* ── Cards stacked ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ══ PROFIL ══ */}
          <SectionCard
            icon={<User style={{ width: '17px', height: '17px' }} />}
            title="Profil médecin"
            description="Vos informations personnelles et professionnelles"
          >
            {/* Avatar row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'var(--background)',
                border: '1px solid var(--border-color)',
                marginBottom: '22px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #534AB7 0%, #7C73D6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'white',
                  flexShrink: 0,
                  userSelect: 'none',
                }}
              >
                {(prenom[0] ?? 'D').toUpperCase()}
                {(nom[0] ?? 'r').toUpperCase()}
              </div>
              <div>
                <p
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '2px',
                  }}
                >
                  Dr. {prenom} {nom}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {specialite} · {etablissement}
                </p>
              </div>
            </div>

            {/* Fields grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              <div>
                <FieldLabel>Prénom</FieldLabel>
                <InputWithIcon value={prenom} onChange={setPrenom} />
              </div>
              <div>
                <FieldLabel>Nom</FieldLabel>
                <InputWithIcon value={nom} onChange={setNom} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <FieldLabel>Adresse e-mail</FieldLabel>
              <InputWithIcon
                icon={<Mail style={{ width: '15px', height: '15px' }} />}
                type="email"
                value={email}
                onChange={setEmail}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              <div>
                <FieldLabel>Téléphone</FieldLabel>
                <InputWithIcon
                  icon={<Phone style={{ width: '15px', height: '15px' }} />}
                  value={telephone}
                  onChange={setTelephone}
                  placeholder="+216 00 000 000"
                />
              </div>
              <div>
                <FieldLabel>Spécialité</FieldLabel>
                <InputWithIcon
                  icon={<Stethoscope style={{ width: '15px', height: '15px' }} />}
                  value={specialite}
                  onChange={setSpecialite}
                  placeholder="Ex : Cardiologie"
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <FieldLabel>Établissement</FieldLabel>
              <InputWithIcon
                icon={<Building2 style={{ width: '15px', height: '15px' }} />}
                value={etablissement}
                onChange={setEtablissement}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                paddingTop: '4px',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <SaveButton onClick={handleSaveProfil} saved={savedProfil} />
            </div>
          </SectionCard>

          {/* ══ SÉCURITÉ ══ */}
          <SectionCard
            icon={<Lock style={{ width: '17px', height: '17px' }} />}
            title="Sécurité"
            description="Changez votre mot de passe"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Mot de passe actuel */}
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
                        color: 'var(--text-secondary)',
                        padding: 0,
                        display: 'flex',
                      }}
                    >
                      {showPwd
                        ? <EyeOff style={{ width: '15px', height: '15px' }} />
                        : <Eye style={{ width: '15px', height: '15px' }} />}
                    </button>
                  }
                />
              </div>

              {/* Nouveau mot de passe */}
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
                        color: 'var(--text-secondary)',
                        padding: 0,
                        display: 'flex',
                      }}
                    >
                      {showNewPwd
                        ? <EyeOff style={{ width: '15px', height: '15px' }} />
                        : <Eye style={{ width: '15px', height: '15px' }} />}
                    </button>
                  }
                />

                {/* Barre de force */}
                {pwdNew.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[1, 2, 3, 4].map((lvl) => (
                        <div
                          key={lvl}
                          style={{
                            flex: 1,
                            height: '3px',
                            borderRadius: '2px',
                            background:
                              pwdStrength >= lvl
                                ? pwdStrengthColor[pwdStrength]
                                : 'var(--border-color)',
                            transition: 'background 0.2s',
                          }}
                        />
                      ))}
                    </div>
                    <p
                      style={{
                        fontSize: '11px',
                        color: pwdStrengthColor[pwdStrength],
                        fontWeight: 500,
                      }}
                    >
                      {pwdStrengthLabel[pwdStrength]}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmer */}
              <div>
                <FieldLabel>Confirmer le mot de passe</FieldLabel>
                <InputWithIcon
                  type="password"
                  value={pwdConfirm}
                  onChange={setPwdConfirm}
                  placeholder="••••••••••"
                />
                {pwdConfirm.length > 0 && pwdConfirm !== pwdNew && (
                  <p style={{ fontSize: '11px', color: '#A32D2D', marginTop: '5px' }}>
                    Les mots de passe ne correspondent pas
                  </p>
                )}
                {pwdConfirm.length > 0 && pwdConfirm === pwdNew && pwdNew.length > 0 && (
                  <p
                    style={{
                      fontSize: '11px',
                      color: '#0F6E56',
                      marginTop: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Check style={{ width: '12px', height: '12px' }} />
                    Les mots de passe correspondent
                  </p>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  paddingTop: '4px',
                  borderTop: '1px solid var(--border-color)',
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
    </DashboardLayout>
  );
}