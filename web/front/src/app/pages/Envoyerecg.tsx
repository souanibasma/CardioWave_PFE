import { useState, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { assignDoctorToPatient, createPatientECG } from "../../services/api";

interface Medecin {
  _id: string;
  fullName: string;
  email: string;
  specialty?: string;
  hospitalOrClinic?: string;
}

const PRIMARY = "#2920A7";
const PRIMARY_DARK = "#1C1578";
const PRIMARY_LIGHT = "#F2F1FF";
const TEXT = "#11142D";
const MUTED = "#8A8EA6";
const DANGER = "#D3214C";
const SUCCESS = "#0F8A5F";

function getInitials(name: string): string {
  return (name || "")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "DR";
}

export default function EnvoyerECG() {
  const navigate = useNavigate();
  const location = useLocation();
  const { medecinId } = useParams();

  const medecin: Medecin = location.state?.medecin ?? {
    _id: medecinId || "",
    fullName: "Dr. Médecin",
    email: "",
    specialty: "Cardiologue",
    hospitalOrClinic: "Établissement",
  };

  const [fichierECG, setFichierECG] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [urgence, setUrgence] = useState<"normale" | "urgente">("normale");
  const [submitted, setSubmitted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (file) setFichierECG(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleSubmit = async () => {
    if (!fichierECG || !medecin._id) return;
    try {
      setLoading(true);
      setError("");
      await assignDoctorToPatient(medecin._id);
      await createPatientECG({
        file: fichierECG,
        title: fichierECG.name,
        doctorId: medecin._id,
        urgency: urgence,
        notes: message,
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Erreur lors de l'envoi de l'ECG"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── ÉCRAN SUCCÈS ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left, #F2F1FF 0%, #ECEBFF 34%, #F8F9FF 68%, #FFFFFF 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          padding: "2rem 1rem",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.96)",
            borderRadius: 28,
            padding: "3rem 2.5rem",
            maxWidth: 460,
            width: "100%",
            textAlign: "center",
            boxShadow:
              "0 40px 110px rgba(41,32,167,0.14), 0 4px 24px rgba(41,32,167,0.06)",
            border: "1px solid rgba(41,32,167,0.06)",
          }}
        >
          {/* Icône succès animée */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0F8A5F 0%, #14B87C 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.75rem",
              boxShadow: "0 12px 36px rgba(15,138,95,0.35)",
              animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17l-5-5"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: TEXT,
              margin: "0 0 0.75rem",
              letterSpacing: "-0.03em",
            }}
          >
            ECG transmis avec succès !
          </h2>

          <p
            style={{
              color: MUTED,
              fontSize: "0.95rem",
              lineHeight: 1.65,
              margin: "0 0 0.5rem",
            }}
          >
            Votre ECG a été transmis à{" "}
            <strong style={{ color: PRIMARY }}>{medecin.fullName}</strong>.
          </p>
          <p style={{ color: MUTED, fontSize: "0.9rem", lineHeight: 1.6 }}>
            {medecin.specialty && (
              <>
                {medecin.specialty}
                {medecin.hospitalOrClinic ? ` · ${medecin.hospitalOrClinic}` : ""}
                <br />
              </>
            )}
            Il/Elle vous contactera dès que possible.
          </p>

          {/* Badge urgence */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: "1.25rem",
              padding: "8px 16px",
              borderRadius: 20,
              background: urgence === "urgente" ? "#FFF0F3" : PRIMARY_LIGHT,
              color: urgence === "urgente" ? DANGER : PRIMARY,
              fontSize: "0.82rem",
              fontWeight: 700,
            }}
          >
            {urgence === "urgente" ? "⚡ Priorité urgente" : "✓ Priorité normale"}
          </div>

          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <button
              id="btn-retour-medecin"
              onClick={() => navigate("/patient/rechercher-medecin")}
              style={{
                padding: "11px 22px",
                borderRadius: 12,
                border: `2px solid #E8E7F8`,
                background: "transparent",
                color: PRIMARY,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.9rem",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              Autre médecin
            </button>
            <button
              id="btn-retour-dashboard"
              onClick={() => navigate("/patient/dashboard")}
              style={{
                padding: "11px 22px",
                borderRadius: 12,
                border: "none",
                background: `linear-gradient(135deg, ${PRIMARY} 0%, #4A3FD4 100%)`,
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.9rem",
                fontFamily: "inherit",
                boxShadow: "0 6px 20px rgba(41,32,167,0.30)",
              }}
            >
              Mon tableau de bord
            </button>
          </div>
        </div>

        <style>{`
          @keyframes popIn {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ── FORMULAIRE PRINCIPAL ──────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, #F2F1FF 0%, #ECEBFF 34%, #F8F9FF 68%, #FFFFFF 100%)",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: TEXT,
      }}
    >
      {/* NAVBAR */}
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

        <button
          id="btn-retour-nav"
          onClick={() => navigate(-1)}
          style={{
            background: PRIMARY_LIGHT,
            border: "none",
            color: PRIMARY,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "0.88rem",
            borderRadius: 10,
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "inherit",
            transition: "background 0.15s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M5 12l7 7M5 12l7-7"
              stroke={PRIMARY}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Retour
        </button>
      </nav>

      {/* CONTENU */}
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "2rem 1rem 4rem",
        }}
      >
        {/* EN-TÊTE */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: TEXT,
              margin: "0 0 0.4rem",
              letterSpacing: "-0.03em",
            }}
          >
            Envoyer mon ECG
          </h1>
          <p
            style={{
              color: MUTED,
              marginTop: 4,
              fontSize: "0.92rem",
              margin: 0,
            }}
          >
            Transmission directe à votre médecin — sans rendez-vous préalable.
          </p>
        </div>

        {/* CARTE MÉDECIN */}
        <div
          style={{
            background: `linear-gradient(135deg, ${PRIMARY} 0%, #4A3FD4 55%, #6B5FE4 100%)`,
            borderRadius: 20,
            padding: "1.4rem 1.6rem",
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: "1.5rem",
            color: "#fff",
            boxShadow: "0 12px 40px rgba(41,32,167,0.30)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Décoration background */}
          <div
            style={{
              position: "absolute",
              right: -20,
              top: -20,
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 30,
              bottom: -30,
              width: 70,
              height: 70,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              pointerEvents: "none",
            }}
          />

          {/* Avatar initiales */}
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.20)",
              border: "2px solid rgba(255,255,255,0.30)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.1rem",
              flexShrink: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {getInitials(medecin.fullName)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 3 }}>
              {medecin.fullName}
            </div>
            <div style={{ opacity: 0.85, fontSize: "0.85rem", display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {medecin.specialty && <span>{medecin.specialty}</span>}
              {medecin.specialty && medecin.hospitalOrClinic && (
                <span style={{ opacity: 0.5 }}>·</span>
              )}
              {medecin.hospitalOrClinic && <span>{medecin.hospitalOrClinic}</span>}
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <span
              style={{
                fontSize: "0.78rem",
                padding: "5px 13px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.20)",
                border: "1px solid rgba(255,255,255,0.30)",
                fontWeight: 600,
                whiteSpace: "nowrap" as const,
              }}
            >
              ● Disponible
            </span>
          </div>
        </div>

        {/* FORMULAIRE */}
        <div
          style={{
            background: "rgba(255,255,255,0.96)",
            borderRadius: 24,
            padding: "2rem",
            boxShadow:
              "0 40px 110px rgba(41,32,167,0.10), 0 4px 24px rgba(41,32,167,0.05)",
            border: "1px solid rgba(41,32,167,0.05)",
          }}
        >
          {/* ZONE UPLOAD */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: MUTED,
                marginBottom: 10,
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
              }}
            >
              Fichier ECG *
            </label>

            <div
              id="ecg-drop-zone"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${
                  dragging ? PRIMARY : fichierECG ? "#0F8A5F" : "#D1CEF5"
                }`,
                borderRadius: 16,
                padding: "2.25rem 1.5rem",
                textAlign: "center" as const,
                cursor: "pointer",
                background: dragging
                  ? PRIMARY_LIGHT
                  : fichierECG
                  ? "#F0FFF8"
                  : "#FAFAFE",
                transition: "all 0.2s",
                position: "relative" as const,
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.dcm"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />

              {fichierECG ? (
                <div>
                  {/* Icône ECG succès */}
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #0F8A5F, #14B87C)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                      boxShadow: "0 6px 18px rgba(15,138,95,0.25)",
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22 12h-4l-3 9L9 3l-3 9H2"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p
                    style={{
                      color: SUCCESS,
                      fontWeight: 700,
                      margin: "0 0 4px",
                      fontSize: "0.95rem",
                    }}
                  >
                    {fichierECG.name}
                  </p>
                  <p
                    style={{
                      color: MUTED,
                      fontSize: "0.8rem",
                      marginTop: 4,
                    }}
                  >
                    {(fichierECG.size / 1024).toFixed(1)} KB · Cliquer pour changer
                  </p>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: PRIMARY_LIGHT,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                        stroke={PRIMARY}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p
                    style={{
                      color: PRIMARY,
                      fontWeight: 600,
                      margin: "0 0 4px",
                      fontSize: "0.95rem",
                    }}
                  >
                    {dragging
                      ? "Relâchez pour déposer..."
                      : "Glisser-déposer ou cliquer pour importer"}
                  </p>
                  <p style={{ color: MUTED, fontSize: "0.8rem", marginTop: 6 }}>
                    Formats acceptés : PDF, PNG, JPG, DICOM
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* NIVEAU D'URGENCE */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: MUTED,
                marginBottom: 10,
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
              }}
            >
              Niveau d'urgence
            </label>

            <div style={{ display: "flex", gap: 10 }}>
              {(["normale", "urgente"] as const).map((u) => {
                const isSelected = urgence === u;
                const isUrgent = u === "urgente";
                return (
                  <button
                    key={u}
                    id={`urgence-${u}`}
                    type="button"
                    onClick={() => setUrgence(u)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: 12,
                      border: isSelected
                        ? `2px solid ${isUrgent ? DANGER : PRIMARY}`
                        : "2px solid #E8E7F8",
                      background: isSelected
                        ? isUrgent
                          ? "#FFF0F3"
                          : PRIMARY_LIGHT
                        : "#FAFAFE",
                      color: isSelected
                        ? isUrgent
                          ? DANGER
                          : PRIMARY
                        : MUTED,
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      transition: "all 0.18s",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                    }}
                  >
                    {isUrgent ? (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Urgente
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Normale
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MESSAGE */}
          <div style={{ marginBottom: "1.75rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: MUTED,
                marginBottom: 10,
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
              }}
            >
              Message (optionnel)
            </label>

            <textarea
              id="ecg-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={() => setFocusedField("message")}
              onBlur={() => setFocusedField(null)}
              placeholder="Décrivez vos symptômes, observations ou toute information utile pour le médecin..."
              rows={4}
              style={{
                width: "100%",
                borderRadius: 12,
                border: `2px solid ${focusedField === "message" ? PRIMARY : "#E8E7F8"}`,
                padding: "13px 15px",
                fontSize: "0.9rem",
                color: TEXT,
                resize: "vertical" as const,
                outline: "none",
                background: focusedField === "message" ? "#FAFAFF" : "#F8F8FE",
                boxSizing: "border-box" as const,
                fontFamily: "inherit",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxShadow:
                  focusedField === "message"
                    ? `0 0 0 4px rgba(41,32,167,0.10)`
                    : "none",
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* ERREUR */}
          {error && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "12px 15px",
                borderRadius: 12,
                background: "#FFF0F3",
                border: "1.5px solid #FFCDD6",
                color: DANGER,
                fontSize: "0.88rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
              {error}
            </div>
          )}

          {/* BOUTON ENVOYER */}
          <button
            id="btn-envoyer-ecg"
            onClick={handleSubmit}
            disabled={!fichierECG || loading}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: 14,
              border: "none",
              background:
                fichierECG && !loading
                  ? `linear-gradient(135deg, ${PRIMARY} 0%, #4A3FD4 100%)`
                  : "#CFD0E8",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: fichierECG && !loading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "all 0.2s",
              boxShadow:
                fichierECG && !loading
                  ? "0 8px 24px rgba(41,32,167,0.35)"
                  : "none",
              fontFamily: "inherit",
              letterSpacing: "-0.01em",
            }}
          >
            {loading ? (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ animation: "spin 1s linear infinite" }}
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
                    d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Envoyer l'ECG à {medecin.fullName.split(" ")[0]}
              </>
            )}
          </button>

          {!fichierECG && (
            <p
              style={{
                textAlign: "center" as const,
                marginTop: 10,
                fontSize: "0.8rem",
                color: MUTED,
              }}
            >
              Sélectionnez d'abord un fichier ECG pour continuer
            </p>
          )}
        </div>

        {/* Info sécurité */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: "1.25rem",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke={MUTED}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: "0.78rem", color: MUTED }}>
            Transmission chiffrée et sécurisée — données médicales protégées HDS
          </span>
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