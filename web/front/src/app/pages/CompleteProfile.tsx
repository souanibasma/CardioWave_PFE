import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PRIMARY = "#2920A7";
const PRIMARY_DARK = "#1C1578";
const PRIMARY_LIGHT = "#F2F1FF";
const TEXT = "#11142D";
const MUTED = "#8A8EA6";

const SPECIALTIES = [
  "Cardiologie",
  "Électrophysiologie",
  "Médecine interne",
  "Médecine générale",
  "Pédiatrie",
  "Anesthésiologie",
  "Radiologie",
  "Chirurgie cardiaque",
  "Réanimation",
  "Autre",
];

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [hospitalOrClinic, setHospitalOrClinic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialty || !licenseNumber || !hospitalOrClinic) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const savedUserStr = localStorage.getItem("user");
      if (!savedUserStr) {
        navigate("/connexion");
        return;
      }
      const savedUser = JSON.parse(savedUserStr);
      const userId = savedUser.id || savedUser._id;

      const { completeDoctorProfile } = await import("../../services/api");
      const res = await completeDoctorProfile({
        userId,
        specialty,
        licenseNumber,
        hospitalOrClinic,
      });

      if (res.requiresApproval) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        const mappedPending = {
          ...res.user,
          id: res.user._id || res.user.id,
          role: res.user.role === "doctor" ? "medecin" : "patient",
        };
        localStorage.setItem("pendingUser", JSON.stringify(mappedPending));
        navigate("/attente-validation");
      } else {
        const mappedUser = {
          ...res.user,
          id: res.user._id || res.user.id,
          role: res.user.role === "doctor" ? "medecin" : "patient",
        };
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(mappedUser));
        window.location.href = "/tableau-de-bord";
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur lors de la mise à jour du profil."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (fieldName: string): React.CSSProperties => ({
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: `2px solid ${focusedField === fieldName ? PRIMARY : "#E8E7F8"}`,
    background: focusedField === fieldName ? "#FAFAFF" : "#F8F8FE",
    fontSize: "0.95rem",
    color: TEXT,
    outline: "none",
    transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
    boxShadow:
      focusedField === fieldName
        ? `0 0 0 4px rgba(41,32,167,0.10)`
        : "none",
    fontFamily: "Inter, ui-sans-serif, sans-serif",
    boxSizing: "border-box" as const,
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.82rem",
    fontWeight: 600,
    color: MUTED,
    marginBottom: 6,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, #F2F1FF 0%, #ECEBFF 34%, #F8F9FF 68%, #FFFFFF 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* NAV */}
      <nav
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(41,32,167,0.08)",
          padding: "0 2rem",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${PRIMARY} 0%, #4A3FD4 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(41,32,167,0.30)",
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
              fontWeight: 800,
              fontSize: "1.1rem",
              color: PRIMARY,
              letterSpacing: "-0.02em",
            }}
          >
            CardioWave
          </span>
        </div>
        <span
          style={{
            fontSize: "0.85rem",
            color: MUTED,
            background: PRIMARY_LIGHT,
            padding: "6px 14px",
            borderRadius: 20,
            fontWeight: 500,
          }}
        >
          Inscription médecin
        </span>
      </nav>

      {/* MAIN */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
          }}
        >
          {/* HEADER */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            {/* Icône animée */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${PRIMARY} 0%, #4A3FD4 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
                boxShadow: "0 12px 36px rgba(41,32,167,0.30)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="7"
                  r="4"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: TEXT,
                margin: "0 0 0.4rem",
                letterSpacing: "-0.03em",
              }}
            >
              Complétez votre profil
            </h1>
            <p style={{ color: MUTED, fontSize: "0.95rem", margin: 0 }}>
              Ces informations sont requises pour activer votre accès médecin.
            </p>
          </div>

          {/* PROGRESS STEPS */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: "1.75rem",
            }}
          >
            {["Compte créé", "Profil", "Validation"].map((step, i) => (
              <div
                key={step}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: i === 0 ? "#0F8A5F" : i === 1 ? PRIMARY : "#E8E7F8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: i <= 1 ? "#fff" : MUTED,
                      flexShrink: 0,
                    }}
                  >
                    {i === 0 ? "✓" : i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: i === 1 ? 700 : 500,
                      color: i === 1 ? PRIMARY : i === 0 ? "#0F8A5F" : MUTED,
                    }}
                  >
                    {step}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    style={{
                      width: 28,
                      height: 2,
                      background: i === 0 ? "#0F8A5F" : "#E8E7F8",
                      borderRadius: 2,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* FORM CARD */}
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              borderRadius: 24,
              padding: "2rem",
              boxShadow:
                "0 40px 110px rgba(41,32,167,0.12), 0 4px 24px rgba(41,32,167,0.06)",
              border: "1px solid rgba(41,32,167,0.06)",
            }}
          >
            {error && (
              <div
                style={{
                  marginBottom: "1.25rem",
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "#FFF0F3",
                  border: "1.5px solid #FFCDD6",
                  color: "#C0143C",
                  fontSize: "0.88rem",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: "1rem" }}>⚠️</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Spécialité */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label htmlFor="specialty" style={labelStyle}>
                  Spécialité médicale
                </label>
                <select
                  id="specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  onFocus={() => setFocusedField("specialty")}
                  onBlur={() => setFocusedField(null)}
                  required
                  style={{
                    ...inputStyle("specialty"),
                    appearance: "none" as const,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238A8EA6' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 14px center",
                    paddingRight: 40,
                    cursor: "pointer",
                    color: specialty ? TEXT : MUTED,
                  }}
                >
                  <option value="" disabled>
                    Sélectionner une spécialité...
                  </option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Numéro de licence */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label htmlFor="licenseNumber" style={labelStyle}>
                  Numéro RPPS / Ordre
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: focusedField === "licenseNumber" ? PRIMARY : MUTED,
                      transition: "color 0.2s",
                      pointerEvents: "none",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect
                        x="2"
                        y="3"
                        width="20"
                        height="18"
                        rx="3"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M8 10h8M8 14h5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <input
                    id="licenseNumber"
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    onFocus={() => setFocusedField("licenseNumber")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Ex: 10012345678"
                    required
                    style={{ ...inputStyle("licenseNumber"), paddingLeft: 40 }}
                  />
                </div>
              </div>

              {/* Hôpital / Clinique */}
              <div style={{ marginBottom: "1.75rem" }}>
                <label htmlFor="hospitalOrClinic" style={labelStyle}>
                  Établissement de santé
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color:
                        focusedField === "hospitalOrClinic" ? PRIMARY : MUTED,
                      transition: "color 0.2s",
                      pointerEvents: "none",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 21h18M3 7l9-4 9 4M5 7v14M19 7v14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 21v-4h6v4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <input
                    id="hospitalOrClinic"
                    type="text"
                    value={hospitalOrClinic}
                    onChange={(e) => setHospitalOrClinic(e.target.value)}
                    onFocus={() => setFocusedField("hospitalOrClinic")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Nom de l'hôpital ou de la clinique"
                    required
                    style={{
                      ...inputStyle("hospitalOrClinic"),
                      paddingLeft: 40,
                    }}
                  />
                </div>
              </div>

              {/* Bouton submit */}
              <button
                type="submit"
                disabled={loading || !specialty || !licenseNumber || !hospitalOrClinic}
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: 14,
                  border: "none",
                  background:
                    loading || !specialty || !licenseNumber || !hospitalOrClinic
                      ? "#CFD0E8"
                      : `linear-gradient(135deg, ${PRIMARY} 0%, #4A3FD4 100%)`,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor:
                    loading || !specialty || !licenseNumber || !hospitalOrClinic
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "all 0.2s",
                  boxShadow:
                    loading || !specialty || !licenseNumber || !hospitalOrClinic
                      ? "none"
                      : "0 8px 24px rgba(41,32,167,0.35)",
                  letterSpacing: "-0.01em",
                  fontFamily: "inherit",
                }}
              >
                {loading ? (
                  <>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{
                        animation: "spin 1s linear infinite",
                      }}
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="3"
                      />
                      <path
                        d="M22 12a10 10 0 00-10-10"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="#fff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Finaliser mon inscription
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Note sécurité */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: "1.25rem",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                stroke={MUTED}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: "0.78rem", color: MUTED }}>
              Vos données sont chiffrées et sécurisées selon les normes HDS
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
