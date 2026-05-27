import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Heart } from 'lucide-react';
import {
  getDoctorDashboardOverview,
  getDoctorRecentECGs,
  getDoctorDistributionChart,
} from '../../services/api';

const PRIMARY_COLOR = '#4f46e5';
const PRIMARY_LIGHT = '#eef2ff';

const CHART_COLORS = [
  '#4f46e5',
  '#f43f5e',
  '#f59e0b',
  '#14b8a6',
  '#6366f1',
];

type Overview = {
  receivedToday: number;
  pendingAnalyses: number;
};

type RecentECG = {
  id: string;
  patient: string;
  age: number | null;
  date: string;
  statut: string;
  type: string;
  urgent: boolean;
};

type DistributionChart = {
  labels: string[];
  values: number[];
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<
    string,
    {
      label: string;
      background: string;
      color: string;
    }
  > = {
    Normal: {
      label: 'Analysé',
      background: '#E9F9F2',
      color: '#0F8A5F',
    },

    Anormal: {
      label: 'Analysé',
      background: '#E9F9F2',
      color: '#0F8A5F',
    },

    'En attente': {
      label: 'En attente',
      background: '#FFF7E6',
      color: '#B77900',
    },
  };

  const s = styles[status] || {
    label: status,
    background: '#F4F6FB',
    color: '#667085',
  };

  return (
    <span
      style={{
        background: s.background,
        color: s.color,
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 0.3,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label.toUpperCase()}
    </span>
  );
}

function MiniCard({
  title,
  value,
  color,
  bg,
}: {
  title: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        background: bg,
        padding: '14px 16px',
        minHeight: 78,
      }}
    >
      <p
        style={{
          margin: 0,
          color: '#767A90',
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {title}
      </p>

      <p
        style={{
          margin: '8px 0 0',
          color,
          fontSize: 26,
          fontWeight: 950,
          letterSpacing: -1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function KpiCircle({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: '50%',
          background: `conic-gradient(${color} 0deg 260deg, rgba(255,255,255,0.18) 260deg 360deg)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 0 0 7px rgba(255,255,255,0.07)',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: '#2920A7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 950,
            fontSize: 14,
          }}
        >
          {value}
        </div>
      </div>

      <p
        style={{
          margin: 0,
          color: 'rgba(255,255,255,0.86)',
          fontSize: 11,
          fontWeight: 800,
          textAlign: 'center',
        }}
      >
        {label}
      </p>
    </div>
  );
}

function DiagnosticsPieChart({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const cleanValues = values.map((v) => Number(v) || 0);

  const sum = cleanValues.reduce((a, b) => a + b, 0);

  let cumulative = 0;

  const getCoordinates = (percent: number) => {
    const angle = percent * 360 - 90;

    const radians = (Math.PI * angle) / 180;

    return {
      x: 160 + 125 * Math.cos(radians),
      y: 160 + 125 * Math.sin(radians),
    };
  };

  const createPath = (value: number) => {
    if (sum === 0) return '';

    const startPercent = cumulative / sum;

    const endPercent = (cumulative + value) / sum;

    const start = getCoordinates(startPercent);

    const end = getCoordinates(endPercent);

    const largeArcFlag =
      endPercent - startPercent > 0.5 ? 1 : 0;

    cumulative += value;

    return `
      M 160 160
      L ${start.x} ${start.y}
      A 125 125 0 ${largeArcFlag} 1 ${end.x} ${end.y}
      Z
    `;
  };

  if (sum === 0) {
    return (
      <div
        style={{
          width: 320,
          height: 260,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8A8EA6',
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        Aucune donnée disponible.
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: 320,
        height: 320,
        margin: '0 auto',
      }}
    >
      <svg width="320" height="320" viewBox="0 0 320 320">
        {cleanValues.map((value, index) => (
          <path
            key={index}
            d={createPath(value)}
            fill={
              CHART_COLORS[index % CHART_COLORS.length]
            }
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              cursor: 'pointer',
              transition:
                'transform 0.2s ease, opacity 0.2s ease',
              transform:
                hoveredIndex === index
                  ? 'scale(1.04)'
                  : 'scale(1)',
              transformOrigin: '160px 160px',
              opacity:
                hoveredIndex === null ||
                hoveredIndex === index
                  ? 1
                  : 0.48,
            }}
          />
        ))}

        <circle cx="160" cy="160" r="95" fill="white" />
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <img
          src="/coeur.png"
          alt="Coeur"
          style={{
            width: 100,
            height: 100,
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  );
}

export default function TableauDeBord() {
  const { user } = useAuth();

  const [overview, setOverview] =
    useState<Overview>({
      receivedToday: 0,
      pendingAnalyses: 0,
    });

  const [ecgRecents, setEcgRecents] = useState<
    RecentECG[]
  >([]);

  const [distributionChart, setDistributionChart] =
    useState<DistributionChart>({
      labels: [],
      values: [],
    });

  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchDashboardData = async (silent = false) => {
      try {
        if (!silent) setLoading(true);

        const [
          overviewRes,
          recentRes,
          distributionRes,
        ] = await Promise.all([
          getDoctorDashboardOverview(),
          getDoctorRecentECGs(),
          getDoctorDistributionChart(),
        ]);

        setOverview(overviewRes);
        setEcgRecents(recentRes);
        setDistributionChart(distributionRes);
      } catch (error) {
        console.error(
          'Erreur chargement dashboard médecin :',
          error
        );
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchDashboardData();

    // Auto-refresh every 30s to keep statuses live
    const interval = setInterval(() => fetchDashboardData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toLocaleDateString(
    'fr-FR',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  const filteredEcgs = ecgRecents.filter((ecg) =>
    ecg.patient
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const urgentCount = ecgRecents.filter(
    (ecg) => ecg.urgent
  ).length;

  return (
    <DashboardLayout>
      <div
        style={{
          minHeight: '100vh',
          padding: 24,
          background: '#f8fafc',
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: '#1e293b',
        }}
      >
        <style>{`
          @media (max-width: 1000px) {
            .main-zone {
              grid-template-columns: 1fr !important;
            }

            .diagnostic-chart-zone {
              grid-template-columns: 1fr !important;
            }

            .hero-illustration {
              width: 180px !important;
              right: 0px !important;
              bottom: -5px !important;
              opacity: 0.18 !important;
            }
          }

          .ecg-line:hover {
            background: #F7F7FF;
            transform: translateY(-1px);
          }
        `}</style>

        <div
          style={{
            width: '100%',
            padding: '18px 22px',
            background: 'transparent',
          }}
        >
          <div
            className="main-zone"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 0.8fr',
              gap: 24,
            }}
          >
            {/* LEFT */}
            <section>
              <div
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 45%, #3730a3 100%)',
                  borderRadius: 30,
                  padding: '30px 34px',
                  marginBottom: 24,
                  minHeight: 150,
                  boxShadow: '0 28px 80px rgba(79,70,229,0.22)',
                }}
              >
                {/* BG EFFECT */}
                <div
                  style={{
                    position: 'absolute',
                    top: -120,
                    right: -80,
                    width: 320,
                    height: 320,
                    background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 72%)',
                  }}
                />

                {/* ILLUSTRATION */}
                <img
                  src="/pageTableaudebord.png"
                  alt="Dashboard Illustration"
                  className="hero-illustration"
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: -35,
                    width: 380,
                    objectFit: 'contain',
                    zIndex: 1,
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.18))',
                  }}
                />

                {/* TEXT */}
                <div style={{ position: 'relative', zIndex: 3, maxWidth: 520 }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 32,
                      fontWeight: 950,
                      letterSpacing: -0.4,
                      color: 'white',
                    }}
                  >
                    CardioWave
                  </h1>
                  <h2
                    style={{
                      margin: '4px 0 0',
                      fontSize: 20,
                      fontWeight: 800,
                      color: 'white',
                    }}
                  >
                    Bonjour Dr. {user?.prenom}
                  </h2>

                  <p
                    style={{
                      margin: '12px 0 0',
                      maxWidth: 450,
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: 13,
                      lineHeight: 1.7,
                      fontWeight: 600,
                    }}
                  >
                    Suivez les ECG reçus, les analyses en attente et la répartition des diagnostics depuis votre espace médecin.
                  </p>
                </div>
              </div>

              {/* DIAGNOSTIC */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 24,
                  padding: 24,
                  boxShadow:
                    '0 16px 42px rgba(34, 28, 112, 0.07)',
                  marginBottom: 22,
                  minHeight: 472,
                }}
              >
                <div
                  className="diagnostic-chart-zone"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 240px',
                    gap: 20,
                    alignItems: 'start',
                  }}
                >
                  {/* Left Column: Title + Subtitle + Pie Chart */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ marginTop: 24 }}>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 17,
                          fontWeight: 950,
                          color: '#1e293b',
                        }}
                      >
                        Répartition des diagnostics
                      </h2>

                      <p
                        style={{
                          margin: '5px 0 0',
                          color: '#8A8EA6',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Synthèse des résultats ECG
                      </p>
                    </div>

                    <DiagnosticsPieChart
                      labels={distributionChart.labels}
                      values={distributionChart.values}
                    />
                  </div>

                  {/* Right Column: Legend items starting at the same top level */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                      paddingTop: 6,
                    }}
                  >
                    {distributionChart.labels.map(
                      (label, index) => (
                        <div
                          key={label}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 5,
                              background:
                                CHART_COLORS[
                                  index %
                                    CHART_COLORS.length
                                ],
                            }}
                          />

                          <div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 13,
                                fontWeight: 850,
                                color: '#555B75',
                              }}
                            >
                              {label}
                            </p>

                            <p
                              style={{
                                margin: '2px 0 0',
                                fontSize: 11,
                                fontWeight: 800,
                                color: '#A0A3B8',
                              }}
                            >
                              {
                                distributionChart
                                  .values[index]
                              }
                              %
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT */}
            <aside>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                  gap: 16,
                }}
              >
                {/* SEARCH */}
                <div
                  style={{
                    flex: 1,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(79, 70, 229, 0.1)',
                    borderRadius: 16,
                    padding: '0 16px',
                    boxShadow: '0 8px 30px rgba(34, 28, 112, 0.04)',
                  }}
                >

                  <input
                    type="text"
                    placeholder="Recherche..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      width: '100%',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#11142D',
                    }}
                  />
                </div>

                {/* DATE */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    padding: '0 16px',
                    height: 48,
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 8px 32px rgba(34, 28, 112, 0.04)',
                    whiteSpace: 'nowrap',
                  }}
                >

                  <span style={{ fontSize: 12, fontWeight: 800, color: '#555B75', textTransform: 'capitalize' }}>
                    {new Date().toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* ECG RECENTS */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 24,
                  padding: 22,
                  boxShadow:
                    '0 16px 42px rgba(34, 28, 112, 0.07)',
                  marginBottom: 20,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 950,
                  }}
                >
                  ECG récents
                </h2>

                <p
                  style={{
                    margin: '6px 0 18px',
                    color: '#8A8EA6',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Derniers dossiers reçus
                </p>

                <div
                  style={{
                    display: 'grid',
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  {filteredEcgs
                    .slice(0, 2)
                    .map((ecg) => (
                      <Link
                        key={ecg.id}
                        to={`/ecg-analysis/${ecg.id}`}
                        style={{
                          textDecoration: 'none',
                        }}
                      >
                        <div
                          className="ecg-line"
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              '42px 1fr auto',
                            gap: 12,
                            alignItems: 'center',
                            borderRadius: 18,
                            padding: 12,
                            transition:
                              '0.18s ease',
                          }}
                        >
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 15,
                              background:
                                ecg.urgent
                                  ? '#fff1f2'
                                  : '#eef2ff',
                              color: ecg.urgent
                                ? '#e11d48'
                                : '#4f46e5',
                              display: 'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                            }}
                          >
                            <Heart size={18} fill={ecg.urgent ? '#e11d48' : '#4f46e5'} />
                          </div>

                          <div>
                            <p
                              style={{
                                margin: 0,
                                color: '#11142D',
                                fontSize: 13,
                                fontWeight: 950,
                              }}
                            >
                              {ecg.patient}
                            </p>

                            <p
                              style={{
                                margin:
                                  '4px 0 0',
                                color: '#8A8EA6',
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {ecg.age ?? '--'} ans
                              · {ecg.date}
                            </p>
                          </div>

                          <StatusBadge
                            status={ecg.statut}
                          />
                        </div>
                      </Link>
                    ))}
                </div>

                <Link
                  to="/ecg-recus"
                  style={{
                    textDecoration: 'none',
                  }}
                >
                  <button
                    style={{
                      width: '100%',
                      height: 48,
                      border: 'none',
                      borderRadius: 18,
                      background: '#4f46e5',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 950,
                      cursor: 'pointer',
                      boxShadow:
                        '0 10px 20px rgba(79,70,229,0.2)',
                    }}
                  >
                    Voir tout
                  </button>
                </Link>
              </div>

              {/* MINI CARDS */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(3, 1fr)',
                  gap: 10,
                }}
              >
                <MiniCard
                  title="Reçus"
                  value={overview.receivedToday}
                  color="#4f46e5"
                  bg="#eef2ff"
                />

                <MiniCard
                  title="Attente"
                  value={overview.pendingAnalyses}
                  color="#10b981"
                  bg="#ecfdf5"
                />

                <MiniCard
                  title="Urgents"
                  value={urgentCount}
                  color="#e11d48"
                  bg="#fff1f2"
                />
              </div>

              {/* KPI */}
              <div
                style={{
                  background:
                    'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                  borderRadius: 22,
                  padding: 20,
                  color: 'white',
                  boxShadow:
                    '0 15px 35px rgba(79,70,229,0.25)',
                  marginTop: 18,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-around',
                    gap: 8,
                  }}
                >
                  <KpiCircle
                    value="98%"
                    label="Fiabilité IA"
                    color="#F43F5E"
                  />

                  <KpiCircle
                    value="24"
                    label="Patients suivis"
                    color="#6D5DF6"
                  />

                  <KpiCircle
                    value="247"
                    label="Analyses validées"
                    color="#14B8A6"
                  />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}