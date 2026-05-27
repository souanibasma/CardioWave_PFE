import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getPatientProfile,
  getPatientECGs,
  getPatientECGStats,
} from "../../services/api";
import {
  Activity,
  LogOut,
  User,
  Clock,
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  Send,
} from "lucide-react";

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

const PRIMARY = "#2920A7";
const PRIMARY_LIGHT = "#F2F1FF";
const TEXT = "#11142D";
const MUTED = "#8A8EA6";
const DANGER = "#D3214C";
const SUCCESS = "#0F8A5F";
const AMBER = "#B77900";

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
  const salut = heure < 12 ? "Bonjour" : heure < 18 ? "Bon après-midi" : "Bonsoir";

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
          padding: 32,
          background:
            "radial-gradient(circle at top left, #F2F1FF 0, #ECEBFF 34%, #F8F9FF 68%, #FFFFFF 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: PRIMARY,
          fontWeight: 900,
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
        background:
          "radial-gradient(circle at top left, #F2F1FF 0, #ECEBFF 34%, #F8F9FF 68%, #FFFFFF 100%)",
        padding: 32,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: TEXT,
      }}
    >
      <div
        style={{
          maxWidth: 1220,
          margin: "0 auto",
          background: "rgba(255,255,255,0.92)",
          borderRadius: 34,
          boxShadow: "0 40px 110px rgba(41,32,167,0.16)",
          padding: 28,
        }}
      >
        {/* TOP BAR */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 24,
            padding: "16px 22px",
            marginBottom: 24,
            boxShadow: "0 14px 40px rgba(34,28,112,0.07)",
            border: "1px solid #F0F0FA",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img src="/logo.png" alt="Logo" style={{ width: 44, height: 44, objectFit: "contain" }} />
            </div>

            <div>
              <p style={{ margin: 0, color: TEXT, fontSize: 17, fontWeight: 950 }}>
                CardioWave
              </p>
              <p style={{ margin: "3px 0 0", color: MUTED, fontSize: 12, fontWeight: 700 }}>
                Espace patient
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => {
                logout();
                navigate("/connexion");
              }}
              style={{
                height: 42,
                border: "1px solid #ECECFA",
                background: "#FFFFFF",
                color: MUTED,
                borderRadius: 16,
                padding: "0 18px",
                fontSize: 13,
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <LogOut size={16} />
              Déconnexion
            </button>

            <div
              onClick={() => navigate("/patient/profil")}
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                background: "linear-gradient(135deg, #2920A7 0%, #7C73D6 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              {initiales || <User size={20} />}
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 20,
              background: "#FFF0F3",
              color: DANGER,
              borderRadius: 18,
              padding: 16,
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        )}

        {/* HERO + STATS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 260px",
            gap: 22,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              background:
                "linear-gradient(135deg, #4F46E5 0%, #5B4FE9 30%, #6C63FF 65%, #7A74FF 100%)",
              borderRadius: 26,
              padding: "28px 34px",
              color: "white",
              minHeight: 210,
              boxShadow: "0 24px 60px rgba(91,79,233,0.28)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -120,
                right: -80,
                width: 260,
                height: 260,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.10)",
                filter: "blur(4px)",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                height: "100%",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.14)",
                    color: "rgba(255,255,255,0.92)",
                    fontSize: 12,
                    fontWeight: 900,
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#69F0AE",
                    }}
                  />
                  Espace patient actif
                </div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: 34,
                    fontWeight: 950,
                    lineHeight: 1.1,
                  }}
                >
                  {salut}, {nameParts.prenom || "Patient"}
                </h1>

                <p
                  style={{
                    margin: "12px 0 0",
                    maxWidth: 560,
                    color: "rgba(255,255,255,0.82)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    fontWeight: 650,
                  }}
                >
                  Suivez vos ECG envoyés, consultez les résultats reçus et transmettez
                  rapidement un nouveau tracé à votre médecin.
                </p>

                <button
                  onClick={() => navigate("/patient/rechercher-medecin")}
                  style={{
                    marginTop: 22,
                    height: 56,
                    border: "none",
                    borderRadius: 20,
                    background: "#FFFFFF",
                    color: PRIMARY,
                    padding: "0 28px",
                    fontSize: 14,
                    fontWeight: 950,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    boxShadow: "0 16px 35px rgba(0,0,0,0.18)",
                  }}
                >
                  <Send size={18} />
                  Envoyer un ECG
                </button>
              </div>

              <img
                src="/coeur_blanc.png"
                alt="ECG"
                style={{
                  width: 210,
                  height: 210,
                  objectFit: "contain",
                  marginRight: -8,
                  marginTop: -24,
                  marginBottom: -24,
                  filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.18))",
                  flexShrink: 0,
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {[
              {
                label: "ECG envoyés",
                value: stats.total,
                bg: PRIMARY_LIGHT,
                color: PRIMARY,
                icon: <HeartPulse size={21} />,
              },
              {
                label: "Analysés",
                value: stats.analysed,
                bg: "#E9F9F2",
                color: SUCCESS,
                icon: <CheckCircle2 size={21} />,
              },
              {
                label: "En attente",
                value: stats.pending,
                bg: "#FFF7E6",
                color: AMBER,
                icon: <Clock size={21} />,
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: s.bg,
                  borderRadius: 22,
                  padding: 16,
                  minHeight: 88,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  border: "1px solid rgba(226,226,243,0.8)",
                  boxShadow: "0 14px 34px rgba(34,28,112,0.07)",
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.68)",
                    color: s.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {s.icon}
                </div>

                <div>
                  <p style={{ margin: 0, color: s.color, fontSize: 13, fontWeight: 900 }}>
                    {s.label}
                  </p>
                  <p
                    style={{
                      margin: "5px 0 0",
                      color: s.color,
                      fontSize: 28,
                      fontWeight: 950,
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* HISTORY */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 26,
            padding: 24,
            boxShadow: "0 18px 45px rgba(34,28,112,0.08)",
            border: "1px solid #EEEEFA",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div>
              <h2 style={{ margin: 0, color: TEXT, fontSize: 22, fontWeight: 950 }}>
                Historique ECG
              </h2>
              <p style={{ margin: "5px 0 0", color: MUTED, fontSize: 13, fontWeight: 700 }}>
                {stats.total} transmissions au total
              </p>
            </div>

            <span
              style={{
                background: PRIMARY_LIGHT,
                color: PRIMARY,
                borderRadius: 999,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 950,
              }}
            >
              {new Date().getFullYear()}
            </span>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {ecgHistorique.length === 0 ? (
              <div
                style={{
                  padding: 26,
                  borderRadius: 20,
                  background: "#FAFAFF",
                  color: MUTED,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                Aucun ECG envoyé pour le moment.
              </div>
            ) : (
              ecgHistorique.map((ecg) => (
                <div
                  key={ecg._id}
                  style={{
                    background: "#FAFAFF",
                    border: "1px solid #F1F1FA",
                    borderRadius: 20,
                    padding: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 18,
                      background: ecg.urgency === "urgente" ? "#FFF0F3" : PRIMARY_LIGHT,
                      color: ecg.urgency === "urgente" ? DANGER : PRIMARY,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {ecg.urgency === "urgente" ? (
                      <AlertTriangle size={22} />
                    ) : (
                      <Activity size={22} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: TEXT, fontSize: 14, fontWeight: 950 }}>
                      {ecg.doctor?.fullName || "Médecin non assigné"}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: MUTED,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {formatDate(ecg.createdAt)} ·{" "}
                      {ecg.doctor?.specialty || "Spécialité non renseignée"}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {ecg.urgency === "urgente" && (
                      <span
                        style={{
                          background: "#FFF0F3",
                          color: DANGER,
                          borderRadius: 999,
                          padding: "6px 11px",
                          fontSize: 11,
                          fontWeight: 950,
                        }}
                      >
                        Urgent
                      </span>
                    )}

                    <span
                      style={{
                        background: ecg.status === "Analysé" ? "#E9F9F2" : "#FFF7E6",
                        color: ecg.status === "Analysé" ? SUCCESS : AMBER,
                        borderRadius: 999,
                        padding: "6px 13px",
                        fontSize: 12,
                        fontWeight: 950,
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