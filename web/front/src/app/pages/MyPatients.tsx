import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { getDoctorMyPatients } from '../../services/api';


import {
  User,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Activity,
  Filter,
  Loader2,
  Download,
  Clock,
} from 'lucide-react';

interface ECGEntry {
  id: string;
  title: string;
  date: string;
  result: string;
  condition: string;
  status: string;
  urgent: boolean;
}

interface Patient {
  _id: string;
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  age: string | number;
  gender: string;
  riskLevel: string;
  ecgsCount: number;
  lastActivity: string;
  ecgs: ECGEntry[];
}

const PRIMARY = '#4f46e5';
const PRIMARY_LIGHT = '#eef2ff';
const TEXT = '#1e293b';
const MUTED = '#64748b';
const SUCCESS = '#10b981';
const WARNING = '#f59e0b';
const DANGER = '#ef4444';

export default function MyPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);

      const data = await getDoctorMyPatients();

      const mapped = (data || []).map((p: any) => ({
        ...p,
        _id: String(p.id || p._id),
      }));

      setPatients(mapped);
    } catch (error) {
      console.error('Erreur patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: any, e: React.MouseEvent) => {
    e.stopPropagation();

    const stringId = String(id);

    setExpandedId(expandedId === stringId ? null : stringId);
  };

  const filteredPatients = patients.filter(
    (p) =>
      (p.fullName || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (p.email || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';

    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getRiskStyles = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'critique':
        return {
          bg: '#fef2f2',
          color: DANGER,
        };

      case 'anormal':
        return {
          bg: '#fffbeb',
          color: WARNING,
        };

      default:
        return {
          bg: '#ecfdf5',
          color: SUCCESS,
        };
    }
  };

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
        {/* MAIN CONTAINER */}
        <div
          style={{
            width: '100%',
            padding: '18px 22px',
            background: 'transparent',
          }}
        >
          {/* HERO */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              background:
                'linear-gradient(135deg, #4f46e5 0%, #4338ca 45%, #3730a3 100%)',
              borderRadius: 30,
              padding: '28px 34px',
              marginBottom: 22,
              boxShadow: '0 28px 80px rgba(79,70,229,0.22)',
            }}
          >
            {/* BG EFFECTS */}
            <div
              style={{
                position: 'absolute',
                top: -120,
                right: -80,
                width: 320,
                height: 320,
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 72%)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                bottom: -80,
                left: -40,
                width: 220,
                height: 220,
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)',
              }}
            />

            <div
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 30,
                flexWrap: 'wrap',
              }}
            >
              {/* LEFT */}
              <div>
                <h1
                  style={{
                    margin: 0,
                    color: 'white',
                    fontSize: 44,
                    fontWeight: 950,
                    lineHeight: 1.05,
                    letterSpacing: '-1.5px',
                  }}
                >
                  Mes Patients
                </h1>

                <p
                  style={{
                    margin: '16px 0 0',
                    maxWidth: 720,
                    color: 'rgba(255,255,255,0.78)',
                    fontSize: 15,
                    lineHeight: 1.8,
                    fontWeight: 500,
                  }}
                >
                  Gérez vos dossiers patients et l'historique des analyses ECG
                  en temps réel.
                </p>
              </div>

              {/* RIGHT ILLUSTRATION */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                  <img
                      src="/pagePatients4.png"
                      alt="ECG Illustration"
                      style={{
                        position: 'absolute',
                        right: 30,
                        top: '-80%',
                        transform: 'translateY(-10  %)',

                        width: 400,
                        height: 'auto',

                        objectFit: 'contain',

                        opacity: 0.95,

                        filter:
                          'drop-shadow(0 25px 45px rgba(0,0,0,0.22))',

                        pointerEvents: 'none',

                        zIndex: 2,
                      }}
                />
              </div>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 62,
                background: '#FFFFFF',
                borderRadius: 22,
                border: '1px solid #eef2f7',
                display: 'flex',
                alignItems: 'center',
                padding: '0 22px',
                gap: 14,
                boxShadow: '0 10px 30px rgba(79,70,229,0.04)',
              }}
            >
              <Search size={20} color={PRIMARY} />

              <input
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                placeholder="Rechercher par nom ou email..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  width: '100%',
                  color: TEXT,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              />
            </div>

            <button
              style={{
                height: 62,
                width: 62,
                borderRadius: 22,
                background: '#FFFFFF',
                border: '1px solid #eef2f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: MUTED,
                boxShadow:
                  '0 10px 30px rgba(79,70,229,0.04)',
              }}
            >
              <Filter size={22} />
            </button>
          </div>

          {/* CONTENT */}
          {loading ? (
            <div
              style={{
                height: 280,
                background: '#FFFFFF',
                borderRadius: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 16,
                color: PRIMARY,
                fontWeight: 900,
                boxShadow:
                  '0 16px 42px rgba(79,70,229,0.07)',
              }}
            >
              <Loader2
                className="animate-spin"
                size={40}
              />

              Chargement des patients...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 28,
                padding: 60,
                textAlign: 'center',
                boxShadow:
                  '0 16px 42px rgba(79,70,229,0.07)',
              }}
            >
              <User
                size={48}
                color="#cbd5e1"
                style={{ margin: '0 auto 14px' }}
              />

              <h2
                style={{
                  margin: 0,
                  color: TEXT,
                  fontSize: 22,
                  fontWeight: 950,
                }}
              >
                Aucun patient trouvé
              </h2>

              <p
                style={{
                  margin: '10px 0 0',
                  color: MUTED,
                  fontWeight: 650,
                }}
              >
                Vérifiez votre recherche ou ajoutez un
                nouveau patient.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: 18,
              }}
            >
              {filteredPatients.map((p) => (
                <div
                  key={p._id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 28,
                    overflow: 'hidden',
                    border:
                      expandedId === p._id
                        ? `2px solid ${PRIMARY}`
                        : '1px solid #eef2f7',
                    boxShadow:
                      expandedId === p._id
                        ? '0 22px 44px rgba(79,70,229,0.12)'
                        : '0 12px 34px rgba(79,70,229,0.06)',
                    transition:
                      'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {/* MAIN ROW */}
                  <div
                    onClick={(e) =>
                      toggleExpand(p._id, e)
                    }
                    style={{
                      padding: '24px 26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 20,
                      cursor: 'pointer',
                    }}
                  >
                    {/* LEFT */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 18,
                        minWidth: 0,
                      }}
                    >
                      {/* AVATAR */}
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 20,
                          background:
                            p.riskLevel === 'Critique'
                              ? '#fef2f2'
                              : PRIMARY_LIGHT,
                          color:
                            p.riskLevel === 'Critique'
                              ? DANGER
                              : PRIMARY,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        {p.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>

                      {/* INFOS */}
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                            marginBottom: 6,
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              fontSize: 18,
                              fontWeight: 900,
                              color: TEXT,
                            }}
                          >
                            {p.fullName}
                          </h3>

                          <span
                            style={{
                              fontSize: 13,
                              color: MUTED,
                              fontWeight: 700,
                            }}
                          >
                            {p.age} ans
                          </span>

                          {p.riskLevel === 'Critique' && (
                            <span
                              style={{
                                background: '#fee2e2',
                                color: DANGER,
                                fontSize: 10,
                                fontWeight: 900,
                                padding: '4px 9px',
                                borderRadius: 999,
                                textTransform:
                                  'uppercase',
                              }}
                            >
                              Critique
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: 18,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 13,
                              color: MUTED,
                              fontWeight: 600,
                            }}
                          >
                            <Mail size={14} />
                            {p.email}
                          </span>

                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 13,
                              color: MUTED,
                              fontWeight: 600,
                            }}
                          >
                            <Phone size={14} />
                            {p.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 28,
                        flexShrink: 0,
                      }}
                    >
                      {/* ECG COUNT */}
                      <div
                        style={{
                          textAlign: 'right',
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: 22,
                            fontWeight: 950,
                            color: TEXT,
                          }}
                        >
                          {p.ecgsCount}
                        </p>

                        <p
                          style={{
                            margin: 0,
                            fontSize: 11,
                            fontWeight: 800,
                            color: MUTED,
                            textTransform: 'uppercase',
                          }}
                        >
                          ECG Total
                        </p>
                      </div>

                      {/* STATUS */}
                      <div
                        style={{
                          textAlign: 'right',
                          minWidth: 120,
                        }}
                      >
                        <span
                          style={{
                            padding: '7px 12px',
                            borderRadius: 999,
                            background:
                              getRiskStyles(
                                p.riskLevel
                              ).bg,
                            color:
                              getRiskStyles(
                                p.riskLevel
                              ).color,
                            fontSize: 11,
                            fontWeight: 900,
                            textTransform:
                              'uppercase',
                          }}
                        >
                          {p.riskLevel}
                        </span>

                        <p
                          style={{
                            margin: '8px 0 0',
                            fontSize: 12,
                            color: MUTED,
                            fontWeight: 700,
                          }}
                        >
                          {formatDate(
                            p.lastActivity
                          )}
                        </p>
                      </div>

                      {/* TOGGLE */}
                      <div
                        style={{
                          color:
                            expandedId === p._id
                              ? PRIMARY
                              : '#cbd5e1',
                          transition: '0.2s',
                        }}
                      >
                        {expandedId === p._id ? (
                          <ChevronUp size={24} />
                        ) : (
                          <ChevronDown size={24} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED */}
                  {expandedId === p._id && (
                    <div
                      style={{
                        padding: '0 26px 26px',
                        background:
                          'linear-gradient(to bottom, #ffffff, #fafbff)',
                      }}
                    >
                      <div
                        style={{
                          height: 1,
                          background: '#f1f5f9',
                          marginBottom: 24,
                        }}
                      />

                      {/* HEADER */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent:
                            'space-between',
                          marginBottom: 18,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <Activity
                            size={20}
                            color={PRIMARY}
                          />

                          <h4
                            style={{
                              margin: 0,
                              fontSize: 14,
                              fontWeight: 900,
                              color: TEXT,
                              textTransform:
                                'uppercase',
                              letterSpacing: 0.5,
                            }}
                          >
                            Historique ECG Récent
                          </h4>
                        </div>

                        <button
                          onClick={() =>
                            navigate(
                              `/dossier-patient/${p._id}`
                            )
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            color: PRIMARY,
                            fontSize: 13,
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          Dossier complet

                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {/* ECG LIST */}
                      <div
                        style={{
                          display: 'grid',
                          gap: 12,
                        }}
                      >
                        {!p.ecgs ||
                        p.ecgs.length === 0 ? (
                          <div
                            style={{
                              padding: 34,
                              textAlign: 'center',
                              color: MUTED,
                              fontSize: 14,
                              fontStyle: 'italic',
                              background: '#f8fafc',
                              borderRadius: 20,
                            }}
                          >
                            Aucun examen ECG enregistré
                            pour ce patient.
                          </div>
                        ) : (
                          p.ecgs
                            .slice(0, 4)
                            .map((ecg) => (
                              <div
                                key={ecg.id}
                                onClick={(e) => {
                                  e.stopPropagation();

                                  navigate(
                                    `/ecg-analysis/${ecg.id}`
                                  );
                                }}
                                style={{
                                  background: '#FFFFFF',
                                  padding:
                                    '16px 18px',
                                  borderRadius: 22,
                                  border:
                                    '1px solid #eef2f7',
                                  display: 'flex',
                                  alignItems:
                                    'center',
                                  justifyContent:
                                    'space-between',
                                  gap: 20,
                                  cursor: 'pointer',
                                  transition:
                                    '0.2s ease',
                                  boxShadow:
                                    '0 6px 18px rgba(0,0,0,0.02)',
                                }}
                                onMouseEnter={(
                                  e
                                ) => {
                                  e.currentTarget.style.borderColor =
                                    PRIMARY;
                                }}
                                onMouseLeave={(
                                  e
                                ) => {
                                  e.currentTarget.style.borderColor =
                                    '#eef2f7';
                                }}
                              >
                                {/* LEFT */}
                                <div
                                  style={{
                                    display:
                                      'flex',
                                    alignItems:
                                      'center',
                                    gap: 14,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 42,
                                      height: 42,
                                      borderRadius: 14,
                                      background:
                                        '#f5f7ff',
                                      display:
                                        'flex',
                                      alignItems:
                                        'center',
                                      justifyContent:
                                        'center',
                                      color: PRIMARY,
                                    }}
                                  >
                                    <Clock
                                      size={18}
                                    />
                                  </div>

                                  <div>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: TEXT,
                                      }}
                                    >
                                      {ecg.title}
                                    </p>

                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: 11,
                                        color: MUTED,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {new Date(
                                        ecg.date
                                      ).toLocaleString(
                                        'fr-FR'
                                      )}
                                    </p>
                                  </div>
                                </div>

                                {/* RIGHT */}
                                <div
                                  style={{
                                    display:
                                      'flex',
                                    alignItems:
                                      'center',
                                    gap: 18,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 900,
                                      padding:
                                        '5px 10px',
                                      borderRadius: 999,
                                      background:
                                        ecg.result
                                          ?.toLowerCase()
                                          .includes(
                                            'normal'
                                          ) &&
                                        !ecg.result
                                          ?.toLowerCase()
                                          .includes(
                                            'anormal'
                                          )
                                          ? '#ecfdf5'
                                          : '#fef2f2',
                                      color:
                                        ecg.result
                                          ?.toLowerCase()
                                          .includes(
                                            'normal'
                                          ) &&
                                        !ecg.result
                                          ?.toLowerCase()
                                          .includes(
                                            'anormal'
                                          )
                                          ? SUCCESS
                                          : DANGER,
                                      textTransform:
                                        'uppercase',
                                    }}
                                  >
                                    {ecg.result}
                                  </span>

                                  <div
                                    style={{
                                      display:
                                        'flex',
                                      gap: 8,
                                    }}
                                  >
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/ecg-analysis/${ecg.id}`
                                        )
                                      }
                                      style={{
                                        padding:
                                          '10px 16px',
                                        borderRadius: 14,
                                        background:
                                          '#FFFFFF',
                                        border:
                                          '1px solid #e2e8f0',
                                        color: TEXT,
                                        fontSize: 12,
                                        fontWeight: 800,
                                        cursor:
                                          'pointer',
                                      }}
                                    >
                                      Analyser
                                    </button>

                                    <button
                                      style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 14,
                                        background:
                                          '#f8fafc',
                                        border:
                                          'none',
                                        color:
                                          MUTED,
                                        display:
                                          'flex',
                                        alignItems:
                                          'center',
                                        justifyContent:
                                          'center',
                                        cursor:
                                          'pointer',
                                      }}
                                    >
                                      <Download
                                        size={16}
                                      />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}