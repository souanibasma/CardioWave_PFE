import { useEffect, useMemo, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { getApprovedDoctors } from "../../services/api";

interface Medecin {
  _id: string;
  fullName: string;
  email: string;
  specialty?: string;
  hospitalOrClinic?: string;
}

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
        setError(
          err?.response?.data?.message ||
            "Erreur lors du chargement des médecins"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const filtered = useMemo(() => {
    return doctors.filter((m) => {
      const fullName = (m.fullName || "").toLowerCase();
      const specialty = (m.specialty || "").toLowerCase();
      const keyword = search.toLowerCase();

      return (
        fullName.includes(keyword) ||
        specialty.includes(keyword)
      );
    });
  }, [doctors, search]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F0F6FF",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <nav
        style={{
          background: "#fff",
          borderBottom: "1px solid #E2EEFF",
          padding: "0 2rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)",
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
            }}
          >
            CardioWave
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => navigate("/patient/dashboard")}
            style={{
              background: "none",
              border: "none",
              color: "#1565C0",
              fontWeight: 500,
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            ← Tableau de bord
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "1.8rem",
              fontWeight: 700,
              color: "#0D47A1",
              margin: 0,
            }}
          >
            Trouver un médecin
          </h1>
          <p
            style={{
              color: "#5C85C5",
              marginTop: "6px",
              fontSize: "0.95rem",
            }}
          >
            Recherchez un cardiologue et envoyez-lui votre ECG directement.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "1.25rem 1.5rem",
            boxShadow: "0 2px 16px rgba(21,101,192,0.08)",
            marginBottom: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <div style={{ flex: "1 1 200px", position: "relative" }}>
            <svg
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="11" cy="11" r="8" stroke="#90A4AE" strokeWidth="2" />
              <path
                d="M21 21l-4.35-4.35"
                stroke="#90A4AE"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, spécialité..."
              style={{
                width: "100%",
                paddingLeft: "36px",
                paddingRight: "12px",
                height: "40px",
                borderRadius: "10px",
                border: "1.5px solid #E2EEFF",
                fontSize: "0.9rem",
                color: "#1A237E",
                outline: "none",
                boxSizing: "border-box",
                background: "#F8FBFF",
              }}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "1rem",
              textAlign: "center",
              color: "#C62828",
              padding: "1rem",
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid #FFCDD2",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "#90A4AE",
              padding: "3rem",
              background: "#fff",
              borderRadius: "16px",
            }}
          >
            Chargement des médecins...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filtered.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "#90A4AE",
                  padding: "3rem",
                  background: "#fff",
                  borderRadius: "16px",
                }}
              >
                Aucun médecin trouvé.
              </div>
            )}

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
                    background: "#fff",
                    borderRadius: "16px",
                    padding: "1.25rem 1.5rem",
                    boxShadow: "0 2px 12px rgba(21,101,192,0.07)",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                    transition: "box-shadow 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #1565C0, #42A5F5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      flexShrink: 0,
                    }}
                  >
                    {initials || "DR"}
                  </div>

                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#0D47A1",
                        fontSize: "1rem",
                      }}
                    >
                      {m.fullName}
                    </div>
                    <div
                      style={{
                        color: "#5C85C5",
                        fontSize: "0.85rem",
                        marginTop: "2px",
                      }}
                    >
                      {m.specialty || "Spécialité non renseignée"} ·{" "}
                      {m.hospitalOrClinic || "Établissement non renseigné"}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginTop: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "#90A4AE",
                        }}
                      >
                        {m.email}
                      </span>

                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 10px",
                          borderRadius: "20px",
                          background: "#E8F5E9",
                          color: "#2E7D32",
                          fontWeight: 600,
                        }}
                      >
                        Disponible
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      navigate(`/patient/envoyer-ecg/${m._id}`, {
                        state: { medecin: m },
                      })
                    }
                    style={{
                      background:
                        "linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "10px 20px",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22 12h-4l-3 9L9 3l-3 9H2"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
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