import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import {
  getDoctorDashboardOverview,
  getDoctorRecentECGs,
  getDoctorDistributionChart,
} from '../../services/api';

const CHART_COLORS = ['#2920A7', '#F43F5E', '#F59E0B', '#14B8A6', '#6D5DF6'];

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
  const styles: Record<string, { background: string; color: string }> = {
    Normal: { background: '#E9F9F2', color: '#0F8A5F' },
    Anormal: { background: '#FFF0F3', color: '#D3214C' },
    'En attente': { background: '#FFF7E6', color: '#B77900' },
  };

  const s = styles[status] || { background: '#F4F6FB', color: '#667085' };

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
      {status.toUpperCase()}
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
      <p style={{ margin: 0, color: '#767A90', fontSize: 12, fontWeight: 800 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
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

    const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;

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
    <div style={{ position: 'relative', width: 320, height: 320, margin: '0 auto' }}>
      <svg width="320" height="320" viewBox="0 0 320 320">
        {cleanValues.map((value, index) => (
          <path
            key={index}
            d={createPath(value)}
            fill={CHART_COLORS[index % CHART_COLORS.length]}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              cursor: 'pointer',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              transform: hoveredIndex === index ? 'scale(1.04)' : 'scale(1)',
              transformOrigin: '160px 160px',
              opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.48,
            }}
          />
        ))}

        <circle cx="160" cy="160" r="78" fill="white" />
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <p style={{ margin: 0, fontSize: 30, fontWeight: 950, color: '#11142D' }}>
          {sum}%
        </p>

        <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 800, color: '#8A8EA6' }}>
          TOTAL
        </p>
      </div>

      {hoveredIndex !== null && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#11142D',
            color: 'white',
            padding: '10px 14px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 800,
            boxShadow: '0 12px 30px rgba(17,20,45,0.22)',
            whiteSpace: 'nowrap',
            zIndex: 5,
          }}
        >
          {labels[hoveredIndex]} : {cleanValues[hoveredIndex]}%
        </div>
      )}
    </div>
  );
}

export default function TableauDeBord() {
  const { user } = useAuth();

  const [overview, setOverview] = useState<Overview>({
    receivedToday: 0,
    pendingAnalyses: 0,
  });

  const [ecgRecents, setEcgRecents] = useState<RecentECG[]>([]);
  const [distributionChart, setDistributionChart] = useState<DistributionChart>({
    labels: [],
    values: [],
  });

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const [overviewRes, recentRes, distributionRes] = await Promise.all([
          getDoctorDashboardOverview(),
          getDoctorRecentECGs(),
          getDoctorDistributionChart(),
        ]);

        setOverview(overviewRes);
        setEcgRecents(recentRes);
        setDistributionChart(distributionRes);
      } catch (error) {
        console.error('Erreur chargement dashboard médecin :', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const filteredEcgs = ecgRecents.filter((ecg) =>
    ecg.patient.toLowerCase().includes(query.toLowerCase())
  );

  const urgentCount = ecgRecents.filter((ecg) => ecg.urgent).length;

  return (
    <DashboardLayout>
      <div
        style={{
          minHeight: '100vh',
          padding: 32,
          background:
            'radial-gradient(circle at top left, #F2F1FF 0, #ECEBFF 34%, #F8F9FF 68%, #FFFFFF 100%)',
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: '#11142D',
        }}
      >
        <style>{`
          @media (max-width: 1000px) {
            .main-zone { grid-template-columns: 1fr !important; }
            .cards-zone { grid-template-columns: 1fr !important; }
            .topbar-zone { flex-direction: column !important; align-items: stretch !important; }
            .diagnostic-chart-zone { grid-template-columns: 1fr !important; }
          }

          .ecg-line:hover {
            background: #F7F7FF;
            transform: translateY(-1px);
          }
        `}</style>

        <div
          style={{
            maxWidth: 1220,
            margin: '0 auto',
            background: 'rgba(255,255,255,0.92)',
            borderRadius: 34,
            boxShadow: '0 40px 110px rgba(41,32,167,0.16)',
            overflow: 'hidden',
            padding: 28,
          }}
        >
          <div
            className="topbar-zone"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 18,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                height: 52,
                minWidth: 250,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: '#F6F5FF',
                borderRadius: 20,
                color: '#11142D',
                fontSize: 13,
                fontWeight: 850,
                textTransform: 'capitalize',
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#2920A7',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                ◷
              </span>
              {today}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,#2920A7,#6D5DF6)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                Dr
              </div>

              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 950 }}>
                  Dr. {user?.prenom || ''}
                </p>

                <p
                  style={{
                    margin: '3px 0 0',
                    color: '#8A8EA6',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Médecin cardiologue
                </p>
              </div>

              {loading && (
                <span style={{ color: '#2920A7', fontSize: 12, fontWeight: 900 }}>
                  Chargement...
                </span>
              )}
            </div>
          </div>

          <div
            className="main-zone"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.45fr 0.75fr',
              gap: 24,
            
            }}
          >
            <section>
              <div
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#2920A7',
                  borderRadius: 24,
                  padding: '28px 30px',
                  color: 'white',
                  marginBottom: 22,
                  minHeight: 132,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    right: 24,
                    top: 18,
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.13)',
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    right: 82,
                    top: 42,
                    fontSize: 64,
                    transform: 'rotate(-10deg)',
                  }}
                >
                  🫀
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 950,
                      letterSpacing: -0.4,
                    }}
                  >
                    Bonjour Dr. {user?.prenom} 👋
                  </h1>

                  <p
                    style={{
                      margin: '12px 0 0',
                      maxWidth: 450,
                      color: 'rgba(255,255,255,0.78)',
                      fontSize: 13,
                      lineHeight: 1.7,
                      fontWeight: 600,
                    }}
                  >
                    Suivez les ECG reçus, les analyses en attente et la répartition des diagnostics depuis votre espace médecin.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 24,
                  padding: 24,
                  boxShadow: '0 16px 42px rgba(34, 28, 112, 0.07)',
                  marginBottom: 22,
                  minHeight: 472,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 950 }}>
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

                  <div
                    style={{
                      background: '#F3F1FF',
                      color: '#2920A7',
                      padding: '8px 14px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    IA
                  </div>
                </div>

                <div
                  className="diagnostic-chart-zone"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 240px',
                    gap: 20,
                    alignItems: 'center',
                  }}
                >
                  <DiagnosticsPieChart
                    labels={distributionChart.labels}
                    values={distributionChart.values}
                  />

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    {distributionChart.labels.length === 0 ? (
                      <p
                        style={{
                          margin: 0,
                          color: '#8A8EA6',
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        Aucune donnée disponible.
                      </p>
                    ) : (
                      distributionChart.labels.map((label, index) => (
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
                              background: CHART_COLORS[index % CHART_COLORS.length],
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
                              {distributionChart.values[index] ?? 0}%
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              
            </section>
<aside>
  <div
    style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: '#F6F5FF',
      borderRadius: 20,
      padding: '0 18px',
      marginBottom: 18,
    }}
  >
    <span style={{ color: '#2920A7', fontSize: 18 }}>⌕</span>

    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Rechercher un patient..."
      style={{
        border: 'none',
        outline: 'none',
        background: 'transparent',
        width: '100%',
        color: '#555B75',
        fontSize: 13,
        fontWeight: 700,
      }}
    />
  </div>

  <div
    style={{
      background: '#FFFFFF',
      borderRadius: 24,
      padding: 22,
      boxShadow: '0 16px 42px rgba(34, 28, 112, 0.07)',
      marginBottom: 20,
    }}
  >
    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 950 }}>
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

    <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
      {filteredEcgs.length === 0 ? (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            color: '#8A8EA6',
            fontSize: 13,
            fontWeight: 700,
            background: '#FAFAFF',
            borderRadius: 18,
          }}
        >
          Aucun ECG récent.
        </div>
      ) : (
        filteredEcgs.map((ecg) => (
          <Link
            key={ecg.id}
            to={`/ecg-analysis/${ecg.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              className="ecg-line"
              style={{
                display: 'grid',
                gridTemplateColumns: '42px 1fr auto',
                gap: 12,
                alignItems: 'center',
                borderRadius: 18,
                padding: 12,
                transition: '0.18s ease',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 15,
                  background: ecg.urgent ? '#FFF0F3' : '#F2F1FF',
                  color: ecg.urgent ? '#D3214C' : '#2920A7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                〽
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
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

                  {ecg.urgent && (
                    <span
                      style={{
                        color: '#D3214C',
                        fontSize: 10,
                        fontWeight: 950,
                      }}
                    >
                      URGENT
                    </span>
                  )}
                </div>

                <p
                  style={{
                    margin: '4px 0 0',
                    color: '#8A8EA6',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {ecg.age ?? '--'} ans · {ecg.date}
                </p>
              </div>

              <StatusBadge status={ecg.statut} />
            </div>
          </Link>
        ))
      )}
    </div>

    <Link to="/ecg-recus" style={{ textDecoration: 'none' }}>
      <button
        style={{
          width: '100%',
          height: 48,
          border: 'none',
          borderRadius: 18,
          background: '#2920A7',
          color: 'white',
          fontSize: 13,
          fontWeight: 950,
          cursor: 'pointer',
          boxShadow: '0 14px 30px rgba(41,32,167,0.22)',
          marginBottom: 18,
        }}
      >
        Voir tout
      </button>
    </Link>

   
  </div>
  <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
      }}
    >
      <MiniCard
        title="ECG aujourd’hui"
        value={overview.receivedToday}
        color="#2920A7"
        bg="#F2F1FF"
      />

      <MiniCard
        title="En attente"
        value={overview.pendingAnalyses}
        color="#0F8A5F"
        bg="#E9F9F2"
      />

      <MiniCard
        title="Urgents"
        value={urgentCount}
        color="#D3214C"
        bg="#FFF0F3"
      />
    </div>
   <div
      style={{
        background: '#2920A7',
        borderRadius: 22,
        padding: 16,
        color: 'white',
        boxShadow: '0 18px 42px rgba(41,32,167,0.20)',
        marginBottom: 14,
        marginTop:10,
      }}
    >
      
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          gap: 8,
        }}
      >
        <KpiCircle value="98%" label="Fiabilité IA" color="#F43F5E" />
        <KpiCircle value="24" label="Patients suivis" color="#6D5DF6" />
        <KpiCircle value="247" label="Analyses validées" color="#14B8A6" />
      </div>
    </div>

    
</aside>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}