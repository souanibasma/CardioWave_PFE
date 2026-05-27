import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApprovedDoctors } from "../../services/api";
import {
  Activity,
  Search,
  ArrowLeft,
  Mail,
  Building2,
  Stethoscope,
  Send,
  User,
} from "lucide-react";

interface Medecin {
  _id: string;
  fullName: string;
  email: string;
  specialty?: string;
  hospitalOrClinic?: string;
}

const PRIMARY = "#2920A7";
const PRIMARY_LIGHT = "#F2F1FF";
const TEXT = "#11142D";
const MUTED = "#8A8EA6";
const SUCCESS = "#0F8A5F";
const DANGER = "#D3214C";

export default function RechercherMedecin() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [doctors, setDoctors] = useState<Medecin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getApprovedDoctors();
        setDoctors(data);
      } catch (err: any) {
        console.error(err);
        setError(err?.response?.data?.message || "Erreur lors du chargement des médecins");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const filtered = useMemo(() => {
    return doctors.filter((m) => {
      const keyword = search.toLowerCase();
      return (
        (m.fullName || "").toLowerCase().includes(keyword) ||
        (m.specialty || "").toLowerCase().includes(keyword)
      );
    });
  }, [doctors, search]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 32,
        background:
          "radial-gradient(circle at top left, #F2F1FF 0, #ECEBFF 34%, #F8F9FF 68%, #FFFFFF 100%)",
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
       
          
          <button
            onClick={() => navigate("/patient/dashboard")}
            style={{
              height: 42,
              border: "1px solid #ECECFA",
              background: "#FFFFFF",
              color: PRIMARY,
              borderRadius: 16,
              padding: "0 18px",
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom:10,
              marginLeft:1000
            }}
          >
            <ArrowLeft size={16} />
            Tableau de bord
          </button>
   

        {/* HERO */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #4F46E5 0%, #5B4FE9 30%, #6C63FF 65%, #7A74FF 100%)",
            borderRadius: 26,
            padding: "28px 34px",
            color: "white",
            marginBottom: 24,
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
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 950 }}>
                Trouver un médecin
              </h1>

              <p
                style={{
                  margin: "12px 0 0",
                  maxWidth: 580,
                  color: "rgba(255,255,255,0.82)",
                  fontSize: 14,
                  lineHeight: 1.7,
                  fontWeight: 650,
                }}
              >
                Recherchez un cardiologue disponible et envoyez-lui votre ECG directement depuis
                votre espace patient.
              </p>
            </div>

            <img
              src="/coeur_blanc.png"
              alt="Médecin"
              style={{
                width: 190,
                height: 190,
                objectFit: "contain",
                marginRight: -10,
                marginTop: -28,
                marginBottom: -28,
                filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.18))",
                flexShrink: 0,
              }}
            />
          </div>
        </div>

        {/* SEARCH */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 26,
            padding: 18,
            marginBottom: 24,
            boxShadow: "0 18px 45px rgba(34,28,112,0.08)",
            border: "1px solid #EEEEFA",
          }}
        >
          <div
            style={{
              height: 60,
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "#F6F5FF",
              borderRadius: 20,
              padding: "0 22px",
              border: "1px solid #ECEBFF",
            }}
          >
            <Search size={21} color={PRIMARY} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou spécialité..."
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                color: "#555B75",
                fontSize: 15,
                fontWeight: 750,
              }}
            />
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
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* CONTENT */}
        {loading ? (
          <div
            style={{
              height: 260,
              background: "#FFFFFF",
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: PRIMARY,
              fontWeight: 900,
              boxShadow: "0 16px 42px rgba(34,28,112,0.07)",
            }}
          >
            Chargement des médecins...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 24,
              padding: 56,
              textAlign: "center",
              boxShadow: "0 16px 42px rgba(34,28,112,0.07)",
            }}
          >
            <User size={42} color={PRIMARY} style={{ margin: "0 auto 12px" }} />
            <h2 style={{ margin: 0, color: TEXT, fontSize: 20, fontWeight: 950 }}>
              Aucun médecin trouvé
            </h2>
            <p style={{ margin: "8px 0 0", color: MUTED, fontWeight: 650 }}>
              Essayez une autre recherche.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filtered.map((m) => {
              const initials = m.fullName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0]?.toUpperCase())
                .join("");

              return (
                <div
                  key={m._id}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 24,
                    padding: 18,
                    border: "1px solid #F1F1FA",
                    boxShadow: "0 10px 28px rgba(34,28,112,0.05)",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 20,
                      background: PRIMARY_LIGHT,
                      color: PRIMARY,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 950,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {initials || "DR"}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, color: TEXT, fontSize: 16, fontWeight: 950 }}>
                      {m.fullName}
                    </h3>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                        color: MUTED,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Stethoscope size={14} />
                        {m.specialty || "Spécialité non renseignée"}
                      </span>

                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Building2 size={14} />
                        {m.hospitalOrClinic || "Établissement non renseigné"}
                      </span>

                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Mail size={14} />
                        {m.email}
                      </span>
                    </div>

                    <span
                      style={{
                        marginTop: 10,
                        display: "inline-flex",
                        background: "#E9F9F2",
                        color: SUCCESS,
                        borderRadius: 999,
                        padding: "5px 11px",
                        fontSize: 11,
                        fontWeight: 950,
                      }}
                    >
                      Disponible
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      navigate(`/patient/envoyer-ecg/${m._id}`, {
                        state: { medecin: m },
                      })
                    }
                    style={{
                      height: 50,
                      border: "none",
                      borderRadius: 18,
                      background: PRIMARY,
                      color: "#fff",
                      padding: "0 24px",
                      fontWeight: 950,
                      fontSize: 14,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      boxShadow: "0 14px 30px rgba(41,32,167,0.22)",
                    }}
                  >
                    <Send size={17} />
                    Envoyer ECG
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}