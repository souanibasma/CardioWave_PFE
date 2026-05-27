import { useEffect, useMemo, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";
import {
  getPatientProfile,
  getPatientECGs,
  getPatientECGStats,
} from "../../services/api";

type PatientProfile = {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: "male" | "female";
  assignedDoctor?: {
    _id: string;
    fullName: string;
    email: string;
    specialty?: string;
    hospitalOrClinic?: string;
  } | null;
};

type ECGItem = {
  _id: string;
  title: string;
  urgency: "normale" | "urgente";
  status: "En attente" | "Analysé";
  notes?: string;
  fileUrl: string;
  createdAt: string;
  doctor?: {
    _id: string;
    fullName: string;
    specialty?: string;
  } | null;
};

type ECGStats = {
  total: number;
  analysed: number;
  pending: number;
  urgent: number;
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  @keyframes fadeup {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ecg-line {
    from { stroke-dashoffset: 400; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes pulse-dot {
    0%,100% { opacity: 1; transform: scale(1); }
    50%     { opacity: 0.6; transform: scale(1.4); }
  }

  .cw-fade   { animation: fadeup 0.5s ease both; }
  .cw-fade-1 { animation-delay: 0.05s; }
  .cw-fade-2 { animation-delay: 0.13s; }
  .cw-fade-3 { animation-delay: 0.21s; }

  .ecg-path {
    stroke-dasharray: 400;
    stroke-dashoffset: 400;
    animation: ecg-line 2s ease forwards;
    animation-delay: 0.4s;
  }
  .live-dot { animation: pulse-dot 1.8s ease-in-out infinite; }

  .send-btn {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 14px 32px;
    background: #fff;
    color: #0D47A1; border: none; border-radius: 50px;
    font-family: 'DM Sans', sans-serif;
    font-size: 1rem; font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 24px rgba(0,0,0,0.18);
    transition: transform 0.15s, box-shadow 0.15s;
    white-space: nowrap;
  }
  .send-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.22);
  }
  .send-btn:active { transform: scale(0.97); }

  .ecg-row {
    transition: background 0.15s, transform 0.12s;
    cursor: default;
  }
  .ecg-row:hover {
    background: #EEF4FF !important;
    transform: translateX(4px);
  }

  .stat-card {
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(21,101,192,0.13) !important;
  }
`;

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Patient() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [ecgHistorique, setEcgHistorique] = useState<ECGItem[]>([]);
  const [stats, setStats] = useState<ECGStats>({
    total: 0,
    analysed: 0,
    pending: 0,
    urgent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const heure = new Date().getHours();
  const salut =
    heure < 12 ? "Bonjour" : heure < 18 ? "Bon après-midi" : "Bonsoir";

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        setError("");

        const [profileData, ecgData, statsData] = await Promise.all([
          getPatientProfile(),
          getPatientECGs(),
          getPatientECGStats(),
        ]);

        setProfile(profileData);
        setEcgHistorique(ecgData);
        setStats(statsData);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.response?.data?.message ||
            "Erreur lors du chargement des données patient"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, []);

  const nameParts = useMemo(() => {
    const fullName = profile?.fullName || "";
    const parts = fullName.trim().split(" ");
    return {
      prenom: parts[0] || "",
      nom: parts.slice(1).join(" ") || "",
    };
  }, [profile]);

  const initiales = `${nameParts.prenom?.[0] ?? ""}${nameParts.nom?.[0] ?? ""}`;

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#EEF4FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Chargement...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#EEF4FF",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{CSS}</style>

      <nav
        style={{
          background: "#fff",
          borderBottom: "1px solid #E2EEFF",
          padding: "0 2.5rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 1px 10px rgba(21,101,192,0.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #1565C0, #1E88E5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
              fontSize: "1.1rem",
              color: "#0D47A1",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            CardioWave
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => {
              logout();
              navigate("/connexion");
            }}
            style={{
              background: "none",
              border: "1.5px solid #E2EEFF",
              borderRadius: "8px",
              padding: "7px 16px",
              color: "#5C85C5",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Déconnexion
          </button>
          <div
            onClick={() => navigate("/patient/profil")}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1565C0, #42A5F5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            {initiales}
          </div>
        </div>
      </nav>

      <div style={{ padding: "1.75rem 2.5rem" }}>
        {error && (
          <div
            style={{
              marginBottom: "1rem",
              background: "#FFF0F0",
              border: "1px solid #FFCDD2",
              color: "#C62828",
              padding: "12px 14px",
              borderRadius: "12px",
            }}
          >
            {error}
          </div>
        )}

        <div
          className="cw-fade cw-fade-1"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 200px",
            gap: "1.25rem",
            marginBottom: "1.25rem",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, #0A2F6E 0%, #1565C0 50%, #1E88E5 100%)",
              borderRadius: "20px",
              padding: "1.75rem 2rem",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 8px 28px rgba(13,71,161,0.22)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "180px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 220,
                height: 220,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -20,
                right: 120,
                width: 130,
                height: 130,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "20px",
                  padding: "4px 12px",
                  marginBottom: "14px",
                }}
              >
                <div
                  className="live-dot"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#69F0AE",
                  }}
                />
                <span
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  Espace patient actif
                </span>
              </div>

              <h1
                style={{
                  margin: 0,
                  color: "#fff",
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "1.9rem",
                  fontWeight: 800,
                  lineHeight: 1.2,
                }}
              >
                {salut}, {nameParts.prenom || "Patient"} 👋
              </h1>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "rgba(255,255,255,0.70)",
                  fontSize: "0.88rem",
                }}
              >
                Bienvenue sur votre espace CardioWave
              </p>
            </div>

            <div style={{ position: "absolute", bottom: 0, right: 0, zIndex: 1 }}>
              <svg width="260" height="80" viewBox="0 0 260 80" fill="none">
                <path
                  className="ecg-path"
                  d="M0 55 L40 55 L55 55 L68 10 L80 72 L92 30 L104 55 L140 55 L155 55 L168 12 L180 68 L192 35 L204 55 L260 55"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>

            <div style={{ position: "relative", zIndex: 1, marginTop: "1.5rem" }}>
              <button
                className="send-btn"
                onClick={() => navigate("/patient/rechercher-medecin")}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 12h-4l-3 9L9 3l-3 9H2"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Envoyer un ECG à un médecin
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              {
                label: "ECG envoyés",
                value: stats.total,
                sub: "transmissions",
                color: "#0D47A1",
              },
              {
                label: "Analysés",
                value: stats.analysed,
                sub: "résultats reçus",
                color: "#2E7D32",
              },
              {
                label: "En attente",
                value: stats.pending,
                sub: "en cours",
                color: "#F57F17",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="stat-card"
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "1rem 1.25rem",
                  boxShadow: "0 2px 10px rgba(21,101,192,0.07)",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  borderLeft: `4px solid ${s.color}`,
                }}
              >
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#90A4AE",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "6px",
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: s.color,
                    fontFamily: "'Outfit', sans-serif",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#B0BEC5",
                    marginTop: "3px",
                  }}
                >
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="cw-fade cw-fade-3"
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "1.5rem 1.75rem",
            boxShadow: "0 2px 16px rgba(21,101,192,0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#0D47A1",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Historique ECG
              </h2>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: "0.8rem",
                  color: "#90A4AE",
                }}
              >
                {stats.total} transmissions au total
              </p>
            </div>
            <span
              style={{
                background: "#EEF4FF",
                borderRadius: "10px",
                padding: "6px 14px",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#1565C0",
              }}
            >
              {new Date().getFullYear()}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {ecgHistorique.length === 0 ? (
              <div
                style={{
                  padding: "18px",
                  borderRadius: "14px",
                  background: "#FAFCFF",
                  border: "1px solid #E8F0FE",
                  color: "#90A4AE",
                  fontSize: "0.9rem",
                }}
              >
                Aucun ECG envoyé pour le moment.
              </div>
            ) : (
              ecgHistorique.map((ecg) => (
                <div
                  key={ecg._id}
                  className="ecg-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 16px",
                    borderRadius: "14px",
                    background: "#FAFCFF",
                    border: "1px solid #E8F0FE",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "12px",
                      flexShrink: 0,
                      background:
                        ecg.urgency === "urgente" ? "#FFF0F0" : "#EEF4FF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1.5px solid ${
                        ecg.urgency === "urgente" ? "#FFCDD2" : "#DBEAFE"
                      }`,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22 12h-4l-3 9L9 3l-3 9H2"
                        stroke={
                          ecg.urgency === "urgente" ? "#E53935" : "#1565C0"
                        }
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#0D47A1",
                        fontSize: "0.92rem",
                      }}
                    >
                      {ecg.doctor?.fullName || "Médecin non assigné"}
                    </div>
                    <div
                      style={{
                        color: "#90A4AE",
                        fontSize: "0.78rem",
                        marginTop: "2px",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="#90A4AE"
                          strokeWidth="2"
                        />
                        <path
                          d="M12 7v5l3 3"
                          stroke="#90A4AE"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      {formatDate(ecg.createdAt)} ·{" "}
                      {ecg.doctor?.specialty || "Spécialité non renseignée"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexShrink: 0,
                    }}
                  >
                    {ecg.urgency === "urgente" && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          padding: "3px 9px",
                          borderRadius: "20px",
                          fontWeight: 700,
                          background: "#FFEBEE",
                          color: "#C62828",
                        }}
                      >
                        ⚡ Urgent
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "0.78rem",
                        padding: "4px 14px",
                        borderRadius: "20px",
                        fontWeight: 700,
                        background:
                          ecg.status === "Analysé" ? "#E8F5E9" : "#FFFDE7",
                        color:
                          ecg.status === "Analysé" ? "#2E7D32" : "#F57F17",
                      }}
                    >
                      {ecg.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}